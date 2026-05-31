'use strict';

function setAuthMsg(msg, isError = true) {
  const el = byId('auth-msg');
  el.textContent = msg;
  el.className = msg ? (isError ? 'error' : 'success') : '';
}

function switchForm(f) {
  byId('login-form').classList.toggle('active', f === 'login');
  byId('signup-form').classList.toggle('active', f === 'signup');
  setAuthMsg('');
  if (f === 'login') setTimeout(() => byId('l-uid')?.focus(), 0);
  if (f === 'signup') setTimeout(() => byId('s-uid')?.focus(), 0);
}

byId('to-signup').onclick = () => switchForm('signup');
byId('to-login').onclick = () => switchForm('login');
setTimeout(() => byId('l-uid')?.focus(), 0);

function doLogin() {
  const userId = byId('l-uid').value.trim();
  const password = byId('l-pass').value;
  if (!userId) return setAuthMsg('ユーザーIDを入力してください');
  if (!password) return setAuthMsg('パスワードを入力してください');
  socket.emit('accountLogin', { userId, password }, onLoginResp);
}

byId('login-btn').onclick = doLogin;
byId('l-uid').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
byId('l-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

byId('signup-btn').onclick = () => {
  const userId = byId('s-uid').value.trim();
  const username = byId('s-uname').value.trim();
  const password = byId('s-pass').value;
  const confirm = byId('s-pass2').value;

  if (!/^[A-Za-z0-9]{4,20}$/.test(userId)) return setAuthMsg('ユーザーIDは半角英数字4〜20文字で入力してください');
  if (!username || username.length > 20) return setAuthMsg('ユーザー名を入力してください（20文字以内）');
  if (username.includes('管理者')) return setAuthMsg('ユーザー名に「管理者」は含められません');
  if (password.length < 4) return setAuthMsg('パスワードは4文字以上で入力してください');
  if (password !== confirm) return setAuthMsg('パスワードが一致しません');

  socket.emit('signup', { userId, username, password }, res => {
    if (res?.success) {
      setAuthMsg(`登録完了 (ID: ${esc(res.account.userId)})`, false);
      byId('l-uid').value = userId;
      setTimeout(() => switchForm('login'), 1600);
    } else {
      setAuthMsg(res?.error || 'アカウント作成に失敗しました');
    }
  });
};

function onLoginResp(res) {
  if (res?.success) enterChat(res);
  else {
    localStorage.removeItem('token');
    setAuthMsg(res?.error || 'ログインに失敗しました');
  }
}
