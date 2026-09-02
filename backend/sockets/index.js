import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import notificationService from '../services/notification.service.js';

let io;

export const initSockets = (server) => {
  // Build CORS origin checker from env ALLOWED_ORIGINS when provided
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : null;
  const isLocalhostOrigin = (origin) =>
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin);

  io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (isLocalhostOrigin(origin)) return cb(null, true);
        if (!allowedOrigins) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS Not Allowed'), false);
      },
      credentials: true
    },
    // tune heartbeats so long-polling/websocket disconnects are less aggressive
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL_MS, 10) || 25000,
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT_MS, 10) || 60000,
  });

  io.use(async (socket, next) => {
    try {
      // Prefer explicit token, otherwise attempt to read `jwt` cookie from handshake headers
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      let finalToken = token;
      if (!finalToken && socket.handshake.headers && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').map(c => c.trim());
        for (const c of cookies) {
          if (c.startsWith('jwt=')) {
            finalToken = c.split('=')[1];
            break;
          }
        }
      }
      if (finalToken) {
        try {
          const decoded = jwt.verify(finalToken, process.env.JWT_SECRET);
          socket.data.userId = decoded.id;
        } catch (e) {
          // ignore invalid token
        }
      }
      return next();
    } catch (e) {
      // don't reject; proceed without user binding
      return next();
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.data.userId;
    // normalize user id to string for map keys
    const uidStr = uid ? String(uid) : null;
    console.info('[sockets] connection established', {
      socketId: socket.id,
      userId: uidStr || 'none',
      handshakeTransport: socket.handshake?.transport,
      handshakeQuery: socket.handshake?.query
    });
    if (uid) {
      // Bind socket to user mapping
      const key = String(uid);
      const arr = notificationService.onlineSockets.get(key) || [];
      if (!arr.includes(socket.id)) {
        arr.push(socket.id);
        notificationService.onlineSockets.set(key, arr);
      }
      // record last-seen timestamp for this socket id
      try { notificationService.onlineSocketsTimestamps.set(socket.id, Date.now()); } catch (e) {}

      console.info('[sockets] bound socket', socket.id, 'to user', key, 'totalSockets=', (notificationService.onlineSockets.get(key) || []).length);
    }

    // Attach engine transport listeners for better visibility into upgrades/close
    try {
      const conn = socket.conn;
      if (conn) {
        conn.on('upgrade', () => {
          try { console.info('[sockets] transport upgrade', { socketId: socket.id, userId: socket.data.userId ? String(socket.data.userId) : 'none', newTransport: conn.transport && conn.transport.name }); } catch (e) {}
        });
        conn.on('close', (reason) => {
          try { console.info('[sockets] conn close', { socketId: socket.id, userId: socket.data.userId ? String(socket.data.userId) : 'none', reason }); } catch (e) {}
        });
      }
    } catch (e) {}

    socket.on('error', (err) => {
      console.warn('[sockets] socket error', socket.id, err && err.message ? err.message : err);
    });

    socket.on('disconnect', (reason) => {
      const uid2 = socket.data.userId ? String(socket.data.userId) : null;
      try { console.info('[sockets] disconnect event', { socketId: socket.id, reason, transport: socket?.handshake?.transport, userId: uid2 || 'none' }); } catch (e) {}
      if (uid2) {
        const arr2 = notificationService.onlineSockets.get(uid2) || [];
        const filtered = arr2.filter(id => id !== socket.id);
        if (filtered.length > 0) {
          notificationService.onlineSockets.set(uid2, filtered);
        } else {
          notificationService.onlineSockets.delete(uid2);
        }
        // remove timestamp for this socket
        try { notificationService.onlineSocketsTimestamps.delete(socket.id); } catch (e) {}
        console.info('[sockets] socket disconnected', socket.id, 'userId=', uid2, 'remainingSockets=', filtered.length);
      }
    });
  });

  return io;
};

export const emitToUser = (userId, event, payload) => {
  const sockets = notificationService.onlineSockets.get(String(userId)) || [];
  if (!sockets || sockets.length === 0) {
    console.debug('[sockets] emitToUser user not currently connected via websocket (normal for background jobs)', {
      userId: String(userId),
      event,
      reason: 'No active socket connections for this user - they may be logged out or offline'
    });
    return;
  }
  console.info('[sockets] emitting', event, 'to user', String(userId), 'socketCount=', sockets.length);
  for (const sid of sockets) {
    io?.to(sid).emit(event, payload);
  }
};

export default { initSockets, emitToUser };
