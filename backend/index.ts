import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../frontend/.env.local') });

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE_URL/SUPABASE_ANON_KEY environment variables');
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

type SocketAck = {
    ok: boolean;
    error?: string;
};

type DirectMessage = {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
};

type GroupMessage = {
    id: string;
    sender_id: string;
    group_id: string;
    content: string;
    created_at: string;
    profiles?: { full_name: string; avatar_url: string };
};

type AuthedSocketData = {
    user: User;
    accessToken: string;
    supabase: SupabaseClient;
};

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUuid = (value: unknown): value is string =>
    typeof value === 'string' && UUID_PATTERN.test(value);

const getAuthenticatedSocket = (socket: Socket) => socket as Socket & { data: AuthedSocketData };

const getRoomId = (userId: string, contactId: string) => [userId, contactId].sort().join('_');

const getBearerToken = (socket: Socket) => {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
        return authToken.trim();
    }

    const authorization = socket.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
        return authorization.slice('Bearer '.length).trim();
    }

    return null;
};

const createUserScopedClient = (accessToken: string) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

/* ─────────────── Rate Limiter ─────────────── */

class RateLimiter {
    private map = new Map<string, { count: number; resetAt: number }>();

    check(key: string, limit: number, windowMs: number): boolean {
        const now = Date.now();
        const entry = this.map.get(key);
        if (!entry || now > entry.resetAt) {
            this.map.set(key, { count: 1, resetAt: now + windowMs });
            return true;
        }
        if (entry.count >= limit) {
            return false;
        }
        entry.count++;
        return true;
    }

    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.map.entries()) {
            if (now > entry.resetAt) {
                this.map.delete(key);
            }
        }
    }
}

const messageRateLimiter = new RateLimiter();

/* ─────────────── Helpers ─────────────── */

const isAcceptedFriend = async (client: SupabaseClient, userId: string, contactId: string) => {
    if (!isValidUuid(userId) || !isValidUuid(contactId) || userId === contactId) return false;

    const { data, error } = await client
        .from('friendships')
        .select('id')
        .eq('status', 'Accepted')
        .or(
            `and(requester_id.eq.${userId},addressee_id.eq.${contactId}),and(requester_id.eq.${contactId},addressee_id.eq.${userId})`,
        )
        .limit(1)
        .maybeSingle();

    if (error) {
        return false;
    }

    return Boolean(data);
};

const isGroupMember = async (client: SupabaseClient, userId: string, groupId: string) => {
    if (!isValidUuid(userId) || !isValidUuid(groupId)) return false;

    const { data, error } = await client
        .from('group_participants')
        .select('group_id')
        .eq('group_id', groupId)
        .eq('profile_id', userId)
        .maybeSingle();

    if (error) {
        return false;
    }

    return Boolean(data);
};

const findPersistedDirectMessage = async (
    client: SupabaseClient,
    message: DirectMessage,
    userId: string,
) => {
    if (
        !isValidUuid(message.id) ||
        !isValidUuid(message.sender_id) ||
        !isValidUuid(message.receiver_id) ||
        message.sender_id !== userId
    ) {
        return null;
    }

    const { data, error } = await client
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .eq('id', message.id)
        .eq('sender_id', userId)
        .eq('receiver_id', message.receiver_id)
        .maybeSingle();

    if (error) {
        return null;
    }

    return data as DirectMessage | null;
};

const findPersistedGroupMessage = async (
    client: SupabaseClient,
    message: GroupMessage,
    userId: string,
) => {
    if (
        !isValidUuid(message.id) ||
        !isValidUuid(message.sender_id) ||
        !isValidUuid(message.group_id) ||
        message.sender_id !== userId
    ) {
        return null;
    }

    const { data, error } = await client
        .from('messages')
        .select('id, sender_id, group_id, content, created_at')
        .eq('id', message.id)
        .eq('sender_id', userId)
        .eq('group_id', message.group_id)
        .maybeSingle();

    if (error) {
        return null;
    }

    return data as GroupMessage | null;
};

const fetchSenderProfile = async (client: SupabaseClient, userId: string) => {
    const { data, error } = await client
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();

    if (error || !data) {
        return { full_name: 'Unknown', avatar_url: '' };
    }

    return {
        full_name: data.full_name || 'Unknown',
        avatar_url: data.avatar_url || '',
    };
};

const acknowledge = (ack: ((response: SocketAck) => void) | undefined, response: SocketAck) => {
    if (typeof ack === 'function') {
        ack(response);
    }
};

/* ─────────────── Async Handler Wrapper ─────────────── */

const wrapAsync = <Args extends unknown[]>(handler: (...args: Args) => Promise<void>) => {
    return async (...args: Args) => {
        try {
            await handler(...args);
        } catch {
            const lastArg = args[args.length - 1];
            acknowledge(lastArg as ((response: SocketAck) => void) | undefined, {
                ok: false,
                error: 'Internal server error',
            });
        }
    };
};

/* ─────────────── Server Setup ─────────────── */

