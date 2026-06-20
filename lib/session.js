'use strict';
const { SUPER_ADMIN_ID } = require('./constants');
const userSockets = new Map();
const socketUsers = new Map();
const adminSockets = new Set();
const adminUserIds = new Set();
const userStatusMap = new Map();
const userNames = new Map();
const userIpMap = new Map();
const userColors = new Map();
const bannedUsers = new Set();
const shadowBannedUsers = new Set();
const shadowBanById = new Map();
const mutedUsers = new Map();
function registerSocket(userId, socketId, isAdmin, username) {
    if (!userSockets.has(userId))
        userSockets.set(userId, new Set());
    userSockets.get(userId).add(socketId);
    socketUsers.set(socketId, userId);
    if (typeof username === 'string' && username)
        userNames.set(userId, username);
    if (isAdmin)
        adminSockets.add(socketId);
}
function unregisterSocket(userId, socketId) {
    socketUsers.delete(socketId);
    adminSockets.delete(socketId);
    const socks = userSockets.get(userId);
    if (!socks)
        return false;
    socks.delete(socketId);
    if (socks.size === 0) {
        userSockets.delete(userId);
        userStatusMap.delete(userId);
        userNames.delete(userId);
        userIpMap.delete(userId);
        userColors.delete(userId);
        return true;
    }
    return false;
}
function getUserIdBySocket(socketId) { return socketUsers.get(socketId) ?? null; }
function getSocketIds(userId) { return userSockets.get(userId) ?? new Set(); }
function isAdminUser(userId) { return adminUserIds.has(userId); }
function isSuperAdmin(userId) { return userId === SUPER_ADMIN_ID; }
function isPrivilegedUser(userId) { return isAdminUser(userId) || isSuperAdmin(userId); }
function getOnlineUsers() { return [...userSockets.keys()].map(userId => ({ userId, username: userNames.get(userId) || userId })); }
function getUserStatuses() { return Object.fromEntries(userStatusMap); }
function setUserName(userId, username) { if (typeof username === 'string' && username)
    userNames.set(userId, username); }
function purgeUser(userId) {
    const socks = [...(userSockets.get(userId) ?? [])];
    for (const socketId of socks) {
        socketUsers.delete(socketId);
        adminSockets.delete(socketId);
    }
    userSockets.delete(userId);
    adminUserIds.delete(userId);
    userStatusMap.delete(userId);
    userNames.delete(userId);
    userIpMap.delete(userId);
    userColors.delete(userId);
    bannedUsers.delete(userId);
    shadowBannedUsers.delete(userId);
    shadowBanById.delete(userId);
    mutedUsers.delete(userId);
}

function checkMuted(userId) {
    const info = mutedUsers.get(userId);
    if (!info)
        return { muted: false };
    if (Date.now() < info.until)
        return { muted: true, remaining: Math.ceil((info.until - Date.now()) / 1000) };
    mutedUsers.delete(userId);
    return { muted: false };
}
module.exports = {
    userSockets, socketUsers, adminSockets,
    adminUserIds, userStatusMap, userNames, userIpMap, userColors,
    bannedUsers, shadowBannedUsers, shadowBanById, mutedUsers,
    registerSocket, unregisterSocket,
    getUserIdBySocket, getSocketIds,
    isAdminUser, isSuperAdmin, isPrivilegedUser,
    getOnlineUsers, getUserStatuses, setUserName, purgeUser,
    checkMuted,
};
