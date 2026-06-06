'use strict';

function buildReplyPreviewHtml(replyTo) {
  if (!replyTo?.id) return '';
  const ref = App.messageIndex.get(replyTo.id);
  if (!ref) {
    return `<div class="reply-prev" data-reply-id="${esc(replyTo.id)}">↩ 元メッセージは利用できません</div>`;
  }
  const preview = formatReplyPreview(ref.senderUsername, ref.senderId, ref.message, 80);
  return `<div class="reply-prev" data-reply-id="${esc(replyTo.id)}">${esc(preview)}</div>`;
}

function settleChatScroll(wasAtBottom) {
  const box = byId('chat-box');
  if (!box) return;
  if (wasAtBottom) {
    box.scrollTop = box.scrollHeight;
  } else {
    byId('new-msg-notice')?.classList.remove('hidden');
  }
}

function appendToChat(el) {
  const box = byId('chat-box');
  if (!box) return;
  const wasAtBottom = App.isAtBottom;
  box.appendChild(el);
  settleChatScroll(wasAtBottom);
}

function insertTimelineItem(el) {
  const box = byId('chat-box');
  const ts = Number(el.dataset.ts || 0);
  if (!box || !ts) return appendToChat(el);

  const before = [...box.children].find(child => {
    const childTs = Number(child.dataset?.ts || 0);
    return childTs && childTs > ts;
  });

  const wasAtBottom = App.isAtBottom;
  if (before) box.insertBefore(el, before);
  else box.appendChild(el);

  settleChatScroll(wasAtBottom);
}

function addMsg(m) {
  const wrap = document.createElement('div');
  wrap.className = 'msg';
  wrap.dataset.msgid = m.id || '';
  wrap.dataset.senderId = m.senderId || '';
  wrap.dataset.senderUsername = m.senderUsername || '';
  wrap.dataset.ts = String(+new Date(m.timestamp || Date.now()));

  const isMine = m.senderId === App.myUserId;
  const replyHtml = buildReplyPreviewHtml(m.replyTo);
  const editBadge = m.edited ? '<span class="msg-edit">(編集済み)</span>' : '';
  const statusHtml = m.senderStatus ? `<span class="msg-status">${esc(m.senderStatus)}</span>` : '';
  const bodyHtml = renderMessageBody(m.message || '');
  const repBtn = `<button class="act" data-action="reply">返信</button>`;
  const editBtn = (isMine || App.isAdmin) ? `<button class="act" data-action="edit">編集</button>` : '';
  const delBtn = (isMine || App.isAdmin) ? `<button class="act" data-action="delete">削除</button>` : '';

  wrap.innerHTML = `${replyHtml}
<div class="msg-head">
  <span class="msg-uname">${esc(m.senderUsername || '')}</span>
  <span class="msg-uid">(${esc(m.senderId || '')})</span>${statusHtml}
  <span class="msg-time">${fmtTime(m.timestamp)}</span>${editBadge}
</div>
<div class="msg-body">${bodyHtml}</div>
<div class="msg-actions">${repBtn}${editBtn}${delBtn}</div>`;

  rememberMessage(m);
  const unameEl = wrap.querySelector('.msg-uname');
  if (unameEl) unameEl.style.color = safeColor(m.color);
  insertTimelineItem(wrap);
}

function refreshReplyPreviews(message) {
  if (!message?.id) return;
  const selector = `.reply-prev[data-reply-id="${CSS.escape(message.id)}"]`;
  const ref = App.messageIndex.get(message.id) || {
    senderUsername: message.senderUsername || '',
    senderId: message.senderId || '',
    message: message.message || '',
  };
  const preview = formatReplyPreview(ref.senderUsername, ref.senderId, ref.message, 80);
  document.querySelectorAll(selector).forEach(previewEl => {
    previewEl.textContent = preview;
  });
}

function addSys(text, force = false) {
  if (!force && !App.showSys) return;
  const el = document.createElement('div');
  el.className = 'sys-msg';
  el.textContent = text;
  appendToChat(el);
}

