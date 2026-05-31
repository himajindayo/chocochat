'use strict';

const msgCache = require('../msgCache');

async function handleAdmin(cmd, args, userId, username, ctx) {
  const { io, db, session } = ctx;

  if (cmd === '/delete') {
    await db.deleteAllMessages();
    msgCache.clear();
    io.emit('allMessagesDeleted');
    io.emit('systemMessage', '管理者がすべてのメッセージを削除しました');
    return { type: 'silent' };
  }

  if (cmd === '/rule') {
    const text = buildRuleText(username);
    io.emit('systemMessage', `【ルール案内】\n${text}`);
    return { type: 'silent' };
  }

  if (cmd === '/mute') {
    if (args.length < 2)
      return { type: 'error', message: '使用方法: /mute ユーザーID 分数' };
    const target = requireOnlineTarget(session, args[0]);
    if (!target.success) return { type: 'error', message: target.error };
    const minutes  = parseInt(args[1], 10);
    if (!Number.isInteger(minutes) || minutes <= 0)
      return { type: 'error', message: '分数は正の整数で指定してください' };
    if (session.isAdminUser(target.targetId))
      return { type: 'error', message: '管理者をミュートすることはできません' };
    const until = Date.now() + minutes * 60_000;
    session.mutedUsers.set(target.targetId, { until });
    await db.saveMute(target.targetId, until, userId);
    for (const sid of session.getSocketIds(target.targetId))
      io.sockets.sockets.get(sid)?.emit('systemMessage', `管理者により ${minutes}分間ミュートされました`);
    io.emit('systemMessage', `${target.targetId} を ${minutes}分間ミュートしました`);
    return { type: 'silent' };
  }

  if (cmd === '/unmute') {
    if (args.length < 1)
      return { type: 'error', message: '使用方法: /unmute ユーザーID' };
    const targetId = args[0];
    if (!session.mutedUsers.has(targetId))
      return { type: 'error', message: 'そのユーザーはミュートされていません' };
    session.mutedUsers.delete(targetId);
    await db.clearMute(targetId);
    io.emit('systemMessage', `${targetId} のミュートを解除しました`);
    return { type: 'silent' };
  }

  if (cmd === '/mutelist') {
    const now  = Date.now();
    const list = [];
    for (const [uid, info] of [...session.mutedUsers]) {
      if (info.until > now) list.push(`${uid}（残り ${Math.ceil((info.until - now) / 1000)}秒）`);
      else session.mutedUsers.delete(uid);
    }
    return list.length === 0
      ? { type: 'private', message: 'ミュート中のユーザーはいません' }
      : { type: 'private', message: `【ミュートリスト】\n${list.join('\n')}` };
  }

  if (cmd === '/ban') {
    if (args.length < 1)
      return { type: 'error', message: '使用方法: /ban ユーザーID' };
    const target = requireOnlineTarget(session, args[0]);
    if (!target.success) return { type: 'error', message: target.error };
    if (session.isAdminUser(target.targetId))
      return { type: 'error', message: '管理者をBANすることはできません' };
    const targetIp = session.userIpMap.get(target.targetId) ?? null;
    session.bannedUsers.add(target.targetId);
    await db.addBan(target.targetId, userId, targetIp, '管理者によるBAN');
    for (const sid of [...session.getSocketIds(target.targetId)]) {
      const s = io.sockets.sockets.get(sid);
      if (s) { s.emit('banned', { message: '管理者によりBANされました' }); s.disconnect(true); }
    }
    const online = session.getOnlineUserIds();
    io.emit('userLeft', { userId: target.targetId, username: target.targetId, userCount: online.length, users: online });
    io.emit('systemMessage', `${target.targetId} をBANしました`);
    return { type: 'silent' };
  }

  if (cmd === '/unban') {
    if (args.length < 1)
      return { type: 'error', message: '使用方法: /unban ユーザーID' };
    const targetId = args[0];
    if (!session.bannedUsers.has(targetId) && !await db.isBannedUser(targetId))
      return { type: 'error', message: 'そのユーザーはBANされていません' };
    session.bannedUsers.delete(targetId);
    await db.removeBan(targetId);
    io.emit('systemMessage', `${targetId} のBANを解除しました`);
    return { type: 'silent' };
  }

  if (cmd === '/banlist') {
    const list = await db.getBannedUsers();
    if (list.length === 0)
      return { type: 'private', message: 'BAN済みユーザーはいません' };
    return {
      type:    'private',
      message: `【BANリスト】\n${list.map(b => `${b.userId}（by: ${b.bannedById}）`).join('\n')}`,
    };
  }

  if (cmd === '/shadowban') {
    if (args.length < 1)
      return { type: 'error', message: '使用方法: /shadowban ユーザーID' };
    const target = requireOnlineTarget(session, args[0]);
    if (!target.success) return { type: 'error', message: target.error };
    if (session.isAdminUser(target.targetId))
      return { type: 'error', message: '管理者をシャドウBANすることはできません' };
    if (session.shadowBannedUsers.has(target.targetId))
      return { type: 'error', message: 'すでにシャドウBAN中です' };
    session.shadowBannedUsers.add(target.targetId);
    await db.addShadowBan(target.targetId, userId);
    return { type: 'private', message: `${target.targetId} をシャドウBANしました` };
  }

  if (cmd === '/shadowunban') {
    if (args.length < 1)
      return { type: 'error', message: '使用方法: /shadowunban ユーザーID' };
    const targetId        = args[0];
    const removedFromMem  = session.shadowBannedUsers.delete(targetId);
    const removedFromDb   = await db.removeShadowBan(targetId).catch(() => false);
    if (!removedFromMem && !removedFromDb)
      return { type: 'error', message: 'そのユーザーはシャドウBAN中ではありません' };
    return { type: 'private', message: `${targetId} のシャドウBANを解除しました` };
  }

  if (cmd === '/shadowbanlist') {
    const ids = [...session.shadowBannedUsers];
    return ids.length === 0
      ? { type: 'private', message: 'シャドウBAN中のユーザーはいません' }
      : { type: 'private', message: `【シャドウBANリスト】\n${ids.join('\n')}` };
  }

  return null;
}

function buildRuleText(username) {
  return `こんにちは、${username}です。\nこのサーバーで管理者をしています。\nみなさんが気持ちよく利用できるよう、ルールのご案内をさせていただきます。\n\n【ルール】\n他の人が嫌がることはしないでください。\n例：\n・暴言や相手を傷つける発言\n・過度な発言や迷惑行為\n・ログイン／ログアウトの繰り返し など\n相手の気持ちを考えた行動をお願いします。\n\n【補足】\n役職の有無による上下関係はありません。\nお互いが問題なければ、タメ口で気軽に交流していただいて大丈夫です。\n\n【注意事項】\nルールに違反する行為が確認された場合は、内容に応じて対応させていただきます。\nあらかじめご了承ください。\n\n誰でも気持ちよく過ごせるサーバーを目指していますので、ご協力よろしくお願いします。\nぜひ楽しんでいってください。`;
}

module.exports = { handleAdmin };
