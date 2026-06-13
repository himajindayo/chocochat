'use strict';
const connAttempts = new Map();
const connLockouts = new Map();
const CONN_WINDOW = 60_000;
const CONN_LIMIT = 15;
const CONN_LOCKOUT = 60 * 60_000;
function isConnectionRateLimited(ip) {
    const now = Date.now();
    const lock = connLockouts.get(ip);
    if (lock && now < lock)
        return true;
    const hist = (connAttempts.get(ip) || []).filter(t => now - t < CONN_WINDOW);
    hist.push(now);
    connAttempts.set(ip, hist);
    if (hist.length > CONN_LIMIT) {
        connLockouts.set(ip, now + CONN_LOCKOUT);
        connAttempts.delete(ip);
        return true;
    }
    return false;
}
const loginAttempts = new Map();
const loginLockouts = new Map();
const LOGIN_WINDOW = 5 * 60_000;
const LOGIN_LIMIT = 5;
const LOGIN_LOCKOUT = 30 * 60_000;
function isLoginRateLimited(ip) {
    const now = Date.now();
    const lock = loginLockouts.get(ip);
    if (lock && now < lock)
        return { limited: true, remaining: Math.ceil((lock - now) / 1000) };
    return { limited: false };
}
function recordFailedLogin(ip) {
    const now = Date.now();
    const hist = (loginAttempts.get(ip) || []).filter(t => now - t < LOGIN_WINDOW);
    hist.push(now);
    loginAttempts.set(ip, hist);
    if (hist.length >= LOGIN_LIMIT) {
        loginLockouts.set(ip, now + LOGIN_LOCKOUT);
        loginAttempts.delete(ip);
    }
}
function clearLoginAttempts(ip) {
    loginAttempts.delete(ip);
    loginLockouts.delete(ip);
}
const signupAttempts = new Map();
const signupLockouts = new Map();
const SIGNUP_WINDOW = 5 * 60_000;
const SIGNUP_LIMIT = 5;
const SIGNUP_LOCKOUT = 30 * 60_000;
function isSignupRateLimited(ip) {
    const now = Date.now();
    const lock = signupLockouts.get(ip);
    if (lock && now < lock)
        return { limited: true, remaining: Math.ceil((lock - now) / 1000) };
    return { limited: false };
}
function recordSignupAttempt(ip) {
    const now = Date.now();
    const hist = (signupAttempts.get(ip) || []).filter(t => now - t < SIGNUP_WINDOW);
    hist.push(now);
    signupAttempts.set(ip, hist);
    if (hist.length >= SIGNUP_LIMIT) {
        signupLockouts.set(ip, now + SIGNUP_LOCKOUT);
        signupAttempts.delete(ip);
    }
}
function clearSignupAttempts(ip) {
    signupAttempts.delete(ip);
    signupLockouts.delete(ip);
}
const lastMsgTime = new Map();
const MSG_INTERVAL = 1_000;
function isMessageRateLimited(userId) {
    const now = Date.now();
    const last = lastMsgTime.get(userId) || 0;
    if (now - last < MSG_INTERVAL)
        return true;
    lastMsgTime.set(userId, now);
    return false;
}
const typingLastSent = new Map();
const TYPING_INTERVAL = 2_000;
function isTypingRateLimited(userId) {
    const now = Date.now();
    const last = typingLastSent.get(userId) || 0;
    if (now - last < TYPING_INTERVAL)
        return true;
    typingLastSent.set(userId, now);
    return false;
}
const msgHistory = new Map();
const FLOOD_LIMIT = 6;
const FLOOD_WIN = 15_000;
const FLOOD_MUTE = 24 * 60;
function checkFlood(userId, message, mutedUsers, saveMuteFn) {
    const now = Date.now();
    const hist = msgHistory.get(userId) || [];
    hist.push({ message, timestamp: now });
    if (hist.length > 12)
        hist.shift();
    msgHistory.set(userId, hist);
    if (hist.filter(m => now - m.timestamp < FLOOD_WIN).length >= FLOOD_LIMIT) {
        const until = now + FLOOD_MUTE * 60_000;
        mutedUsers.set(userId, { until });
        msgHistory.set(userId, []);
        saveMuteFn(until);
        return { detected: true, muteMinutes: FLOOD_MUTE };
    }
    return { detected: false };
}
const lastMessages = new Map();
const DUP_LIMIT = 3;
const DUP_MUTE = 10;
function checkDuplicate(userId, message, mutedUsers, saveMuteFn) {
    const last = lastMessages.get(userId);
    if (last && last.message === message) {
        last.count++;
        if (last.count >= DUP_LIMIT) {
            const until = Date.now() + DUP_MUTE * 60_000;
            mutedUsers.set(userId, { until });
            lastMessages.delete(userId);
            saveMuteFn(until);
            return { detected: true, muteMinutes: DUP_MUTE };
        }
    }
    else {
        lastMessages.set(userId, { message, count: 1 });
    }
    return { detected: false };
}
function clearUserData(userId) {
    msgHistory.delete(userId);
    lastMessages.delete(userId);
    lastMsgTime.delete(userId);
    typingLastSent.delete(userId);
}
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, ts] of connLockouts)
        if (now >= ts) {
            connLockouts.delete(ip);
            connAttempts.delete(ip);
        }
    for (const [ip, ts] of loginLockouts)
        if (now >= ts) {
            loginLockouts.delete(ip);
            loginAttempts.delete(ip);
        }
    for (const [ip, ts] of signupLockouts)
        if (now >= ts) {
            signupLockouts.delete(ip);
            signupAttempts.delete(ip);
        }
    for (const [ip, hist] of loginAttempts) {
        const active = hist.filter(t => now - t < LOGIN_WINDOW);
        if (active.length === 0)
            loginAttempts.delete(ip);
        else
            loginAttempts.set(ip, active);
    }
    for (const [ip, hist] of signupAttempts) {
        const active = hist.filter(t => now - t < SIGNUP_WINDOW);
        if (active.length === 0)
            signupAttempts.delete(ip);
        else
            signupAttempts.set(ip, active);
    }
    for (const [ip, hist] of connAttempts) {
        const active = hist.filter(t => now - t < CONN_WINDOW);
        if (active.length === 0)
            connAttempts.delete(ip);
        else
            connAttempts.set(ip, active);
    }
}, 10 * 60_000);
cleanupTimer.unref();
module.exports = {
    isConnectionRateLimited,
    isLoginRateLimited,
    recordFailedLogin,
    clearLoginAttempts,
    isSignupRateLimited,
    recordSignupAttempt,
    clearSignupAttempts,
    isMessageRateLimited,
    isTypingRateLimited,
    checkFlood,
    checkDuplicate,
    clearUserData,
};
