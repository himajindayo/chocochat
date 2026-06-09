'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { THEME_SYSTEM, SUPER_ADMIN_ID, MAX_ACCOUNTS_PER_IP } = require('../lib/constants');
const { normalizeThemeMode } = require('../lib/theme');
const { hashNormalizedIp } = require('../lib/ip');
const { sha256Hex } = require('../lib/hash');

const SALT_ROUNDS = 10;

let pool = null;
function _setPool(p) { pool = p; }

async function reserveSignupSlot(client, ipHash, maxAccountsPerIp) {
  if (!ipHash) return true;

  const res = await client.query(
    `INSERT INTO registration_ip_accounts (ip, account_count)
     VALUES ($1, 1)
     ON CONFLICT (ip) DO UPDATE
       SET account_count = registration_ip_accounts.account_count + 1
       WHERE registration_ip_accounts.account_count < $2
     RETURNING account_count`,
    [ipHash, maxAccountsPerIp]
  );

  return res.rowCount > 0;
}

function toAccount(row, token) {
  const acc = {
    userId:     row.user_id,
    username:   row.username,
    isAdmin:    row.is_admin,
    color:      row.color,
    theme:      normalizeThemeMode(row.theme),
    statusText: row.status_text,
  };
  if (token !== undefined) acc.token = token;
  return acc;
}

async function signup({ userId, username, password, ip }) {
  if (userId === SUPER_ADMIN_ID)
    return { success: false, error: 'このユーザーIDは使用できません' };

  const trimmedUsername = username.trim();
  const ipHash = hashNormalizedIp(ip);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const dup = await client.query(
      'SELECT 1 FROM accounts WHERE user_id = $1', [userId]
    );
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'このユーザーIDはすでに使用されています' };
    }

    if (ipHash) {
      const reserved = await reserveSignupSlot(client, ipHash, MAX_ACCOUNTS_PER_IP);
      if (!reserved) {
        await client.query('ROLLBACK');
        return { success: false, error: 'このIPアドレスからはこれ以上アカウントを作成できません' };
      }
    }

    const hash  = await bcrypt.hash(password, SALT_ROUNDS);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(token);

    await client.query(
      `INSERT INTO accounts (user_id, username, password_hash, login_token, theme)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, trimmedUsername, hash, tokenHash, THEME_SYSTEM]
    );

    await client.query('COMMIT');

    return {
      success: true,
      account: {
        userId,
        username:   trimmedUsername,
        isAdmin:    false,
        token,
        color:      '#000000',
        theme:      THEME_SYSTEM,
        statusText: '',
      },
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err?.code === '23505') {
      return { success: false, error: 'このユーザーIDはすでに使用されています' };
    }
    throw err;
  } finally {
    client.release();
  }
}

async function login({ userId, password }) {
  const res = await pool.query('SELECT * FROM accounts WHERE user_id = $1', [userId]);
  if (res.rows.length === 0)
    return { success: false, error: 'アカウントが見つかりません' };

  const row   = res.rows[0];
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return { success: false, error: 'パスワードが間違っています' };

  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    'UPDATE accounts SET login_token = $1 WHERE user_id = $2',
    [sha256Hex(token), userId]
  );
  return { success: true, account: toAccount(row, token) };
}

async function loginWithToken(token) {
  const res = await pool.query(
    'SELECT * FROM accounts WHERE login_token = $1', [sha256Hex(token)]
  );
  if (res.rows.length === 0)
    return { success: false, error: 'セッションが無効です' };

  const row = res.rows[0];
  return { success: true, account: toAccount(row, token) };
}

async function logout(token) {
  await pool.query('UPDATE accounts SET login_token = NULL WHERE login_token = $1', [sha256Hex(token)]);
}

async function updateProfile(userId, { color, theme, statusText, username } = {}) {
  const setClauses = [];
  const vals       = [];
  let i = 1;

  if (color      !== undefined) { setClauses.push(`color = $${i++}`);       vals.push(color); }
  if (theme      !== undefined) { setClauses.push(`theme = $${i++}`);       vals.push(normalizeThemeMode(theme)); }
  if (statusText !== undefined) { setClauses.push(`status_text = $${i++}`); vals.push(statusText); }
  if (username   !== undefined) { setClauses.push(`username = $${i++}`);    vals.push(username); }

  if (setClauses.length === 0) return { success: true };

  vals.push(userId);
  const res = await pool.query(
    `UPDATE accounts SET ${setClauses.join(', ')} WHERE user_id = $${i} RETURNING *`,
    vals
  );
  if (res.rows.length === 0)
    return { success: false, error: 'アカウントが見つかりません' };
  return { success: true, account: toAccount(res.rows[0]) };
}

async function setAdminFlag(userId, isAdmin) {
  const res = await pool.query(
    'UPDATE accounts SET is_admin = $1 WHERE user_id = $2 RETURNING user_id',
    [isAdmin, userId]
  );
  return res.rows.length > 0;
}

async function getAdminUserIds() {
  const res = await pool.query('SELECT user_id FROM accounts WHERE is_admin = TRUE');
  return res.rows.map(r => r.user_id);
}

async function getUsernamesByIds(userIds = []) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};
  const res = await pool.query('SELECT user_id, username FROM accounts WHERE user_id = ANY($1)', [ids]);
  return Object.fromEntries(res.rows.map(r => [r.user_id, r.username]));
}

module.exports = {
  _setPool,
  signup, login, loginWithToken, logout,
  updateProfile, setAdminFlag, getAdminUserIds,
  getUsernamesByIds,
};
