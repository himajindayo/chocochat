'use strict';

const App = {
  myUserId:    null,
  myUsername:  null,
  isAdmin:     false,
  isSuperAdmin: false,
  replyTo:     null,
  editingId:   null,
  showSys:     true,
  isAtBottom:  true,
  sending:     false,
  themeMode:   'system',
  typingMap:   new Map(),
  typingTimer: null,
  userStatuses: new Map(),
  onlineUsers:  [],
  onlineCount:  0,
  onlineSignature: '',
};

/** HTML エスケープ */
function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}

/** 正当なカラーコードのみ通す */
function safeColor(c) {
  return /^(?:#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6})$/.test(c) ? c : '#000000';
}

/** エスケープ済み文字列内の URL をリンク化 */
function linkify(escaped) {
  return escaped.replace(
    /(https?:\/\/[^\s<>"{}|^`[\]&]+(?:&amp;[^\s<>"{}|^`[\]&]*)*)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

/** タイムスタンプを "YYYY/MM/DD HH:mm" 形式にフォーマット */
function fmtTime(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function normalizeOnlineUser(u) {
  if (u && typeof u === 'object') {
    const userId = String(u.userId || '').trim();
    if (!userId) return null;
    return { userId, username: String(u.username || userId).trim() || userId };
  }
  const userId = String(u || '').trim();
  return userId ? { userId, username: userId } : null;
}

function updateUserList(users, count, statuses) {
  const list = Array.isArray(users) ? users : [];
  const normalized = list.map(normalizeOnlineUser).filter(Boolean);
  const onlineCount = typeof count === 'number' ? count : normalized.length;
  const statusMap = statuses && typeof statuses === 'object' ? statuses : {};
  const statusEntries = Object.entries(statusMap).sort(([a], [b]) => a.localeCompare(b));
  const nextSignature = `${onlineCount}|${normalized.map(u => `${u.userId}:${u.username}`).join(',')}|${statusEntries.map(([k, v]) => `${k}:${v}`).join(',')}`;
  if (nextSignature === App.onlineSignature) return;

  App.onlineUsers = normalized;
  App.onlineCount = onlineCount;
  App.onlineSignature = nextSignature;
  App.userStatuses = new Map(statusEntries);
  document.getElementById('u-count').textContent = App.onlineCount;
  document.getElementById('u-names').textContent = App.onlineUsers.length
    ? App.onlineUsers.map(u => `${u.username}(${u.userId})`).join(', ')
    : '';

function updateTypingDisplay() {
  const list = [...App.typingMap.entries()]
    .filter(([uid]) => uid !== App.myUserId)
    .map(([, uname]) => uname);
  document.getElementById('typing').textContent = list.length ? `${list.join(', ')} が入力中…` : '';
}