function canDeletePrivateMessage(pm) {
  if (App.isAdmin) return true;
  return pm.fromId === App.myUserId || pm.toId === App.myUserId;
}

function buildPmWrap(pm, { label, className }) {
  const wrap = document.createElement('div');
  wrap.className = ['msg', 'pm-wrap', className].filter(Boolean).join(' ');
  wrap.dataset.pmid = pm.id || '';
  wrap.dataset.ts = String(+new Date(pm.timestamp || Date.now()));

  const fromName = esc(pm.fromUsername || pm.fromId || '');
  const fromId = esc(pm.fromId || '');
  const toName = esc(pm.toUsername || pm.toId || '');
  const toId = esc(pm.toId || '');
  const delBtn = canDeletePrivateMessage(pm) ? '<button class="act" data-action="delete">削除</button>' : '';

  wrap.innerHTML = `
    <div class="msg-head pm-head">
      <span class="msg-status pm-mon-label">${label}</span>
      <span class="msg-uname">${fromName}</span>
      <span class="msg-uid">(${fromId})</span>
      <span class="pm-arrow" aria-hidden="true">→</span>
      <span class="msg-uname">${toName}</span>
      <span class="msg-uid">(${toId})</span>
      <span class="msg-time">${fmtTime(pm.timestamp)}</span>
    </div>
    <div class="msg-body">${renderMessageBody(pm.message || '')}</div>
    ${delBtn ? `<div class="msg-actions">${delBtn}</div>` : ''}`;
  return wrap;
}

function addPm(pm) {
  insertTimelineItem(buildPmWrap(pm, { label: '🔒 PM' }));
}

function addPmMonitor(pm) {
  insertTimelineItem(buildPmWrap(pm, { label: '👁️ PM監視', className: 'pm-monitor' }));
}

byId('chat-box').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const wrap = btn.closest('[data-msgid], [data-pmid]');
  if (!wrap) return;

  if (action === 'reply' && wrap.dataset.msgid) {
    const source = App.messageIndex.get(wrap.dataset.msgid);
    setReply(
      wrap.dataset.msgid,
      wrap.dataset.senderId || '',
      wrap.dataset.senderUsername || '',
      source?.message || ''
    );
  }
  if (action === 'edit' && wrap.dataset.msgid) {
    const body = wrap.querySelector('.msg-body');
    App.editingId = wrap.dataset.msgid;
    setValueById('edit-input', body ? body.innerText : '');
    byId('edit-modal').classList.remove('hidden');
  }
  if (action === 'delete') {
    if (!confirm('削除しますか？')) return;
    if (wrap.dataset.pmid) {
      socket.emit('deletePrivateMessage', { id: wrap.dataset.pmid }, res => {
        if (res?.success) wrap.remove();
        else alert(res?.error || '削除に失敗しました');
      });
      return;
    }
    socket.emit('deleteMessage', { id: wrap.dataset.msgid }, res => {
      if (res?.success) forgetMessage(wrap.dataset.msgid);
      else alert(res?.error || '削除に失敗しました');
    });
  }
});

byId('save-edit').onclick = () => {
  if (!App.editingId) return;
  const msg = byId('edit-input').value.trim();
  if (!msg) return;
  socket.emit('editMessage', { id: App.editingId, message: msg }, res => {
    if (res?.success) {
      byId('edit-modal').classList.add('hidden');
      App.editingId = null;
    } else {
      alert(res?.error || '編集に失敗しました');
    }
  });
};
byId('cancel-edit').onclick = () => {
  byId('edit-modal').classList.add('hidden');
  App.editingId = null;
};

byId('chat-box').addEventListener('scroll', () => {
  const box = byId('chat-box');
  if (!box) return;
  App.isAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 100;
  if (App.isAtBottom) byId('new-msg-notice')?.classList.add('hidden');
});

const newMsgNotice = byId('new-msg-notice');
if (newMsgNotice) {
  newMsgNotice.onclick = () => {
    const box = byId('chat-box');
    if (!box) return;
    box.scrollTop = box.scrollHeight;
    App.isAtBottom = true;
    newMsgNotice.classList.add('hidden');
  };
}
