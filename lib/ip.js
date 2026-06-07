'use strict';

const crypto = require('crypto');

/**
 * IPv4-mapped IPv6 アドレス（::ffff:x.x.x.x）と
 * loopback (::1) を IPv4 表現に正規化する。
 */
function normalizeIp(ip) {
  if (typeof ip !== 'string' || !ip) return '';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

function hashNormalizedIp(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

module.exports = { normalizeIp, hashNormalizedIp };
