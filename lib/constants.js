'use strict';

// ── ユーザー ───────────────────────────────────────────────────────────────────
const SUPER_ADMIN_ID = 'ADMIN';

// ── 正規表現 ──────────────────────────────────────────────────────────────────
const COLOR_RE   = /^(?:#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6})$/;
const UUID_RE    = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE   = /^[0-9a-f]{64}$/;
const USER_ID_RE = /^[A-Za-z0-9]+$/;

// ── DB / キャッシュ ──────────────────────────────────────────────────────────
const MAX_MSG_HISTORY = 500;
const MAX_ACCOUNTS_PER_IP = 3;

// ── テーマ ────────────────────────────────────────────────────────────────────
const THEME_SYSTEM = 'system';
const THEME_LIGHT  = 'light';
const THEME_DARK   = 'dark';
const SUPPORTED_THEME_MODES = new Set([THEME_SYSTEM, THEME_LIGHT, THEME_DARK]);

module.exports = {
  SUPER_ADMIN_ID,
  COLOR_RE, UUID_RE, TOKEN_RE, USER_ID_RE,
  MAX_MSG_HISTORY,
  MAX_ACCOUNTS_PER_IP,
  THEME_SYSTEM, THEME_LIGHT, THEME_DARK, SUPPORTED_THEME_MODES,
};
