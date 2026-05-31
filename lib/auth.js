'use strict';

function requireAuth(userId, cb) {
  if (!userId) {
    cb({ success: false, error: 'ログインしてください' });
    return false;
  }
  return true;
}

/**
 * ログイン成功後の共通処理。
 * BAN チェック・セッション登録・PM 取得・参加通知を行い、
 * クライアントへ返すペイロードを構築して返す。
 */
async function handleLoginSuccess(socket, account, clientIp, db, session) {
  const { userId, isAdmin } = account;

  if (session.bannedUsers.has(userId) || await db.isBannedUser(userId))
    return { success: false, error: 'あなたはBANされています' };

  const isFirst = !session.userSockets.has(userId);
  session.registerSocket(userId, socket.id, isAdmin, account.username);
  session.userIpMap.set(userId, clientIp);
  session.userColors.set(userId, account.color || '#000000');
  if (account.statusText) session.userStatusMap.set(userId, account.statusText);

  const [pms, allPMs] = await Promise.all([
    db.getPrivateMessagesForUser(userId).catch(() => []),
    isAdmin ? db.getAllPrivateMessages().catch(() => []) : Promise.resolve([]),
  ]);

  const onlineUsers = session.getOnlineUsers();
  const userStatuses = session.getUserStatuses();
  const payload = {
    success: true,
    account,
    privateMessages: pms,
    allPrivateMessages: allPMs,
    userCount: onlineUsers.length,
    users: onlineUsers,
    userStatuses,
  };

  if (isFirst) {
    socket.broadcast.emit('userJoined', {
      userId,
      username:  account.username,
      userCount: onlineUsers.length,
      users:     onlineUsers,
      userStatuses,
    });
  }

  return payload;
}

module.exports = { requireAuth, handleLoginSuccess };
