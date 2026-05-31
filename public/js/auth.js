'use strict';

function setAuthMsg(msg, isError = true) {
  const el = document.getElementById('auth-msg');
  el.textContent = msg;
  el.className   = msg ? (isError ? 'error' : 'success') : '';
}

function switchForm(f) {
  document.getElementById('login-form').classList.toggle('active',  f === 'login');
  document.getElementById('signup-form').classList.toggle('active', f === 'signup');
  setAuthMsg('');
  if (f === 'login') setTimeout(() => document.getElementById('l-uid')?.focus(), 0);
  if (f === 'signup') setTimeout(() => document.getElementById('s-uid')?.focus(), 0);
}

document.getElementById('to-signup').onclick = () => switchForm('signup');
document.getElementById('to-login').onclick  = () => switchForm('login');
setTimeout(() => document.getElementById('l-uid')?.focus(), 0);

// ── ログイン ──────────────────────────────────────────────────────────────────
function doLogin() {
  const userId   = document.getElementById('l-uid').value.trim();
  const password = document.getElementById('l-pass').value;
  if (!userId)   return setAuthMsg('ユーザーIDを入力してください');
  if (!password) return setAuthMsg('パスワードを入力してください');
  socket.emit('accountLogin', { userId, password }, onLoginResp);
}

document.getElementById('login-btn').onclick   = doLogin;
document.getElementById('l-uid').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('l-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

// ── 新規登録 ──────────────────────────────────────────────────────────────────
document.getElementById('signup-btn').onclick = () => {
  const userId   = document.getElementById('s-uid').value.trim();
  const username = document.getElementById('s-uname').value.trim();
  const password = document.getElementById('s-pass').value;
  const confirm  = document.getElementById('s-pass2').value;

  if (!/^[A-Za-z0-9]{4,20}$/.test(userId))   return setAuthMsg('ユーザーIDは半角英数字4〜20文字で入力してください');
  if (!username || username.length > 20)      return setAuthMsg('ユーザー名を入力してください（20文字以内）');
  if (username.includes('管理者'))            return setAuthMsg('ユーザー名に「管理者」は含められません');
  if (password.length < 4)                   return setAuthMsg('パスワードは4文字以上で入力してください');
  if (password !== confirm)                  return setAuthMsg('パスワードが一致しません');

  socket.emit('signup', { userId, username, password }, res => {
    if (res?.success) {
      setAuthMsg(`登録完了 (ID: ${esc(res.account.userId)})`, false);
      document.getElementById('l-uid').value = userId;
      setTimeout(() => switchForm('login'), 1600);
    } else {
      setAuthMsg(res?.error || 'アカウント作成に失敗しました');
    }
  });
};

// ── ログイン成功コールバック ───────────────────────────────────────────────────
function onLoginResp(res) {
  if (res?.success) enterChat(res);
  else { localStorage.removeItem('token'); setAuthMsg(res?.error || 'ログインに失敗しました'); }
}
