'use strict';

const { USER_ID_RE, COLOR_RE, SUPER_ADMIN_ID } = require('./constants');

function validateUserId(userId) {
  if (typeof userId !== 'string' || userId.length === 0) return 'ユーザーIDを入力してください';
  if (userId.length < 4 || userId.length > 20)           return 'ユーザーIDは4〜20文字で入力してください';
  if (!USER_ID_RE.test(userId))                          return 'ユーザーIDは半角英数字のみ使用できます';
  if (userId.toUpperCase() === SUPER_ADMIN_ID)           return 'このユーザーIDは使用できません';
  return null;
}

function validateUsername(username) {
  if (typeof username !== 'string' || username.trim().length === 0) return 'ユーザー名を入力してください';
  if (username.length > 20)                                         return 'ユーザー名は20文字以内で入力してください';
  if (username.includes('管理者'))                                  return 'ユーザー名に「管理者」は含められません';
  return null;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) return 'パスワードを入力してください';
  if (password.length < 4)                                   return 'パスワードは4文字以上で入力してください';
  return null;
}

function validateMessage(message) {
  if (typeof message !== 'string') return 'メッセージを入力してください';
  const t = message.trim();
  if (t.length === 0)   return 'メッセージを入力してください';
  if (t.length > 200)   return 'メッセージは200文字以内で入力してください';
  return null;
}

function validateStatusText(text) {
  if (typeof text !== 'string') return null;
  if (text.length > 30) return 'ステータスは30文字以内で入力してください';
  return null;
}

function validateColor(color) {
  if (typeof color !== 'string' || !COLOR_RE.test(color))
    return 'カラーコードは #RGB または #RRGGBB 形式で入力してください';
  return null;
}

module.exports = {
  validateUserId, validateUsername, validatePassword,
  validateMessage, validateStatusText, validateColor,
};
