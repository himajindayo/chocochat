'use strict';

const geoip = require('geoip-lite');
const { normalizeIp } = require('./ip');

function isPrivateOrLoopbackIp(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;
  if (normalized === '127.0.0.1') return true;

  const parts = normalized.split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map(n => Number(n));
  if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;

  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isJapanIp(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;
  if (isPrivateOrLoopbackIp(normalized)) return true;

  const result = geoip.lookup(normalized);
  if (!result || !result.country) return false;
  return result.country === 'JP';
}

function assertJapanAccess(ip, userId) {
  if (userId === 'ADMIN') return { allowed: true };
  if (isJapanIp(ip)) return { allowed: true };
  return { allowed: false, error: '日本国外からのアクセスは許可されていません' };
}

module.exports = { isJapanIp, assertJapanAccess };
