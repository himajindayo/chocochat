'use strict';

// ── チャットボックスへの追記 ──────────────────────────────────────────────────
function appendToChat(el) {
  const box = document.getElementById('chat-box');
  const was = App.isAtBottom;
  box.appendChild(el);
  if (was) {
    box.scrollTop = box.scrollHeight;
  } else {
    document.getElementById('new-msg-notice').classList.remove('hidden');
  }
}

// ── メッセージ描画 ─────────────────────────────────────────────────────────────
function addMsg(m) {
  const wrap = document.createElement('div');
  wrap.className              = 'msg';
  wrap.dataset.msgid          = m.id            || '';
  wrap.dataset.senderUsername = m.senderUsername || '';
  wrap.dataset.msgtext        = (m.message || '').slice(0, 80);

  const isMine = m.senderId === App.myUserId;

  const replyHtml = m.replyTo
    ? `<div class="reply-prev">↩ <b>${esc(m.replyTo.senderUsername)}</b>: ${esc((m.replyTo.message || '').slice(0, 80))}</div>`
    : '';

  const editBadge = m.edited ? '<span class="msg-edit">(編集済み)</span>' : '';
  const statusHtml = m.senderStatus ? `<span class="msg-status">${esc(m.senderStatus)}</span>` : '';
  const bodyHtml  = linkify(esc(m.message || '')).replace(/\n/g, '<br>');
  const repBtn    = `<button class="act" data-action="reply">返信</button>`;
  const editBtn   = (isMine || App.isAdmin) ? `<button class="act" data-action="edit">編集</button>`   : '';
  const delBtn    = (isMine || App.isAdmin) ? `<button class="act" data-action="delete">削除</button>` : '';

  wrap.innerHTML = `${replyHtml}
<div class="msg-head">
  <span class="msg-uname">${esc(m.senderUsername || '')}</span>
  <span class="msg-uid">(${esc(m.senderId || '')})</span>${statusHtml}
  <span class="msg-time">${fmtTime(m.timestamp)}</span>${editBadge}
</div>
<div class="msg-body">${bodyHtml}</div>
<div class="msg-actions">${repBtn}${editBtn}${delBtn}</div>`;

  wrap.querySelector('.msg-uname').style.color = safeColor(m.color);
  appendToChat(wrap);
}

function addSys(text) {
  if (!App.showSys) return;
  const el = document.createElement('div');
  el.className   = 'sys-msg';
  el.textContent = text;
  appendToChat(el);
}

function addPm(pm) {
  const wrap = document.createElement('div');
  wrap.className    = 'pm-wrap';
  wrap.dataset.pmid = pm.id;
  const dir = pm.fromId === App.myUserId ? `→ ${esc(pm.toId)}` : `← ${esc(pm.fromId)}`;
  wrap.innerHTML =
    `<div class="pm-label">🔒 PM (${dir})</div>` +
    `<div class="msg-body">${linkify(esc(pm.message))}</div>` +
    `<div class="msg-actions"><button class="act" data-action="dpm">削除</button></div>`;
  appendToChat(wrap);
}

function addPmMonitor(pm) {
  const wrap = document.createElement('div');
  wrap.className = 'pm-monitor';
  wrap.innerHTML =
    `<div class="pm-mon-label">👁 PM: ${esc(pm.fromId)} → ${esc(pm.toId)}</div>` +
    `<div class="msg-body">${esc(pm.message)}</div>` +
    `<div class="msg-time">${fmtTime(pm.timestamp)}</div>`;
  appendToChat(wrap);
}

// ── チャットボックスのクリックデリゲーション ──────────────────────────────────
document.getElementById('chat-box').addEventListener('click', e => {
  const btn    = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const wrap   = btn.closest('[data-msgid]');
  const pmWrap = btn.closest('[data-pmid]');

  if (action === 'reply' && wrap) {
    setReply(wrap.dataset.msgid, wrap.dataset.senderUsername || '', wrap.dataset.msgtext || '');
  }
  if (action === 'edit' && wrap) {
    const body = wrap.querySelector('.msg-body');
    App.editingId = wrap.dataset.msgid;
    document.getElementById('edit-input').value = body ? body.innerText : '';
    document.getElementById('edit-modal').classList.remove('hidden');
  }
  if (action === 'delete' && wrap) {
    if (!confirm('削除しますか？')) return;
    socket.emit('deleteMessage', { id: wrap.dataset.msgid }, res => {
      if (!res?.success) alert(res?.error || '削除に失敗しました');
    });
  }
  if (action === 'dpm' && pmWrap) {
    if (!confirm('削除しますか？')) return;
    socket.emit('deletePrivateMessage', { id: pmWrap.dataset.pmid }, res => {
      if (!res?.success) alert(res?.error || '削除に失敗しました');
    });
  }
});

// ── 編集モーダル ──────────────────────────────────────────────────────────────
document.getElementById('save-edit').onclick = () => {
  if (!App.editingId) return;
  const msg = document.getElementById('edit-input').value.trim();
  if (!msg) return;
  socket.emit('editMessage', { id: App.editingId, message: msg }, res => {
    if (res?.success) {
      document.getElementById('edit-modal').classList.add('hidden');
      App.editingId = null;
    } else {
      alert(res?.error || '編集に失敗しました');
    }
  });
};
document.getElementById('cancel-edit').onclick = () => {
  document.getElementById('edit-modal').classList.add('hidden');
  App.editingId = null;
};

// ── スクロール管理 ────────────────────────────────────────────────────────────
document.getElementById('chat-box').addEventListener('scroll', () => {
  const box      = document.getElementById('chat-box');
  App.isAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 100;
  if (App.isAtBottom) document.getElementById('new-msg-notice').classList.add('hidden');
});
document.getElementById('new-msg-notice').onclick = () => {
  const box      = document.getElementById('chat-box');
  box.scrollTop  = box.scrollHeight;
  App.isAtBottom = true;
  document.getElementById('new-msg-notice').classList.add('hidden');
};
