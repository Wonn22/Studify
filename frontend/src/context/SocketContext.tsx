import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

const socket: Socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [connected, setConnected] = useState(socket.connected);

    useEffect(() => {
        const onConnect = () => {
            console.log('[Socket.IO] Connected:', socket.id);
            setConnected(true);
        };
        const onDisconnect = () => {
            console.log('[Socket.IO] Disconnected');
            setConnected(false);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // If already connected when this mounts, sync state
        if (socket.connected) setConnected(true);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};
