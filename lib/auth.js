'use strict';

const geoip = require('geoip-lite');

function isOverseasIp(ip) {
  const geo = geoip.lookup(ip);
  return !geo || geo.country !== 'JP';
}

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
async function handleLoginSuccess(socket, account, clientIp, db, session, broadcast) {
  const { userId, isAdmin } = account;

  if (session.bannedUsers.has(userId) || await db.isBannedUser(userId))
    return { success: false, error: 'あなたはBANされています' };

  if (!isAdmin && isOverseasIp(clientIp))
    return { success: false, error: '日本国外からのログインは許可されていません' };

  const isFirst = !session.userSockets.has(userId);
  session.registerSocket(userId, socket.id, isAdmin);
  session.userIpMap.set(userId, clientIp);
  session.userColors.set(userId, account.color || '#000000');
  if (account.statusText) session.userStatusMap.set(userId, account.statusText);

  db.saveUserIpHistory(userId, clientIp).catch(() => {});

  const [pms, allPMs] = await Promise.all([
    db.getPrivateMessagesForUser(userId).catch(() => []),
    isAdmin ? db.getAllPrivateMessages().catch(() => []) : Promise.resolve([]),
  ]);

  const onlineIds = session.getOnlineUserIds();
  const payload = {
    success: true,
    account,
    privateMessages: pms,
    allPrivateMessages: allPMs,
    userCount: onlineIds.length,
    users: onlineIds,
    userStatuses: session.getUserStatuses(),
  };

  if (isAdmin) {
    const ipList = [];
    for (const [uid, ip] of session.userIpMap) ipList.push({ userId: uid, ip });
    const history = await db.getAllUserIpHistory().catch(() => []);
    payload.userIpList    = ipList;
    payload.userIpHistory = history;
  }

  if (isFirst) {
    socket.broadcast.emit('userJoined', {
      userId,
      username:   account.username,
      userCount:  onlineIds.length,
      users:      onlineIds,
      statusText: account.statusText || '',
      statuses:   session.getUserStatuses(),
    });
  }

  if (isAdmin) broadcast.broadcastAdminData().catch(() => {});

  return payload;
}

module.exports = { requireAuth, handleLoginSuccess };
