'use strict';

const { handlePublic }     = require('./public');
const { handleAdmin }      = require('./admin');
const { handleSuperAdmin } = require('./superadmin');

const ADMIN_ONLY = new Set([
  '/delete', '/rule', '/mute', '/unmute', '/mutelist',
  '/ban', '/unban', '/banlist',
  '/shadowban', '/shadowunban', '/shadowbanlist',
]);
const SUPER_ONLY = new Set(['/addadmin', '/removeadmin', '/adminlist']);

async function processCommand(command, userId, username, isAdmin, isSuperAdmin, socket, ctx) {
  const parts = command.trim().split(/\s+/);
  const cmd   = parts[0].toLowerCase();
  const args  = parts.slice(1);

  // 権限不足は最初に弾く（ハンドラ実行前）
  if (!isAdmin      && ADMIN_ONLY.has(cmd)) return { type: 'error', message: 'このコマンドは管理者専用です' };
  if (!isSuperAdmin && SUPER_ONLY.has(cmd)) return { type: 'error', message: 'このコマンドは ADMIN 専用です' };

  const pub = await handlePublic(cmd, args, userId, username, isAdmin, isSuperAdmin, socket, ctx);
  if (pub !== null) return pub;

  if (isAdmin) {
    const adm = await handleAdmin(cmd, args, userId, username, ctx);
    if (adm !== null) return adm;
  }

  if (isSuperAdmin) {
    const sup = await handleSuperAdmin(cmd, args, userId, ctx);
    if (sup !== null) return sup;
  }

  return null; // 未知のコマンド
}

module.exports = { processCommand };
