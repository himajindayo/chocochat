'use strict';

const auth = require('../auth');
const spam = require('../spam');
const validate = require('../validate');
const { asCallback, onDbErr } = require('./shared');

function setLoggedInState(state, account, token) {
  state.currentUserId = account.userId;
  state.currentToken = token;
  state.currentAccount = account;
}

function registerAccountHandlers(socket, ctx) {
  const { db, session, state, clientIp } = ctx;

  socket.on('signup', async (data, cb) => {
    cb = asCallback(cb);

    const lock = spam.isSignupRateLimited(clientIp);
    if (lock.limited) {
      return cb({
        success: false,
        error: `新規登録の回数制限を超過しました。${lock.remaining}秒後に再試行してください。`,
      });
    }

    const access = await ctx.assertLoginAccess(db, clientIp);
    if (!access.success) return cb(access);

    const userId = typeof data?.userId === 'string' ? data.userId.trim() : '';
    const username = typeof data?.username === 'string' ? data.username.trim() : '';
    const password = typeof data?.password === 'string' ? data.password : '';
    const err = validate.validateUserId(userId)
      ?? validate.validateUsername(username)
      ?? validate.validatePassword(password);
    if (err) {
      spam.recordSignupAttempt(clientIp);
      return cb({ success: false, error: err });
    }

    const result = await db.signup({ userId, username, password, ip: clientIp }).catch(onDbErr);
    if (!result.success) {
      spam.recordSignupAttempt(clientIp);
      return cb(result);
    }

    spam.clearSignupAttempts(clientIp);
    cb({ success: true, userId: result.account.userId });
  });

  socket.on('accountLogin', async (data, cb) => {
    cb = asCallback(cb);

    const lock = spam.isLoginRateLimited(clientIp);
    if (lock.limited) {
      return cb({ success: false, error: `回数制限を超過しました。${lock.remaining}秒後に再試行してください。` });
    }

    const userId = typeof data?.userId === 'string' ? data.userId.trim() : '';
    const uidErr = validate.validateUserId(userId, { allowSuperAdmin: true });
    if (uidErr) return cb({ success: false, error: uidErr });

    const access = await ctx.assertLoginAccess(db, clientIp, userId);
    if (!access.success) return cb(access);

    if (typeof data?.password !== 'string' || !data.password || data.password.length > 256) {
      return cb({ success: false, error: 'パスワードを入力してください' });
    }

    const result = await db.login({ userId, password: data.password }).catch(onDbErr);
    if (!result.success) {
      spam.recordFailedLogin(clientIp);
      return cb(result);
    }

    spam.clearLoginAttempts(clientIp);
    const payload = await auth.handleLoginSuccess(socket, result.account, clientIp, db, session);
    if (!payload.success) return cb(payload);

    payload.history = ctx.msgCache.get();
    setLoggedInState(state, result.account, result.account.token);
    cb(payload);
  });

  socket.on('tokenLogin', async (data, cb) => {
    cb = asCallback(cb);
    if (typeof data?.token !== 'string' || !ctx.TOKEN_RE.test(data.token)) {
      return cb({ success: false, error: 'セッションが無効です' });
    }

    const result = await db.loginWithToken(data.token).catch(onDbErr);
    if (!result.success) return cb(result);

    const access = await ctx.assertLoginAccess(db, clientIp, result.account.userId);
    if (!access.success) return cb(access);

    const payload = await auth.handleLoginSuccess(socket, result.account, clientIp, db, session);
    if (!payload.success) return cb(payload);

    payload.history = ctx.msgCache.get();
    setLoggedInState(state, result.account, data.token);
    cb(payload);
  });

  socket.on('logout', async (cb) => {
    cb = asCallback(cb);
    if (!state.currentUserId) return cb({ success: true });

    if (state.currentToken) await db.logout(state.currentToken).catch(() => {});
    state.currentToken = null;
    cb({ success: true });
    socket.disconnect(true);
  });
}

module.exports = { registerAccountHandlers };
