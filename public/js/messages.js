'use strict';

function buildReplyPreviewHtml(replyTo) {
    if (!replyTo?.id)
        return '';
    const ref = App.messageIndex.get(replyTo.id);
    if (!ref) {
        return `<div class="reply-prev" data-reply-id="${esc(replyTo.id)}">↩ 元メッセージは利用できません</div>`;
    }
    return `<div class="reply-prev" data-reply-id="${esc(replyTo.id)}">${esc(formatReplyPreview(ref.senderUsername, ref.senderId, ref.message, 80))}</div>`;
}

function settleChatScroll(wasAtBottom) {
    const box = byId('chat-box');
    if (!box)
        return;
    if (wasAtBottom) {
        box.scrollTop = box.scrollHeight;
    }
    else {
        byId('new-msg-notice')?.classList.remove('hidden');
    }
}

function appendToChat(el) {
    const box = byId('chat-box');
    if (!box)
        return;
    const wasAtBottom = App.isAtBottom;
    box.appendChild(el);
    settleChatScroll(wasAtBottom);
}

function insertTimelineItem(el) {
    const box = byId('chat-box');
    const ts = Number(el.dataset.ts || 0);
    if (!box || !ts)
        return appendToChat(el);
    const before = [...box.children].find(child => {
        const childTs = Number(child.dataset?.ts || 0);
        return childTs && childTs > ts;
    });
    const wasAtBottom = App.isAtBottom;
    if (before)
        box.insertBefore(el, before);
    else
        box.appendChild(el);
    settleChatScroll(wasAtBottom);
}

function buildActionButton(action, label) {
    return `<button class="act" data-action="${action}">${esc(label)}</button>`;
}

function buildMessageActions({ canReply, canEdit, canDelete }) {
    return [
        canReply ? buildActionButton('reply', '返信') : '',
        canEdit ? buildActionButton('edit', '編集') : '',
        canDelete ? buildActionButton('delete', '削除') : '',
    ].join('');
}

function buildMessageWrap({ className = '', dataset = {}, innerHTML = '' }) {
    const wrap = document.createElement('div');
    wrap.className = ['msg', className].filter(Boolean).join(' ');
    Object.entries(dataset).forEach(([key, value]) => {
        wrap.dataset[key] = value;
    });
    wrap.innerHTML = innerHTML;
    return wrap;
}

function buildUserMetaHtml(username, userId, status = '') {
    const parts = [];
    if (username != null && username !== '') {
        parts.push(`<span class="msg-uname">${esc(username)}</span>`);
    }
    if (userId != null && userId !== '') {
        parts.push(`<span class="msg-uid">${esc(formatUserIdSuffix(userId))}</span>`);
    }
    if (status != null && status !== '') {
        parts.push(`<span class="msg-status">${esc(status)}</span>`);
    }
    return parts.join('');
}

function addMsg(m) {
    const isMine = m.senderId === App.myUserId;
    const wrap = buildMessageWrap({
        dataset: {
            msgid: m.id || '',
            senderId: m.senderId || '',
            senderUsername: m.senderUsername || '',
            ts: String(+new Date(m.timestamp || Date.now())),
        },
        innerHTML: `${buildReplyPreviewHtml(m.replyTo)}
<div class="msg-head">
  ${buildUserMetaHtml(m.senderUsername, m.senderId, m.senderStatus)}
  <span class="msg-time">${fmtTime(m.timestamp)}</span>${m.edited ? '<span class="msg-edit">(編集済み)</span>' : ''}
</div>
<div class="msg-body">${renderMessageBody(m.message || '')}</div>
<div class="msg-actions">${buildMessageActions({ canReply: true, canEdit: isMine || App.isAdmin, canDelete: isMine || App.isAdmin })}</div>`,
    });
    rememberMessage(m);
    const unameEl = wrap.querySelector('.msg-uname');
    if (unameEl)
        unameEl.style.color = safeColor(m.color);
    insertTimelineItem(wrap);
}

function refreshReplyPreviews(message) {
    if (!message?.id)
        return;
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
    if (!force && !App.showSys)
        return;
    const el = document.createElement('div');
    el.className = 'sys-msg';
    el.textContent = text;
    appendToChat(el);
}

