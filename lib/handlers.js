'use strict';

const { registerAccountHandlers } = require('./handlers/account');
const { registerMessageHandlers } = require('./handlers/messages');
const { registerProfileHandlers } = require('./handlers/profile');
const { registerLifecycleHandlers } = require('./handlers/lifecycle');
const auth = require('./auth');
const session = require('./session');
const msgCache = require('./msgCache');
const { UUID_RE, TOKEN_RE } = require('./constants');
const { assertJapanAccess } = require('./geoip');

async function assertLoginAccess(db, clientIp, userId = undefined) {
  if (await db.isBannedIp(clientIp)) {
    return { success: false, error: 'このIPアドレスはBANされています' };
  }
  const jp = assertJapanAccess(clientIp, userId);
  if (!jp.allowed) return { success: false, error: jp.error };
  return { success: true };
}

function buildContext(socket, io, db, clientIp, state) {
  return {
    socket,
    io,
    db,
    session,
    msgCache,
    clientIp,
    state,
    TOKEN_RE,
    UUID_RE,
    assertLoginAccess,
    requireAuth: auth.requireAuth,
  };
}

function registerHandlers(socket, io, db, clientIp) {
  const state = {
    currentUserId: null,
    currentToken: null,
    currentAccount: null,
  };
  const ctx = buildContext(socket, io, db, clientIp, state);

  registerAccountHandlers(socket, ctx);
  registerMessageHandlers(socket, ctx);
  registerProfileHandlers(socket, ctx);
  registerLifecycleHandlers(socket, ctx);
}

module.exports = { registerHandlers };
