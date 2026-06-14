'use strict';
const bcrypt = require('bcrypt');
const { THEME_SYSTEM, SUPER_ADMIN_ID } = require('../lib/constants');

async function createTables(pool) {
    await pool.query(`
    CREATE TABLE accounts (
      user_id         VARCHAR(30)  PRIMARY KEY,
      username        VARCHAR(50)  NOT NULL,
      password_hash   VARCHAR(255) NOT NULL,
      is_admin        BOOLEAN      NOT NULL DEFAULT FALSE,
      login_token     VARCHAR(64),
      created_ip_hash CHAR(64)     NOT NULL DEFAULT '',
      color           VARCHAR(20)  NOT NULL DEFAULT '#000000',
      theme           VARCHAR(20)  NOT NULL DEFAULT '${THEME_SYSTEM}',
      status_text     VARCHAR(100) NOT NULL DEFAULT ''
    )
  `);
    await pool.query(`
    CREATE INDEX idx_accounts_token
    ON accounts(login_token) WHERE login_token IS NOT NULL
  `);
    await pool.query(`
    CREATE TABLE public_messages (
      id              VARCHAR(36)  PRIMARY KEY,
      sender_id       VARCHAR(30)  NOT NULL,
      sender_username VARCHAR(50)  NOT NULL,
      message         TEXT         NOT NULL,
      color           VARCHAR(20)  NOT NULL DEFAULT '#000000',
      sender_status   VARCHAR(100) NOT NULL DEFAULT '',
      timestamp       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      reply_to_id     VARCHAR(36),
      edited          BOOLEAN      NOT NULL DEFAULT FALSE
    )
  `);
    await pool.query(`
    CREATE INDEX idx_public_messages_ts
    ON public_messages(timestamp DESC)
  `);
    await pool.query(`
    CREATE TABLE private_messages (
      id           VARCHAR(36) PRIMARY KEY,
      sender_id    VARCHAR(30) NOT NULL,
      recipient_id VARCHAR(30) NOT NULL,
      message      TEXT        NOT NULL,
      timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await pool.query(`
    CREATE INDEX idx_private_messages_sender
    ON private_messages(sender_id)
  `);
    await pool.query(`
    CREATE INDEX idx_private_messages_recipient
    ON private_messages(recipient_id)
  `);
    await pool.query(`
    CREATE INDEX idx_private_messages_ts
    ON private_messages(timestamp DESC)
  `);
    await pool.query(`
    CREATE TABLE moderation_actions (
      action         VARCHAR(20) NOT NULL,
      target_user_id VARCHAR(30) NOT NULL,
      target_ip_hash CHAR(64),
      actor_id       VARCHAR(30) NOT NULL,
      expires_at     BIGINT,
      PRIMARY KEY (action, target_user_id)
    )
  `);
    await pool.query(`
    CREATE INDEX idx_moderation_actions_ip
    ON moderation_actions(target_ip_hash)
    WHERE action = 'ban' AND target_ip_hash IS NOT NULL
  `);
    await pool.query(`
    CREATE INDEX idx_moderation_actions_expiry
    ON moderation_actions(expires_at)
    WHERE action = 'mute' AND expires_at IS NOT NULL
  `);
}

async function seedAdmin(pool) {
    const adminPass = process.env.ADMIN_PASS;
    if (!adminPass)
        return;
    const exists = await pool.query('SELECT user_id FROM accounts WHERE user_id = $1', [SUPER_ADMIN_ID]);
    if (exists.rows.length > 0)
        return;
    const hash = await bcrypt.hash(adminPass, 10);
    await pool.query(`INSERT INTO accounts (user_id, username, password_hash, is_admin, theme)
     VALUES ($1, $2, $3, TRUE, $4)`, [SUPER_ADMIN_ID, 'ADMIN', hash, THEME_SYSTEM]);
}
module.exports = { createTables, seedAdmin };
