'use strict';

const { Server }    = require('socket.io');
const trustProxy    = require('./trustProxy');
const session       = require('./lib/session');
const spam          = require('./lib/spam');
const msgCache      = require('./lib/msgCache');
const { registerHandlers } = require('./lib/handlers');

function createSocketServer(httpServer, db) {
  const io = new Server(httpServer, {
    cors:              { origin: process.env.ALLOWED_ORIGIN || '*', methods: ['GET', 'POST'] },
    pingTimeout:       60_000,
    pingInterval:      10_000,
    transports:        ['websocket', 'polling'],
    maxHttpBufferSize: 1e6,
    connectTimeout:    45_000,
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
