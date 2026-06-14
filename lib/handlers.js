'use strict';
const { registerAccountHandlers } = require('./handlers/account');
const { registerMessageHandlers } = require('./handlers/messages');
const { registerProfileHandlers } = require('./handlers/profile');
const { registerLifecycleHandlers } = require('./handlers/lifecycle');
const session = require('./session');
const msgCache = require('./msgCache');
function buildContext(socket, io, db, clientIp, state) {
    return {
        socket,
        io,
        db,
        session,
        msgCache,
        clientIp,
        state,
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