function canDeletePrivateMessage(pm) {
    return App.isAdmin || pm.fromId === App.myUserId || pm.toId === App.myUserId;
}

function buildPmWrap(pm, { label, className }) {
    const canDelete = canDeletePrivateMessage(pm);
    return buildMessageWrap({
        className: ['pm-wrap', className].filter(Boolean).join(' '),
        dataset: {
            pmid: pm.id || '',
            ts: String(+new Date(pm.timestamp || Date.now())),
        },
        innerHTML: `
    <div class="msg-head pm-head">
      <span class="msg-status pm-mon-label">${label}</span>
      ${buildUserMetaHtml(pm.fromUsername, pm.fromId)}
      <span class="pm-arrow" aria-hidden="true">→</span>
      ${buildUserMetaHtml(pm.toUsername, pm.toId)}
      <span class="msg-time">${fmtTime(pm.timestamp)}</span>
    </div>
    <div class="msg-body">${renderMessageBody(pm.message || '')}</div>
    ${canDelete ? `<div class="msg-actions">${buildActionButton('delete', '削除')}</div>` : ''}`,
    });
}

function addPm(pm) {
    insertTimelineItem(buildPmWrap(pm, { label: '🔒 PM' }));
}

function addPmMonitor(pm) {
    insertTimelineItem(buildPmWrap(pm, { label: '👁️ PM監視', className: 'pm-monitor' }));
}

function openEditModal(messageId, bodyText) {
    App.editingId = messageId;
    setValueById('edit-input', bodyText);
    toggleHiddenById('edit-modal', false);
}

function closeEditModal() {
    toggleHiddenById('edit-modal', true);
    App.editingId = null;
}

function handleDeleteAction(wrap) {
    if (!confirm('削除しますか？'))
        return;
    if (wrap.dataset.pmid) {
        socket.emit('deletePrivateMessage', { id: wrap.dataset.pmid }, res => {
            if (res?.success)
                wrap.remove();
            else
                alert(res?.error || '削除に失敗しました');
        });
        return;
    }
    socket.emit('deleteMessage', { id: wrap.dataset.msgid }, res => {
        if (res?.success) {
            forgetMessage(wrap.dataset.msgid);
        }
        else {
            alert(res?.error || '削除に失敗しました');
        }
    });
}

function handleChatBoxClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn)
        return;
    const action = btn.dataset.action;
    const wrap = btn.closest('[data-msgid], [data-pmid]');
    if (!wrap)
        return;

    if (action === 'reply' && wrap.dataset.msgid) {
        const source = App.messageIndex.get(wrap.dataset.msgid);
        setReply(wrap.dataset.msgid, wrap.dataset.senderId || '', wrap.dataset.senderUsername || '', source?.message || '');
        return;
    }
    if (action === 'edit' && wrap.dataset.msgid) {
        const body = wrap.querySelector('.msg-body');
        openEditModal(wrap.dataset.msgid, body ? body.innerText : '');
        return;
    }
    if (action === 'delete') {
        handleDeleteAction(wrap);
    }
}

onClick('chat-box', handleChatBoxClick);
const chatBoxEl = byId('chat-box');
if (chatBoxEl) {
    chatBoxEl.addEventListener('scroll', () => {
        App.isAtBottom = chatBoxEl.scrollHeight - chatBoxEl.scrollTop - chatBoxEl.clientHeight < 100;
        if (App.isAtBottom)
            byId('new-msg-notice')?.classList.add('hidden');
    });
}
onClick('save-edit', () => {
    if (!App.editingId)
        return;
    const msg = byId('edit-input').value.trim();
    if (!msg)
        return;
    socket.emit('editMessage', { id: App.editingId, message: msg }, res => {
        if (res?.success) {
            closeEditModal();
        }
        else {
            alert(res?.error || '編集に失敗しました');
        }
    });
});
onClick('cancel-edit', closeEditModal);
const newMsgNotice = byId('new-msg-notice');
if (newMsgNotice) {
    newMsgNotice.onclick = () => {
        const box = byId('chat-box');
        if (!box)
            return;
        box.scrollTop = box.scrollHeight;
        App.isAtBottom = true;
        newMsgNotice.classList.add('hidden');
    };
}
