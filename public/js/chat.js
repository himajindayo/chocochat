'use strict';

// ── 返信 ──────────────────────────────────────────────────────────────────────
function setReply(id, senderUsername, message) {
  App.replyTo = { id, senderUsername, message };
  document.getElementById('reply-text').textContent = `↩ ${senderUsername}: ${message.slice(0, 60)}`;
  document.getElementById('reply-bar').classList.remove('hidden');
  document.getElementById('msg-input').focus();
}

function cancelReply() {
  App.replyTo = null;
  document.getElementById('reply-bar').classList.add('hidden');
}
document.getElementById('cancel-reply').onclick = cancelReply;

// ── メッセージ送信 ────────────────────────────────────────────────────────────
function sendMsg() {
  if (App.sending) return;
  const msg = document.getElementById('msg-input').value.trim();
  if (!msg) return;
  App.sending = true;
  document.getElementById('send-btn').disabled = true;
  socket.emit('sendMessage', {
    message: msg,
    replyTo: App.replyTo,
    color:   document.getElementById('p-color').value,
  }, res => {
    App.sending = false;
    document.getElementById('send-btn').disabled = false;
    if (res?.success) {
      document.getElementById('msg-input').value    = '';
      document.getElementById('char-count').textContent = '0';
      cancelReply();
      socket.emit('stopTyping');
    } else {
      alert(res?.error || '送信に失敗しました');
    }
  });
}

document.getElementById('send-btn').onclick = sendMsg;
document.getElementById('omi-btn').onclick  = () => {
  document.getElementById('msg-input').value = '/omikuji';
  sendMsg();
};
document.getElementById('msg-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
});
document.getElementById('msg-input').addEventListener('input', () => {
  const len = document.getElementById('msg-input').value.length;
  const cc  = document.getElementById('char-count');
  cc.textContent = len;
  cc.classList.toggle('over', len > 180);
  socket.emit('typing');
  clearTimeout(App.typingTimer);
  App.typingTimer = setTimeout(() => socket.emit('stopTyping'), 2000);
});

// ── UI トグル ─────────────────────────────────────────────────────────────────
document.getElementById('sys-toggle').onclick = () => {
  App.showSys = !App.showSys;
  document.getElementById('sys-toggle').textContent = App.showSys ? '入退室 ON' : '入退室 OFF';
};

document.getElementById('logout-btn').onclick = () => {
  if (!confirm('ログアウトしますか？')) return;
  socket.emit('logout', () => { localStorage.removeItem('token'); location.reload(); });
};

function setProfileSaveStatus(message, isError = false) {
  const el = document.getElementById('profile-save-status');
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('error', !!isError);
  el.classList.toggle('success', !!message && !isError);
}

// ── プロフィール更新 ──────────────────────────────────────────────────────────
document.getElementById('save-profile').onclick = () => {
  const btn = document.getElementById('save-profile');
  const uname = document.getElementById('p-uname').value.trim();
  if (uname.includes('管理者')) {
    addSys('ユーザー名に「管理者」は含められません');
    setProfileSaveStatus('ユーザー名を確認してください', true);
    return;
  }
  const updates = {
    color:      document.getElementById('p-color').value,
    theme:      document.getElementById('p-theme').value,
    statusText: document.getElementById('p-status').value,
  };
  if (uname) updates.username = uname;

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = '保存中...';
  setProfileSaveStatus('保存しています...');

  socket.emit('updateAccountProfile', updates, res => {
    btn.disabled = false;
    btn.textContent = originalText;

    if (res?.success) {
      if (res.account.username) {
        App.myUsername = res.account.username;
        document.getElementById('disp-uname').textContent = `(${App.myUsername})`;
      }
      document.getElementById('p-theme').value = res.account.theme || 'system';
      applyTheme(res.account.theme || 'system');
      setProfileSaveStatus('保存しました');
      setTimeout(() => setProfileSaveStatus(''), 1800);
    } else {
      const message = res?.error || '更新に失敗しました';
      setProfileSaveStatus(message, true);
      alert(message);
    }
  });
};
