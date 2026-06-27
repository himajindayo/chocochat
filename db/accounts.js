'use strict';
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { THEME_SYSTEM, SUPER_ADMIN_ID, MAX_ACCOUNTS_PER_IP } = require('../lib/constants');
const { normalizeThemeMode } = require('../lib/theme');
const { hashNormalizedIp } = require('../lib/ip');
const { sha256Hex } = require('../lib/hash');
const { ACCOUNT_PUBLIC_COLUMNS, ACCOUNT_LOGIN_COLUMNS } = require('./selects');
const SALT_ROUNDS = 10;
let pool = null;
function _setPool(p) { pool = p; }
function toAccount(row, token) {
    const acc = {
        userId: row.user_id,
        username: row.username,
        isAdmin: row.is_admin,
        isSuperAdmin: row.user_id === SUPER_ADMIN_ID,
        color: row.color,
        theme: normalizeThemeMode(row.theme),
        statusText: row.status_text,
    };
    if (token !== undefined)
        acc.token = token;
    return acc;
}
async function signup({ userId, username, password, ip }) {
    if (userId === SUPER_ADMIN_ID) {
        return { success: false, error: 'このユーザーIDは使用できません' };
    }
    const trimmedUsername = username.trim();
    const createdIpHash = hashNormalizedIp(ip);
    if (!createdIpHash) {
        return { success: false, error: 'IPアドレスを取得できませんでした' };
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const dup = await client.query('SELECT 1 FROM accounts WHERE user_id = $1', [userId]);
        if (dup.rows.length > 0) {
            await client.query('ROLLBACK');
            return { success: false, error: 'このユーザーIDはすでに使用されています' };
        }
        const reserved = await client.query(
            `SELECT COUNT(*)::int AS account_count
               FROM accounts
              WHERE created_ip_hash = $1`,
            [createdIpHash]
        );
        if (reserved.rows[0].account_count >= MAX_ACCOUNTS_PER_IP) {
            await client.query('ROLLBACK');
            return { success: false, error: 'このIPアドレスからはこれ以上アカウントを作成できません' };
        }
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = sha256Hex(token);
        await client.query(`INSERT INTO accounts (user_id, username, password_hash, login_token, created_ip_hash, theme)
       VALUES ($1, $2, $3, $4, $5, $6)`, [userId, trimmedUsername, hash, tokenHash, createdIpHash, THEME_SYSTEM]);
        await client.query('COMMIT');
        return {
            success: true,
            account: {
                userId,
                username: trimmedUsername,
                isAdmin: false,
                isSuperAdmin: false,
                token,
                color: '#000000',
                theme: THEME_SYSTEM,
                statusText: '',
            },
        };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        if (err?.code === '23505') {
            return { success: false, error: 'このユーザーIDはすでに使用されています' };
        }
        throw err;
    }
    finally {
        client.release();
    }
}
async function login({ userId, password }) {
    const res = await pool.query(`SELECT ${ACCOUNT_LOGIN_COLUMNS} FROM accounts WHERE user_id = $1`, [userId]);
    if (res.rows.length === 0) {
        return { success: false, error: 'アカウントが見つかりません' };
    }
    const row = res.rows[0];
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid)
        return { success: false, error: 'パスワードが間違っています' };
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('UPDATE accounts SET login_token = $1 WHERE user_id = $2', [sha256Hex(token), userId]);
    return { success: true, account: toAccount(row, token) };
}
async function loginWithToken(token) {
    const res = await pool.query(`SELECT ${ACCOUNT_PUBLIC_COLUMNS} FROM accounts WHERE login_token = $1`, [sha256Hex(token)]);
    if (res.rows.length === 0) {
        return { success: false, error: 'セッションが無効です' };
    }
    const row = res.rows[0];
    return { success: true, account: toAccount(row, token) };
}
async function logout(token) {
    await pool.query('UPDATE accounts SET login_token = NULL WHERE login_token = $1', [sha256Hex(token)]);
}
async function deleteAccount(userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const deleted = await client.query('DELETE FROM accounts WHERE user_id = $1 RETURNING user_id', [userId]);
        if (deleted.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: 'アカウントが見つかりません' };
        }
        await client.query('DELETE FROM private_messages WHERE sender_id = $1 OR recipient_id = $1', [userId]);
        await client.query('DELETE FROM moderation_actions WHERE target_user_id = $1', [userId]);
        await client.query('COMMIT');
        return { success: true };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        throw err;
    }
    finally {
        client.release();
    }
}
async function updateProfile(userId, { color, theme, statusText, username } = {}) {
    const setClauses = [];
    const vals = [];
    let i = 1;
    if (color !== undefined) {
        setClauses.push(`color = $${i++}`);
        vals.push(color);
    }
    if (theme !== undefined) {
        setClauses.push(`theme = $${i++}`);
        vals.push(normalizeThemeMode(theme));
    }
    if (statusText !== undefined) {
        setClauses.push(`status_text = $${i++}`);
        vals.push(statusText);
    }
    if (username !== undefined) {
        setClauses.push(`username = $${i++}`);
        vals.push(username);
    }
    if (setClauses.length === 0)
        return { success: true };
    vals.push(userId);
    const res = await pool.query(`UPDATE accounts SET ${setClauses.join(', ')} WHERE user_id = $${i} RETURNING ${ACCOUNT_PUBLIC_COLUMNS}`, vals);
    if (res.rows.length === 0) {
        return { success: false, error: 'アカウントが見つかりません' };
    }
    return { success: true, account: toAccount(res.rows[0]) };
}
async function setAdminFlag(userId, isAdmin) {
    const res = await pool.query('UPDATE accounts SET is_admin = $1 WHERE user_id = $2 RETURNING user_id', [isAdmin, userId]);
    return res.rows.length > 0;
}
async function getAdminUserIds() {
    const res = await pool.query('SELECT user_id FROM accounts WHERE is_admin = TRUE');
    return res.rows.map(r => r.user_id);
}
async function getUsernamesByIds(userIds = []) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (ids.length === 0)
        return {};
    const res = await pool.query('SELECT user_id, username FROM accounts WHERE user_id = ANY($1)', [ids]);
    return Object.fromEntries(res.rows.map(r => [r.user_id, r.username]));
}
module.exports = {
    _setPool,
    signup, login, loginWithToken, logout, deleteAccount,
    updateProfile, setAdminFlag, getAdminUserIds,
    getUsernamesByIds,
};
