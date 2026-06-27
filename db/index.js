'use strict';
const accounts = require('./accounts');
const messages = require('./messages');
const moderation = require('./moderation');
const schema = require('./schema');
const { createPool } = require('./pool');
let pool = null;
async function initDatabase() {
    try {
        pool = createPool();
        await pool.query('SELECT 1');
        [accounts, messages, moderation].forEach(m => m._setPool(pool));
        await schema.createTables(pool);
        await schema.seedAdmin(pool);
        return true;
    }
    catch (err) {
        console.error('[DB] 接続失敗:', err.message);
        pool = null;
        throw err;
    }
}
async function closeDatabase() {
    if (pool) {
        await pool.end().catch(() => { });
        pool = null;
    }
}
async function deleteAllContent() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM public_messages');
        await client.query('DELETE FROM private_messages');
        await client.query('COMMIT');
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        throw err;
    }
    finally {
        client.release();
    }
}
module.exports = {
    initDatabase,
    closeDatabase,
    deleteAllContent,
    signup: accounts.signup,
    login: accounts.login,
    loginWithToken: accounts.loginWithToken,
    logout: accounts.logout,
    deleteAccount: accounts.deleteAccount,
    updateProfile: accounts.updateProfile,
    getAdminUserIds: accounts.getAdminUserIds,
    getUsernamesByIds: accounts.getUsernamesByIds,
    setAdminFlag: accounts.setAdminFlag,
    getMessages: messages.getMessages,
    addMessage: messages.addMessage,
    updateMessage: messages.updateMessage,
    deleteMessage: messages.deleteMessage,
    addPrivateMessage: messages.addPrivateMessage,
    getPrivateMessagesForUser: messages.getPrivateMessagesForUser,
    getAllPrivateMessages: messages.getAllPrivateMessages,
    deletePrivateMessage: messages.deletePrivateMessage,
    addBan: moderation.addBan,
    removeBan: moderation.removeBan,
    isBannedUser: moderation.isBannedUser,
    isBannedIp: moderation.isBannedIp,
    getBannedUsers: moderation.getBannedUsers,
    addShadowBan: moderation.addShadowBan,
    removeShadowBan: moderation.removeShadowBan,
    getShadowBans: moderation.getShadowBans,
    saveMute: moderation.saveMute,
    clearMute: moderation.clearMute,
    getActiveMutes: moderation.getActiveMutes,
};
