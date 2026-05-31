'use strict';

const crypto    = require('crypto');
const { requireOnlineTarget } = require('./target');
const fortunes  = require('./data/fortunes');
const { COLOR_RE } = require('../constants');

function drawFortune() {
  const total = fortunes.reduce((s, f) => s + f.weight, 0);
  let rnd = Math.random() * total;
  for (const f of fortunes) {
    rnd -= f.weight;
    if (rnd <= 0) return f;
  }
  return fortunes[0];
}

function buildHelp(isAdmin, isSuperAdmin) {
  let msg =
    `【コマンド一覧】\n` +
    `/omikuji - おみくじを引く\n` +
    `/dice - サイコロを振る（1〜6）\n` +
    `/coin - コインを投げる（表/裏）\n` +
    `/color #カラー - 名前の色を変更（例: /color #ff0000）\n` +
    `/pm userId 内容 - プライベートメッセージを送信\n` +
    `/help - このヘルプを表示`;

  if (isAdmin) msg +=
    `\n【管理者専用】\n` +
    `/delete\n/rule - ルール案内を全体に送信\n/mute userId 分\n/unmute userId\n/mutelist\n` +
    `/ban userId\n/unban userId\n/banlist\n` +
    `/shadowban userId\n/shadowunban userId\n/shadowbanlist`;

  if (isSuperAdmin) msg +=
    `\n【ADMIN専用】\n` +
    `/addadmin userId\n/removeadmin userId\n/adminlist`;

  return { type: 'private', message: msg };
}

async function handlePublic(cmd, args, userId, username, isAdmin, isSuperAdmin, socket, ctx) {
  const { db, session, io } = ctx;

  if (cmd === '/help')  return buildHelp(isAdmin, isSuperAdmin);

  if (cmd === '/omikuji') {
    const f = drawFortune();
    return {
      type: 'command_result',
      userMessage:   'おみくじを引いた🎴',
      resultSender:  'おみくじ',
      resultMessage: `${username}(${userId}) の結果: 【${f.result}】`,
      resultColor:   '#e74c3c',
    };
  }

  if (cmd === '/dice') {
    const n = Math.floor(Math.random() * 6) + 1;
    return {
      type: 'command_result',
      userMessage:   'サイコロを振った🎲',
      resultSender:  'サイコロ',
      resultMessage: `${username}(${userId}) の結果: 🎲 ${n} が出た！`,
      resultColor:   '#3498db',
    };
  }

  if (cmd === '/coin') {
    const c = Math.random() < 0.5 ? '表' : '裏';
    return {
      type: 'command_result',
      userMessage:   'コインを投げた🪙',
      resultSender:  'コイン',
      resultMessage: `${username}(${userId}) の結果: 🪙 ${c}！`,
      resultColor:   '#f39c12',
    };
  }

  if (cmd === '/color') {
    if (!args[0] || !COLOR_RE.test(args[0]))
      return { type: 'error', message: '使用方法: /color #カラーコード（例: /color #ff0000）' };
    await db.updateProfile(userId, { color: args[0] });
    session.userColors.set(userId, args[0]);
    socket.emit('profileUpdated', { color: args[0] });
    return { type: 'private', message: `名前の色を ${args[0]} に変更しました` };
  }

  if (cmd === '/pm') {
    if (args.length < 2)
      return { type: 'error', message: '使用方法: /pm ユーザーID メッセージ' };
    const target = requireOnlineTarget(session, args[0]);
    if (!target.success) return { type: 'error', message: target.error };
    const pmMessage = args.slice(1).join(' ');
    if (target.targetId === userId)
      return { type: 'error', message: '自分自身にはPMを送れません' };
    if (pmMessage.length > 200)
      return { type: 'error', message: 'PMは200文字以内で入力してください' };

    const id        = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const color     = session.userColors.get(userId) || '#000000';
    await db.addPrivateMessage({ id, fromId: userId, toId: target.targetId, message: pmMessage, color, timestamp });

    const pmData = { id, fromId: userId, toId: target.targetId, message: pmMessage, timestamp, color };

    for (const sid of session.getSocketIds(target.targetId))
      io.sockets.sockets.get(sid)?.emit('privateMessage', pmData);

    for (const sid of session.adminSockets) {
      if (session.getUserIdBySocket(sid) !== userId)
        io.sockets.sockets.get(sid)?.emit('privateMessageMonitor', pmData);
    }

    socket.emit('privateMessageSent', pmData);
    return { type: 'private', message: `${target.targetId} にPMを送信しました` };
  }

  return null;
}

module.exports = { handlePublic };
