import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Studify Backend is running');
});

// ─── SOCKET.IO ───────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // ── DIRECT MESSAGES ──────────────────────────────────────

    // Join a unique room for a DM conversation between two users
    socket.on('join_dm_room', ({ userId, contactId }: { userId: string; contactId: string }) => {
        // Room ID is deterministic regardless of who initiates
        const roomId = [userId, contactId].sort().join('_');
        socket.join(roomId);
        console.log(`[WS] ${socket.id} joined DM room: ${roomId}`);
    });

    // Broadcast a new direct message to the DM room
    socket.on('send_message', (message: {
        id: string;
        sender_id: string;
        receiver_id: string;
        content: string;
        created_at: string;
    }) => {
        const roomId = [message.sender_id, message.receiver_id].sort().join('_');
        // Broadcast to everyone in the room EXCEPT the sender (sender already has it)
        socket.to(roomId).emit('new_message', message);
        console.log(`[WS] Message broadcast to room ${roomId}`);
    });

    // Broadcast a deleted direct message
    socket.on('delete_message', ({ messageId, userId, contactId }: {
        messageId: string;
        userId: string;
        contactId: string;
    }) => {
        const roomId = [userId, contactId].sort().join('_');
        socket.to(roomId).emit('message_deleted', { messageId });
        console.log(`[WS] Delete broadcast to room ${roomId}`);
    });

    // ── GROUP MESSAGES ───────────────────────────────────────

    // Join a group discussion room
    socket.on('join_group_room', ({ groupId }: { groupId: string }) => {
        socket.join(`group_${groupId}`);
        console.log(`[WS] ${socket.id} joined group room: group_${groupId}`);
    });

    // Broadcast a new group message
    socket.on('send_group_message', (message: {
        id: string;
        sender_id: string;
        group_id: string;
        content: string;
        created_at: string;
        profiles?: { full_name: string; avatar_url: string };
    }) => {
        socket.to(`group_${message.group_id}`).emit('new_group_message', message);
        console.log(`[WS] Group message broadcast to group_${message.group_id}`);
    });

    // Broadcast a deleted group message
    socket.on('delete_group_message', ({ messageId, groupId }: {
        messageId: string;
        groupId: string;
    }) => {
        socket.to(`group_${groupId}`).emit('group_message_deleted', { messageId });
        console.log(`[WS] Group delete broadcast to group_${groupId}`);
    });

    socket.on('disconnect', () => {
        console.log(`[WS] Client disconnected: ${socket.id}`);
    });
});

// ─────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});