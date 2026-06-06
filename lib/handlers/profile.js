'use strict';

const validate = require('../validate');
const session = require('../session');
const { asCallback, onDbErr } = require('./shared');
const { isThemeMode, normalizeThemeMode } = require('../theme');

function registerProfileHandlers(socket, ctx) {
  const { db, io, state } = ctx;

  socket.on('updateAccountProfile', async (data, cb) => {
    cb = asCallback(cb);
    if (!ctx.requireAuth(state.currentUserId, cb)) return;

    const updates = {};
    if (data?.username !== undefined) {
      const e = validate.validateUsername(data.username);
      if (e) return cb({ success: false, error: e });
      updates.username = data.username.trim();
    }
    if (data?.color !== undefined) {
      const e = validate.validateColor(data.color);
      if (e) return cb({ success: false, error: e });
      updates.color = data.color;
    }
    if (data?.theme !== undefined) {
      if (!isThemeMode(data.theme)) {
        return cb({ success: false, error: '無効なテーマです' });
      }
      updates.theme = normalizeThemeMode(data.theme);
    }
    if (data?.statusText !== undefined) {
      const e = validate.validateStatusText(data.statusText);
      if (e) return cb({ success: false, error: e });
      updates.statusText = data.statusText.trim();
    }

    const result = await db.updateProfile(state.currentUserId, updates).catch(onDbErr);
    if (!result.success) return cb(result);

    if (updates.statusText !== undefined) {
      const status = typeof updates.statusText === 'string' ? updates.statusText : '';
      if (status.trim()) session.userStatusMap.set(state.currentUserId, status);
      else session.userStatusMap.delete(state.currentUserId);
      if (state.currentAccount) state.currentAccount.statusText = status;
    }
    if (updates.color !== undefined) {
      session.userColors.set(state.currentUserId, updates.color);
      if (state.currentAccount) state.currentAccount.color = updates.color;
    }
    if (updates.username !== undefined) {
      session.setUserName(state.currentUserId, updates.username);
      if (state.currentAccount) state.currentAccount.username = updates.username;
    }
    if (updates.theme !== undefined && state.currentAccount) state.currentAccount.theme = updates.theme;

    io.emit('userStatusUpdate', {
      userId: state.currentUserId,
      username: result.account.username,
      color: result.account.color,
      theme: result.account.theme,
      userStatuses: session.getUserStatuses(),
    });
    cb({ success: true, account: result.account });
  });
}

module.exports = { registerProfileHandlers };
