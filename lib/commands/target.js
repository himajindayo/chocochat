'use strict';

const { validateUserId } = require('../validate');

function requireOnlineTarget(session, targetId) {
  if (typeof targetId !== 'string') {
    return { success: false, error: 'ユーザーIDを入力してください' };
  }

  const normalized = targetId.trim();
  const err = validateUserId(normalized);
  if (err) {
    return { success: false, error: err };
  }

  if (!session.userSockets.has(normalized)) {
    return { success: false, error: 'そのユーザーはオンラインではありません' };
  }

  return { success: true, targetId: normalized };
}

module.exports = { requireOnlineTarget };
