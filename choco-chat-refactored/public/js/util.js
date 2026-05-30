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

function updateUserList(users, count) {
  document.getElementById('u-count').textContent = count ?? users.length;
  document.getElementById('u-names').textContent = users.length ? `(${users.join(', ')})` : '';
}

function updateTypingDisplay() {
  const list = [...App.typingMap.entries()]
    .filter(([uid]) => uid !== App.myUserId)
    .map(([, uname]) => uname);
  document.getElementById('typing').textContent = list.length ? `${list.join(', ')} が入力中…` : '';
}
