'use strict';
const { sha256Hex } = require('./hash');
function normalizeIp(ip) {
    if (typeof ip !== 'string' || !ip)
        return '';
    if (ip.startsWith('::ffff:'))
        return ip.slice(7);
    if (ip === '::1')
        return '127.0.0.1';
    return ip;
}
function hashNormalizedIp(ip) {
    const normalized = normalizeIp(ip);
    if (!normalized)
        return null;
    return sha256Hex(normalized);
}
module.exports = { normalizeIp, hashNormalizedIp };
