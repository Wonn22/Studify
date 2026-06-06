import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '../database/database';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const socketRef = useRef<Socket | null>(null);
    const tokenRef = useRef<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const disconnectSocket = () => {
            tokenRef.current = null;
            socketRef.current?.removeAllListeners();
            socketRef.current?.disconnect();
            socketRef.current = null;

            if (isMounted) {
                setSocket(null);
                setConnected(false);
            }
        };

        const connectSocket = (accessToken: string) => {
            if (tokenRef.current === accessToken && socketRef.current) {
                return;
            }

            disconnectSocket();
            tokenRef.current = accessToken;

            const nextSocket = io(SOCKET_URL, {
                transports: ['websocket'],
                autoConnect: false,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                auth: {
                    token: accessToken,
                },
            });

            nextSocket.on('connect', () => {
                console.log('[Socket.IO] Connected:', nextSocket.id);
                if (isMounted) setConnected(true);
            });

            nextSocket.on('disconnect', () => {
                console.log('[Socket.IO] Disconnected');
                if (isMounted) setConnected(false);
            });

            nextSocket.on('connect_error', (error) => {
                console.error('[Socket.IO] Connection error:', error.message);
                if (isMounted) setConnected(false);
            });

            socketRef.current = nextSocket;
            if (isMounted) setSocket(nextSocket);
            nextSocket.connect();
        };

        const initializeSocket = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!isMounted) return;

            if (session?.access_token) {
                connectSocket(session.access_token);
            } else {
                disconnectSocket();
            }
        };

        initializeSocket();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.access_token) {
                connectSocket(session.access_token);
            } else {
                disconnectSocket();
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            disconnectSocket();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};
