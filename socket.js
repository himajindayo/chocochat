'use strict';
const { Server } = require('socket.io');
const { URL } = require('url');
const trustProxy = require('./trustProxy');
const spam = require('./lib/spam');
const msgCache = require('./lib/msgCache');
const { registerHandlers } = require('./lib/handlers');
function parseAllowedOrigins(value) {
    if (value === undefined || value === null || String(value).trim() === '')
        return null;
    return String(value)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}
function isOriginAllowed(origin, host, allowedOrigins) {
    if (!origin)
        return true;
    if (allowedOrigins === null) {
        try {
            const u = new URL(origin);
            return u.host === host;
        }
        catch {
            return false;
        }
    }
    if (allowedOrigins.includes(origin))
        return true;
    try {
        const u = new URL(origin);
        return u.host === host;
    }
    catch {
        return false;
    }
}
function createSocketServer(httpServer, db) {
    const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGIN);
    const io = new Server(httpServer, {
        cors: { origin: allowedOrigins === null ? false : allowedOrigins, methods: ['GET', 'POST'] },
        pingTimeout: 60_000,
        pingInterval: 10_000,
        transports: ['websocket', 'polling'],
        maxHttpBufferSize: 1e6,
        connectTimeout: 45_000,
        allowRequest: (req, cb) => {
            const origin = req.headers.origin;
            const host = req.headers.host || '';
            cb(null, isOriginAllowed(origin, host, allowedOrigins));
        },
    });
    io.on('connection', (socket) => {
        const clientIp = trustProxy.getClientIp(socket);
        if (spam.isConnectionRateLimited(clientIp)) {
            socket.emit('error', { message: '接続が制限されています。しばらく待ってから再試行してください' });
            socket.disconnect(true);
            return;
        }
        registerHandlers(socket, io, db, clientIp);
    });
    return io;
}
module.exports = { createSocketServer, setMsgCache: msgCache.set };
