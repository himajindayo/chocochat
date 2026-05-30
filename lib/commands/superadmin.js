'use strict';

const { requireOnlineTarget } = require('./target');

async function handleSuperAdmin(cmd, args, userId, ctx) {
  const { io, db, session, broadcast } = ctx;

  if (cmd === '/addadmin') {
    if (args.length < 1)
      return { type: 'error', message: '使用方法: /addadmin ユーザーID' };
    const target = requireOnlineTarget(session, args[0]);
    if (!target.success) return { type: 'error', message: target.error };
    if (session.isSuperAdmin(target.targetId))
      return { type: 'error', message: 'ADMIN はすでに最上位管理者です' };
    if (session.isAdminUser(target.targetId))
      return { type: 'error', message: 'そのユーザーはすでに管理者です' };

    await db.setAdminFlag(target.targetId, true);
    session.adminUserIds.add(target.targetId);
    for (const sid of session.getSocketIds(target.targetId)) session.adminSockets.add(sid);
    for (const sid of session.getSocketIds(target.targetId))
      io.sockets.sockets.get(sid)?.emit('adminGranted', { message: '管理者権限が付与されました。ページを再読み込みしてください' });

    await broadcast.broadcastAdminData();
    return { type: 'private', message: `${target.targetId} に管理者権限を付与しました` };
  }

  if (cmd === '/removeadmin') {
    if (args.length < 1)
      return { type: 'error', message: '使用方法: /removeadmin ユーザーID' };
    const targetId = args[0];
    if (session.isSuperAdmin(targetId))
      return { type: 'error', message: 'ADMIN の権限は削除できません' };
    if (!session.isAdminUser(targetId))
      return { type: 'error', message: 'そのユーザーは管理者ではありません' };

    await db.setAdminFlag(targetId, false);
    session.adminUserIds.delete(targetId);
    for (const sid of session.getSocketIds(targetId)) session.adminSockets.delete(sid);
    for (const sid of session.getSocketIds(targetId))
      io.sockets.sockets.get(sid)?.emit('adminRevoked', { message: '管理者権限が削除されました' });

    return { type: 'private', message: `${targetId} の管理者権限を削除しました` };
  }

  if (cmd === '/adminlist') {
    const admins = [...session.adminUserIds]
      .filter(uid => !session.isSuperAdmin(uid))
      .sort((a, b) => a.localeCompare(b));
    return admins.length === 0
      ? { type: 'private', message: '【管理者リスト】\n追加された管理者はいません' }
      : { type: 'private', message: `【管理者リスト】\n${admins.map(uid => `${uid}（管理者）`).join('\n')}` };
  }

  return null;
}

module.exports = { handleSuperAdmin };
