'use strict';
function setProfileSaveStatus(message, isError = false) {
    const el = byId('profile-save-status');
    if (!el)
        return;
    el.textContent = message || '';
    el.classList.toggle('error', !!isError);
    el.classList.toggle('success', !!message && !isError);
}
function saveProfile() {
    const btn = byId('save-profile');
    const uname = byId('p-uname').value.trim();
    if (!uname) {
        setProfileSaveStatus('ユーザー名を入力してください', true);
        return;
    }
    if (uname.includes('管理者')) {
        setProfileSaveStatus('ユーザー名に「管理者」は含められません', true);
        return;
    }
    const updates = {
        color: byId('p-color').value,
        theme: byId('p-theme').value,
        statusText: byId('p-status').value,
        username: uname,
    };
    setDisabledById('save-profile', true);
    const originalText = btn.textContent;
    btn.textContent = '保存中...';
    setProfileSaveStatus('保存しています...');
    socket.emit('updateAccountProfile', updates, res => {
        setDisabledById('save-profile', false);
        btn.textContent = originalText;
        if (res?.success) {
            if (res.account.username) {
                App.myUsername = res.account.username;
                setTextById('disp-uname', App.myUsername || '');
            }
            setValueById('p-theme', res.account.theme || 'system');
            applyTheme(res.account.theme || 'system');
            setProfileSaveStatus('保存しました');
            setTimeout(() => setProfileSaveStatus(''), 1800);
        }
        else {
            const message = res?.error || '更新に失敗しました';
            setProfileSaveStatus(message, true);
            alert(message);
        }
    });
}
function logout() {
    if (!confirm('ログアウトしますか？'))
        return;
    App.intentionalDisconnect = true;
    socket.timeout(5000).emit('logout', (err, res) => {
        if (err || !res?.success) {
            App.intentionalDisconnect = false;
            alert(res?.error || err?.message || 'ログアウトに失敗しました');
            return;
        }
        localStorage.removeItem('token');
        location.reload();
    });
}
function deleteAccount() {
    const ok = confirm('本当にアカウントを削除しますか？\nこの操作は元に戻せません。');
    if (!ok)
        return;
    const btn = byId('delete-account-btn');
    if (btn)
        btn.disabled = true;
    socket.emit('deleteAccount', res => {
        if (res?.success) {
            App.intentionalDisconnect = true;
            localStorage.removeItem('token');
            location.reload();
            return;
        }
        if (btn)
            btn.disabled = false;
        alert(res?.error || 'アカウント削除に失敗しました');
    });
}
onClick('save-profile', saveProfile);
onClick('logout-btn', logout);
onClick('delete-account-btn', deleteAccount);
