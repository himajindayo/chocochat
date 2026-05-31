'use strict';

function renderCommandGrid() {
  const grid = document.getElementById('command-grid');
  if (!grid) return;
  const cards = (window.CommandHelp?.getCommandCards?.({ isAdmin: App.isAdmin, isSuperAdmin: App.isSuperAdmin }) || []);
  grid.innerHTML = cards.map(card => `
      <div class="command-item">
        <div class="command-name">${esc(card.name)}</div>
        <div class="command-desc">${esc(card.desc)}</div>
        ${card.example ? `<div class="command-example">${esc(card.example)}</div>` : ''}
      </div>
    `).join('');
}

/**
 * ログイン成功後にチャット画面へ遷移し、初期状態を描画する。
 * auth.js の onLoginResp から呼ばれる。
 */
function enterChat(res) {
  const acc = res.account;
  App.myUserId   = acc.userId;
  App.myUsername = acc.username;
  App.isAdmin     = acc.isAdmin || false;
  App.isSuperAdmin = acc.userId === 'ADMIN';

  localStorage.setItem('token', acc.token);

  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('chat-section').classList.remove('hidden');

  document.getElementById('disp-uid').textContent   = acc.userId;
  document.getElementById('disp-uname').textContent = `(${acc.username})`;
  App.userStatuses.clear();
  if (acc.statusText) App.userStatuses.set(acc.userId, acc.statusText);

  if (App.isAdmin) {
    document.getElementById('admin-badge').classList.remove('hidden');
  }

  applyTheme(acc.theme || 'system');
  renderCommandGrid();
  document.getElementById('p-color').value  = acc.color      || '#000000';
  document.getElementById('p-status').value = acc.statusText || '';
  document.getElementById('p-uname').value  = acc.username   || '';
  document.getElementById('p-theme').value  = acc.theme      || 'system';

  // 履歴描画
  document.getElementById('chat-box').innerHTML = '';
  if (App.isAdmin && res.allPrivateMessages?.length) {
    const all = [
      ...(res.history || []).map(m  => ({ t: 'msg',    d: m,  ts: +new Date(m.timestamp) })),
      ...res.allPrivateMessages.map(pm => ({ t: 'pm_mon', d: pm, ts: +new Date(pm.timestamp) })),
    ].sort((a, b) => a.ts - b.ts);
    all.forEach(x => x.t === 'msg' ? addMsg(x.d) : addPmMonitor(x.d));
  } else {
    (res.history || []).forEach(addMsg);
    (res.privateMessages || []).forEach(addPm);
  }

  updateUserList(res.users || [], res.userCount || 0, res.userStatuses);

  const box = document.getElementById('chat-box');
  box.scrollTop  = box.scrollHeight;
  App.isAtBottom = true;
  document.getElementById('msg-input').focus();
}
