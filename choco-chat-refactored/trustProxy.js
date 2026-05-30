'use strict';

const { normalizeIp } = require('./lib/ip');

function isEnabled() {
  return process.env.TRUST_PROXY === 'true';
}

function configureExpress(app) {
  if (isEnabled()) app.set('trust proxy', true);
}

function getClientIp(socket) {
  if (!isEnabled()) return normalizeIp(socket.handshake.address);

  const forwardedFor = socket.handshake.headers['x-forwarded-for'];
  const raw = typeof forwardedFor === 'string' && forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : socket.handshake.address;

  return normalizeIp(raw);
}

module.exports = { isEnabled, configureExpress, getClientIp };
