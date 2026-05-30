'use strict';

// ── 接続レート制限 ─────────────────────────────────────────────────────────────
const connAttempts = new Map(); // ip -> [timestamp, ...]
const connLockouts = new Map(); // ip -> lockUntil
const CONN_WINDOW  = 60_000;
const CONN_LIMIT   = 15;
const CONN_LOCKOUT = 60 * 60_000;

function isConnectionRateLimited(ip) {
  const now  = Date.now();
  const lock = connLockouts.get(ip);
  if (lock && now < lock) return true;
  const hist = (connAttempts.get(ip) || []).filter(t => now - t < CONN_WINDOW);
  hist.push(now);
  connAttempts.set(ip, hist);
  if (hist.length > CONN_LIMIT) {
    connLockouts.set(ip, now + CONN_LOCKOUT);
    connAttempts.delete(ip);
    return true;
  }
  return false;
}

// ── ログイン試行制限 ────────────────────────────────────────────────────────────
const loginAttempts = new Map(); // ip -> [timestamp, ...]
const loginLockouts = new Map(); // ip -> lockUntil
const LOGIN_WINDOW  = 5 * 60_000;
const LOGIN_LIMIT   = 5;
const LOGIN_LOCKOUT = 30 * 60_000;

/** ロック中なら { limited: true, remaining } を、そうでなければ { limited: false } を返す */
function isLoginRateLimited(ip) {
  const now  = Date.now();
  const lock = loginLockouts.get(ip);
  if (lock && now < lock) return { limited: true, remaining: Math.ceil((lock - now) / 1000) };
  return { limited: false };
}

function recordFailedLogin(ip) {
  const now  = Date.now();
  const hist = (loginAttempts.get(ip) || []).filter(t => now - t < LOGIN_WINDOW);
  hist.push(now);
  loginAttempts.set(ip, hist);
  if (hist.length >= LOGIN_LIMIT) {
    loginLockouts.set(ip, now + LOGIN_LOCKOUT);
    loginAttempts.delete(ip);
  }
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
  loginLockouts.delete(ip);
}

// ── メッセージレート制限 ───────────────────────────────────────────────────────
const lastMsgTime = new Map(); // userId -> timestamp
const MSG_INTERVAL = 1_000;

function isMessageRateLimited(userId) {
  const now  = Date.now();
  const last = lastMsgTime.get(userId) || 0;
  if (now - last < MSG_INTERVAL) return true;
  lastMsgTime.set(userId, now);
  return false;
}

// ── フラッド検知 ───────────────────────────────────────────────────────────────
const msgHistory  = new Map(); // userId -> [{ message, timestamp }, ...]
const FLOOD_LIMIT = 6;
const FLOOD_WIN   = 15_000;
const FLOOD_MUTE  = 24 * 60; // 分

function checkFlood(userId, message, mutedUsers, saveMuteFn) {
  const now  = Date.now();
  const hist = msgHistory.get(userId) || [];
  hist.push({ message, timestamp: now });
  if (hist.length > 12) hist.shift();
  msgHistory.set(userId, hist);
  if (hist.filter(m => now - m.timestamp < FLOOD_WIN).length >= FLOOD_LIMIT) {
    const until = now + FLOOD_MUTE * 60_000;
    mutedUsers.set(userId, { until });
    msgHistory.set(userId, []);
    saveMuteFn(until);
    return { detected: true, muteMinutes: FLOOD_MUTE };
  }
  return { detected: false };
}

// ── 連投検知（同一メッセージ繰り返し）────────────────────────────────────────
const lastMessages = new Map(); // userId -> { message, count }
const DUP_LIMIT    = 3;
const DUP_MUTE     = 10; // 分

function checkDuplicate(userId, message, mutedUsers, saveMuteFn) {
  const last = lastMessages.get(userId);
  if (last && last.message === message) {
    last.count++;
    if (last.count >= DUP_LIMIT) {
      const until = Date.now() + DUP_MUTE * 60_000;
      mutedUsers.set(userId, { until });
      lastMessages.delete(userId);
      saveMuteFn(until);
      return { detected: true, muteMinutes: DUP_MUTE };
    }
  } else {
    lastMessages.set(userId, { message, count: 1 });
  }
  return { detected: false };
}

// ── 期限切れエントリの定期クリーンアップ（メモリリーク防止）─────────────────
setInterval(() => {
  const now = Date.now();
  for (const [ip, ts] of connLockouts)  if (now >= ts) { connLockouts.delete(ip); connAttempts.delete(ip); }
  for (const [ip, ts] of loginLockouts) if (now >= ts) { loginLockouts.delete(ip); loginAttempts.delete(ip); }
}, 10 * 60_000);

module.exports = {
  isConnectionRateLimited,
  isLoginRateLimited, recordFailedLogin, clearLoginAttempts,
  isMessageRateLimited,
  checkFlood, checkDuplicate,
};
