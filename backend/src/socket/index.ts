// ============================================================
// MEMBER 4 - Real-Time WebSockets Engine (Socket.IO)
// Live seat updates, booking confirmations & instant notifications
// ============================================================
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    // Join a show room to receive real-time seat locking updates
    socket.on('join_show', (showId: string) => {
      socket.join(`show_${showId}`);
    });

    socket.on('leave_show', (showId: string) => {
      socket.leave(`show_${showId}`);
    });

    // Join a user room for private notifications
    socket.on('join_user', (userId: string) => {
      socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
      // Disconnected cleanly
    });
  });

  console.log('⚡ Socket.IO initialized for real-time seat and notification sync');
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
