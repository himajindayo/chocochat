'use strict';
const { hashNormalizedIp } = require('../lib/ip');
const { MODERATION_MUTE_COLUMNS } = require('./selects');
let pool = null;
function _setPool(p) { pool = p; }
async function upsertAction({ action, targetUserId, targetIpHash = null, actorId, expiresAt = null }) {
    await pool.query(`INSERT INTO moderation_actions
      (action, target_user_id, target_ip_hash, actor_id, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (action, target_user_id)
     DO UPDATE SET
       target_ip_hash = EXCLUDED.target_ip_hash,
       actor_id = EXCLUDED.actor_id,
       expires_at = EXCLUDED.expires_at`, [action, targetUserId, targetIpHash, actorId, expiresAt]);
}
async function addBan(userId, bannedById, bannedIpHash) {
    await upsertAction({
        action: 'ban',
        targetUserId: userId,
        targetIpHash: bannedIpHash || null,
        actorId: bannedById,
    });
}
async function removeBan(userId) {
    const res = await pool.query("DELETE FROM moderation_actions WHERE action = 'ban' AND target_user_id = $1 RETURNING target_user_id", [userId]);
    return res.rows.length > 0;
}
async function isBannedUser(userId) {
    const res = await pool.query("SELECT 1 FROM moderation_actions WHERE action = 'ban' AND target_user_id = $1", [userId]);
    return res.rows.length > 0;
}
async function isBannedIp(ip) {
    if (!ip)
        return false;
    const res = await pool.query("SELECT 1 FROM moderation_actions WHERE action = 'ban' AND target_ip_hash = $1", [hashNormalizedIp(ip)]);
    return res.rows.length > 0;
}
async function getBannedUsers() {
    const res = await pool.query("SELECT target_user_id, actor_id FROM moderation_actions WHERE action = 'ban' ORDER BY target_user_id");
    return res.rows.map(r => ({
        userId: r.target_user_id,
        bannedById: r.actor_id || '__system__',
    }));
}
async function addShadowBan(userId, bannedById) {
    await upsertAction({
        action: 'shadowban',
        targetUserId: userId,
        actorId: bannedById || '__system__',
    });
}
async function removeShadowBan(userId) {
    const res = await pool.query("DELETE FROM moderation_actions WHERE action = 'shadowban' AND target_user_id = $1 RETURNING target_user_id", [userId]);
    return res.rows.length > 0;
}
async function getShadowBans() {
    const res = await pool.query("SELECT target_user_id, actor_id FROM moderation_actions WHERE action = 'shadowban' ORDER BY target_user_id");
    return res.rows.map(r => ({
        userId: r.target_user_id,
        bannedById: r.actor_id || '__system__',
    }));
}
async function saveMute(userId, until, mutedById) {
    await upsertAction({
        action: 'mute',
        targetUserId: userId,
        actorId: mutedById || '__system__',
        expiresAt: Number(until),
    });
}
async function clearMute(userId) {
    const res = await pool.query("DELETE FROM moderation_actions WHERE action = 'mute' AND target_user_id = $1 RETURNING target_user_id", [userId]);
    return res.rows.length > 0;
}
async function getActiveMutes() {
    const now = Date.now();
    const res = await pool.query(`SELECT ${MODERATION_MUTE_COLUMNS} FROM moderation_actions WHERE action = 'mute' AND expires_at > $1`, [now]);
    return res.rows.map(r => ({
        userId: r.target_user_id,
        until: Number(r.expires_at),
        mutedById: r.actor_id || '__system__',
    }));
}
module.exports = {
    _setPool,
    addBan,
    removeBan,
    isBannedUser,
    isBannedIp,
    getBannedUsers,
    addShadowBan,
    removeShadowBan,
    getShadowBans,
    saveMute,
    clearMute,
    getActiveMutes,
};