const io = new Server(httpServer, {
    cors: {
        origin: FRONTEND_ORIGIN,
        methods: ['GET', 'POST'],
    },
});

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Studify Backend is running');
});

/* ─────────────── Socket.IO Auth Middleware ─────────────── */

io.use(async (socket, next) => {
    try {
        const accessToken = getBearerToken(socket);
        if (!accessToken) {
            next(new Error('UNAUTHORIZED'));
            return;
        }

        const { data, error } = await adminSupabase.auth.getUser(accessToken);
        if (error || !data.user) {
            next(new Error('UNAUTHORIZED'));
            return;
        }

        const authedSocket = getAuthenticatedSocket(socket);
        authedSocket.data.user = data.user;
        authedSocket.data.accessToken = accessToken;
        authedSocket.data.supabase = createUserScopedClient(accessToken);
        next();
    } catch {
        next(new Error('UNAUTHORIZED'));
    }
});

/* ─────────────── Socket.IO Connection ─────────────── */

io.on('connection', (socket) => {
    const authedSocket = getAuthenticatedSocket(socket);
    const userId = authedSocket.data.user.id;

    socket.on(
        'join_dm_room',
        wrapAsync(async ({ contactId }: { contactId?: string }, ack?: (response: SocketAck) => void) => {
            if (!isValidUuid(contactId)) {
                acknowledge(ack, { ok: false, error: 'Invalid contact' });
                return;
            }

            const allowed = await isAcceptedFriend(authedSocket.data.supabase, userId, contactId);
            if (!allowed) {
                acknowledge(ack, { ok: false, error: 'Not an accepted contact' });
                return;
            }

            const roomId = getRoomId(userId, contactId);
            socket.join(roomId);
            acknowledge(ack, { ok: true });
        }),
    );

    socket.on(
        'send_message',
        wrapAsync(async (message: DirectMessage, ack?: (response: SocketAck) => void) => {
            if (!messageRateLimiter.check(`msg:${userId}`, 30, 60000)) {
                acknowledge(ack, { ok: false, error: 'Rate limit exceeded' });
                return;
            }

            const persistedMessage = await findPersistedDirectMessage(authedSocket.data.supabase, message, userId);
            if (!persistedMessage) {
                acknowledge(ack, { ok: false, error: 'Message is not authorized' });
                return;
            }

            const allowed = await isAcceptedFriend(authedSocket.data.supabase, userId, persistedMessage.receiver_id);
            if (!allowed) {
                acknowledge(ack, { ok: false, error: 'Not an accepted contact' });
                return;
            }

            const roomId = getRoomId(userId, persistedMessage.receiver_id);
            socket.to(roomId).emit('new_message', persistedMessage);
            acknowledge(ack, { ok: true });
        }),
    );

    socket.on(
        'delete_message',
        wrapAsync(async (
            { messageId, contactId }: { messageId?: string; contactId?: string },
            ack?: (response: SocketAck) => void,
        ) => {
            if (!isValidUuid(messageId) || !isValidUuid(contactId)) {
                acknowledge(ack, { ok: false, error: 'Invalid delete request' });
                return;
            }

            const allowed = await isAcceptedFriend(authedSocket.data.supabase, userId, contactId);
            if (!allowed) {
                acknowledge(ack, { ok: false, error: 'Not an accepted contact' });
                return;
            }

            const { data, error } = await authedSocket.data.supabase
                .from('messages')
                .delete()
                .eq('id', messageId)
                .eq('sender_id', userId)
                .eq('receiver_id', contactId)
                .select('id')
                .maybeSingle();

            if (error || !data) {
                acknowledge(ack, { ok: false, error: 'Message could not be deleted' });
                return;
            }

            const roomId = getRoomId(userId, contactId);
            socket.to(roomId).emit('message_deleted', { messageId });
            acknowledge(ack, { ok: true });
        }),
    );

    socket.on(
        'join_group_room',
        wrapAsync(async ({ groupId }: { groupId?: string }, ack?: (response: SocketAck) => void) => {
            if (!isValidUuid(groupId)) {
                acknowledge(ack, { ok: false, error: 'Invalid group' });
                return;
            }

            const allowed = await isGroupMember(authedSocket.data.supabase, userId, groupId);
            if (!allowed) {
                acknowledge(ack, { ok: false, error: 'Not a group member' });
                return;
            }

            socket.join(`group_${groupId}`);
            acknowledge(ack, { ok: true });
        }),
    );

    socket.on(
        'send_group_message',
        wrapAsync(async (message: GroupMessage, ack?: (response: SocketAck) => void) => {
            if (!messageRateLimiter.check(`group_msg:${userId}`, 30, 60000)) {
                acknowledge(ack, { ok: false, error: 'Rate limit exceeded' });
                return;
            }

            const persistedMessage = await findPersistedGroupMessage(authedSocket.data.supabase, message, userId);
            if (!persistedMessage) {
                acknowledge(ack, { ok: false, error: 'Message is not authorized' });
                return;
            }

            const allowed = await isGroupMember(authedSocket.data.supabase, userId, persistedMessage.group_id);
            if (!allowed) {
                acknowledge(ack, { ok: false, error: 'Not a group member' });
                return;
            }

            const senderProfile = await fetchSenderProfile(authedSocket.data.supabase, userId);

            socket.to(`group_${persistedMessage.group_id}`).emit('new_group_message', {
                ...persistedMessage,
                profiles: senderProfile,
            });
            acknowledge(ack, { ok: true });
        }),
    );

    socket.on(
        'delete_group_message',
        wrapAsync(async (
            { messageId, groupId }: { messageId?: string; groupId?: string },
            ack?: (response: SocketAck) => void,
        ) => {
            if (!isValidUuid(messageId) || !isValidUuid(groupId)) {
                acknowledge(ack, { ok: false, error: 'Invalid delete request' });
                return;
            }

            const allowed = await isGroupMember(authedSocket.data.supabase, userId, groupId);
            if (!allowed) {
                acknowledge(ack, { ok: false, error: 'Not a group member' });
                return;
            }

            const { data, error } = await authedSocket.data.supabase
                .from('messages')
                .delete()
                .eq('id', messageId)
                .eq('sender_id', userId)
                .eq('group_id', groupId)
                .select('id')
                .maybeSingle();

            if (error || !data) {
                acknowledge(ack, { ok: false, error: 'Message could not be deleted' });
                return;
            }

            socket.to(`group_${groupId}`).emit('group_message_deleted', { messageId });
            acknowledge(ack, { ok: true });
        }),
    );

    /* ── Typing indicators (DM) ── */

    socket.on(
        'typing_start_dm',
        wrapAsync(async ({ contactId }: { contactId?: string }) => {
            if (!isValidUuid(contactId)) return;
            const allowed = await isAcceptedFriend(authedSocket.data.supabase, userId, contactId);
            if (!allowed) return;
            const roomId = getRoomId(userId, contactId);
            const senderProfile = await fetchSenderProfile(authedSocket.data.supabase, userId);
            socket.to(roomId).emit('typing_start_dm', { userId, name: senderProfile.full_name });
        }),
    );

    socket.on(
        'typing_stop_dm',
        wrapAsync(async ({ contactId }: { contactId?: string }) => {
            if (!isValidUuid(contactId)) return;
            const allowed = await isAcceptedFriend(authedSocket.data.supabase, userId, contactId);
            if (!allowed) return;
            const roomId = getRoomId(userId, contactId);
            socket.to(roomId).emit('typing_stop_dm', { userId });
        }),
    );

    /* ── Typing indicators (Group) ── */

    socket.on(
        'typing_start_group',
        wrapAsync(async ({ groupId }: { groupId?: string }) => {
            if (!isValidUuid(groupId)) return;
            const allowed = await isGroupMember(authedSocket.data.supabase, userId, groupId);
            if (!allowed) return;
            const senderProfile = await fetchSenderProfile(authedSocket.data.supabase, userId);
            socket.to(`group_${groupId}`).emit('typing_start_group', { userId, name: senderProfile.full_name });
        }),
    );

    socket.on(
        'typing_stop_group',
        wrapAsync(async ({ groupId }: { groupId?: string }) => {
            if (!isValidUuid(groupId)) return;
            const allowed = await isGroupMember(authedSocket.data.supabase, userId, groupId);
            if (!allowed) return;
            socket.to(`group_${groupId}`).emit('typing_stop_group', { userId });
        }),
    );

    /* ── Read receipts ── */

    socket.on(
        'mark_messages_read',
        wrapAsync(async ({ contactId }: { contactId?: string }, ack?: (response: SocketAck) => void) => {
            if (!isValidUuid(contactId)) {
                acknowledge(ack, { ok: false, error: 'Invalid contact' });
                return;
            }

            const allowed = await isAcceptedFriend(authedSocket.data.supabase, userId, contactId);
            if (!allowed) {
                acknowledge(ack, { ok: false, error: 'Not an accepted contact' });
                return;
            }

            const { error } = await authedSocket.data.supabase
                .from('messages')
                .update({ is_read: true })
                .eq('sender_id', contactId)
                .eq('receiver_id', userId)
                .eq('is_read', false);

            if (error) {
                acknowledge(ack, { ok: false, error: 'Failed to mark messages as read' });
                return;
            }

            const roomId = getRoomId(userId, contactId);
            socket.to(roomId).emit('messages_read', { readBy: userId });
            acknowledge(ack, { ok: true });
        }),
    );
});

/* ─────────────── Express Global Error Handler ─────────────── */

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ ok: false, error: 'Internal server error' });
});

/* ─────────────── Graceful Shutdown ─────────────── */

const gracefulShutdown = (signal: string) => {
    httpServer.close(() => {
        process.exit(0);
    });

    setTimeout(() => {
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/* ─────────────── Periodic cleanup ─────────────── */

const cleanupInterval = setInterval(() => {
    messageRateLimiter.cleanup();
}, 60000);

process.on('exit', () => {
    clearInterval(cleanupInterval);
});

/* ─────────────── Start ─────────────── */

httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
