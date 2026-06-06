'use strict';

const crypto = require('crypto');
const { validateUserId } = require('./validate');
const { COLOR_RE } = require('./constants');

function normalizeTargetId(value, options = {}) {
  if (typeof value !== 'string') {
    return { ok: false, error: 'ユーザーIDを入力してください' };
  }

  const targetId = value.trim();
  const err = validateUserId(targetId, { allowSuperAdmin: options.allowSuperAdmin === true });
  if (err) {
    return { ok: false, error: err };
  }

  return { ok: true, targetId };
}

function buildChatMessage({
  senderId,
  senderUsername,
  message,
  color,
  replyTo = null,
  isAdmin = false,
  senderStatus = '',
}) {
  return {
    id: crypto.randomUUID(),
    senderId,
    senderUsername: isAdmin ? `【管理者】${senderUsername}` : senderUsername,
    message,
    color: COLOR_RE.test(color) ? color : '#000000',
    timestamp: new Date().toISOString(),
    replyTo: replyTo?.id ? { id: replyTo.id } : null,
    senderStatus: typeof senderStatus === 'string' ? senderStatus.slice(0, 100) : '',
  };
}
function emitToUserSockets(io, session, userId, event, payload) {
  for (const sid of session.getSocketIds(userId)) {
    io.sockets.sockets.get(sid)?.emit(event, payload);
  }
}

function emitToUserSocketsWithSocket(io, session, userId, callback) {
  for (const sid of session.getSocketIds(userId)) {
    const socket = io.sockets.sockets.get(sid);
    if (socket) callback(socket, sid);
  }
}

module.exports = {
  normalizeTargetId,
  buildChatMessage,
  emitToUserSockets,
  emitToUserSocketsWithSocket,
};
