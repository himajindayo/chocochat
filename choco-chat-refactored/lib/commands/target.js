'use strict';

const TARGET_USER_RE = /^[A-Za-z0-9]{3,20}$/;

function requireOnlineTarget(session, targetId) {
  if (typeof targetId !== 'string') {
    return { success: false, error: 'ユーザーIDを入力してください' };
  }

  const normalized = targetId.trim();
  if (!TARGET_USER_RE.test(normalized)) {
    return { success: false, error: 'ユーザーIDは半角英数字3〜20文字で入力してください' };
  }

  if (!session.userSockets.has(normalized)) {
    return { success: false, error: 'そのユーザーはオンラインではありません' };
  }

  return { success: true, targetId: normalized };
}

module.exports = { requireOnlineTarget };
