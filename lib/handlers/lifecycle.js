'use strict';

const session = require('../session');
const spam = require('../spam');

function registerLifecycleHandlers(socket, ctx) {
  const { io, state } = ctx;

  socket.on('disconnect', () => {
    if (!state.currentUserId) return;
    socket.broadcast.emit('userStoppedTyping', { userId: state.currentUserId });
    const wasLast = session.unregisterSocket(state.currentUserId, socket.id);
    if (wasLast) {
      spam.clearUserData(state.currentUserId);
      const online = session.getOnlineUsers();
      io.emit('userLeft', {
        userId: state.currentUserId,
        username: state.currentAccount?.username || state.currentUserId,
        userCount: online.length,
        users: online,
        userStatuses: session.getUserStatuses(),
      });
    }
  });
}

module.exports = { registerLifecycleHandlers };
