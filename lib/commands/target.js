'use strict';
const { normalizeTargetId } = require('../command-utils');
function requireOnlineTarget(session, targetId, options = {}) {
    const normalized = normalizeTargetId(targetId, options);
    if (!normalized.ok) {
        return normalized;
    }
    if (!session.userSockets.has(normalized.targetId)) {
        return { success: false, error: 'そのユーザーはオンラインではありません' };
    }
    return { success: true, targetId: normalized.targetId };
}
module.exports = { requireOnlineTarget };
