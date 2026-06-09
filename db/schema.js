'use strict';

const bcrypt = require('bcrypt');
const { THEME_SYSTEM, SUPER_ADMIN_ID } = require('../lib/constants');

async function createTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      user_id         VARCHAR(30)  PRIMARY KEY,
      username        VARCHAR(50)  NOT NULL,
      password_hash   VARCHAR(255) NOT NULL,
      is_admin        BOOLEAN      NOT NULL DEFAULT FALSE,
      login_token     VARCHAR(64),
      color           VARCHAR(20)  NOT NULL DEFAULT '#000000',
      theme           VARCHAR(20)  NOT NULL DEFAULT '${THEME_SYSTEM}',
      status_text     VARCHAR(100) NOT NULL DEFAULT ''
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_accounts_token
    ON accounts(login_token) WHERE login_token IS NOT NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registration_ip_accounts (
      ip            CHAR(64) PRIMARY KEY,
      account_count INTEGER NOT NULL DEFAULT 0 CHECK (account_count >= 0)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bans (
      user_id      VARCHAR(30)  PRIMARY KEY,
      banned_ip    VARCHAR(64),
      banned_by_id VARCHAR(30)  NOT NULL
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bans_ip
    ON bans(banned_ip) WHERE banned_ip IS NOT NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shadow_bans (
      user_id      VARCHAR(30) PRIMARY KEY,
      banned_by_id VARCHAR(30) NOT NULL DEFAULT '__system__'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mutes (
      user_id      VARCHAR(30) PRIMARY KEY,
      until        TIMESTAMPTZ NOT NULL,
      muted_by_id  VARCHAR(30) NOT NULL DEFAULT '__system__'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id                  VARCHAR(36) PRIMARY KEY,
      sender_id           VARCHAR(30) NOT NULL,
      sender_username     VARCHAR(50) NOT NULL,
      message             TEXT        NOT NULL,
      color               VARCHAR(20) NOT NULL DEFAULT '#000000',
      sender_status       VARCHAR(100) NOT NULL DEFAULT '',
      timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reply_to_id         VARCHAR(36),
      edited              BOOLEAN     NOT NULL DEFAULT FALSE
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages(timestamp DESC)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS private_messages (
      id        VARCHAR(36) PRIMARY KEY,
      from_id   VARCHAR(30) NOT NULL,
      to_id     VARCHAR(30) NOT NULL,
      message   TEXT        NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pm_ts ON private_messages(timestamp DESC)
  `);

}

async function seedAdmin(pool) {
  const adminPass = process.env.ADMIN_PASS;
  if (!adminPass) return;

  const exists = await pool.query(
    'SELECT user_id FROM accounts WHERE user_id = $1', [SUPER_ADMIN_ID]
  );
  if (exists.rows.length > 0) return;

  const hash  = await bcrypt.hash(adminPass, 10);
  await pool.query(
    `INSERT INTO accounts (user_id, username, password_hash, is_admin, theme)
     VALUES ($1, $2, $3, TRUE, $4)`,
    [SUPER_ADMIN_ID, '管理者', hash, THEME_SYSTEM]
  );
}

module.exports = { createTables, seedAdmin };
