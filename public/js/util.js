'use strict';
const App = {
    myUserId: null,
    myUsername: null,
    isAdmin: false,
    isSuperAdmin: false,
    replyTo: null,
    editingId: null,
    showPresenceMessages: true,
    isAtBottom: true,
    sending: false,
    typingMap: new Map(),
    typingTimer: null,
    userStatuses: new Map(),
    onlineUsers: [],
    onlineCount: 0,
    onlineSignature: '',
    intentionalDisconnect: false,
    commandCatalog: [],
    messageIndex: new Map(),
};
const _domCache = new Map();
function byId(id) {
    if (!id)
        return null;
    if (_domCache.has(id))
        return _domCache.get(id);
    const el = document.getElementById(id);
    _domCache.set(id, el);
    return el;
}
function setTextById(id, value) {
    const el = byId(id);
    if (el)
        el.textContent = value;
    return el;
}
function setValueById(id, value) {
    const el = byId(id);
    if (el)
        el.value = value;
    return el;
}
function onClick(id, handler) {
    const el = byId(id);
    if (el)
        el.addEventListener('click', handler);
    return el;
}
function onKeydown(id, handler) {
    const el = byId(id);
    if (el)
        el.addEventListener('keydown', handler);
    return el;
}
function setDisabledById(id, disabled) {
    const el = byId(id);
    if (el)
        el.disabled = !!disabled;
    return el;
}
function toggleHiddenById(id, hidden) {
    const el = byId(id);
    if (el)
        el.classList.toggle('hidden', !!hidden);
    return el;
}

function syncPresenceToggleButton() {
    const el = byId('sys-toggle');
    if (el)
        el.textContent = App.showPresenceMessages ? '入退室 ON' : '入退室 OFF';
}
function esc(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
}
function normalizeText(value) {
    return String(value ?? '').trim();
}
function safeColor(c) {
    return /^(?:#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6})$/.test(c) ? c : '#000000';
}
function linkify(escaped) {
    return escaped.replace(/(https?:\/\/[^\s<>"{}|^`[\]&]+(?:&amp;[^\s<>"{}|^`[\]&]*)*)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}
function renderMessageBody(message) {
    return linkify(esc(message ?? '')).replace(/\n/g, '<br>');
}
function fmtTime(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function formatUserLabel(username, userId) {
    const name = normalizeText(username);
    const uid = normalizeText(userId);
    if (name && uid)
        return `${name} (${uid})`;
    return name || uid;
}
function formatUserIdSuffix(userId) {
    const uid = normalizeText(userId);
    return uid ? ` (${uid})` : '';
}
function formatReplyPreview(senderUsername, senderId, message, limit = 60) {
    const name = normalizeText(senderUsername);
    const uid = normalizeText(senderId);
    const body = String(message ?? '').slice(0, limit);
    return `↩ ${formatUserLabel(name, uid)}: ${body}`;
}
function normalizeOnlineUser(u) {
    const userId = normalizeText(u?.userId);
    if (!userId)
        return null;
    const username = normalizeText(u?.username || userId);
    return { userId, username: username || userId };
}
function updateUserList(users, statuses) {
    const list = Array.isArray(users) ? users : [];
    const normalized = list.map(normalizeOnlineUser).filter(Boolean);
    const onlineCount = normalized.length;
    const statusMap = statuses && typeof statuses === 'object' ? statuses : {};
    const statusEntries = Object.entries(statusMap).sort(([a], [b]) => a.localeCompare(b));
    const nextSignature = `${onlineCount}|${normalized.map(u => `${u.userId}:${u.username}`).join(',')}|${statusEntries.map(([k, v]) => `${k}:${v}`).join(',')}`;
    if (nextSignature === App.onlineSignature)
        return;
    App.onlineUsers = normalized;
    App.onlineCount = onlineCount;
    App.onlineSignature = nextSignature;
    App.userStatuses = new Map(statusEntries);
    setTextById('u-count', App.onlineCount);
    setTextById('u-names', App.onlineUsers.length
        ? App.onlineUsers.map(u => formatUserLabel(u.username, u.userId)).join(', ')
        : '');
}
function syncOnlineUser(userId, username) {
    const targetId = String(userId || '').trim();
    if (!targetId)
        return false;
    const targetName = String(username || '').trim();
    let changed = false;
    App.onlineUsers = App.onlineUsers.map(user => {
        if (user.userId !== targetId)
            return user;
        changed = true;
        return { ...user, username: targetName || user.username };
    });
    if (changed)
        App.onlineSignature = '';
    return changed;
}
function updateTypingDisplay() {
    const typingUsers = [...App.typingMap.entries()]
        .filter(([uid]) => uid !== App.myUserId)
        .map(([userId, username]) => ({
            userId: normalizeText(userId),
            username: normalizeText(username),
        }))
        .filter(user => user.userId || user.username);

    if (!typingUsers.length) {
        setTextById('typing', '');
        return;
    }

    const labels = typingUsers.map(({ userId, username }) => {
        const name = username || userId || 'unknown';
        return formatUserLabel(name, userId) || 'unknown';
    });

    const text = labels.length <= 2
        ? `${labels.join('、')} が入力中…`
        : `${labels.slice(0, 2).join('、')} など${labels.length}人が入力中…`;

    setTextById('typing', text);
}
function rememberMessage(message) {
    if (!message || !message.id)
        return;
    App.messageIndex.set(message.id, {
        id: message.id,
        senderId: message.senderId || '',
        senderUsername: message.senderUsername || '',
        message: message.message || '',
    });
}
function forgetMessage(messageId) {
    if (!messageId)
        return;
    App.messageIndex.delete(messageId);
}
function clearMessageIndex() {
    App.messageIndex.clear();
}
