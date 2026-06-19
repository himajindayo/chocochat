'use strict';
const ACCOUNT_PUBLIC_COLUMNS = 'user_id, username, is_admin, color, theme, status_text';
const ACCOUNT_LOGIN_COLUMNS = 'user_id, username, password_hash, is_admin, color, theme, status_text';
const PUBLIC_MESSAGE_COLUMNS = 'id, sender_id, sender_username, message, color, sender_status, timestamp, reply_to_id, edited';
const PRIVATE_MESSAGE_COLUMNS = 'id, sender_id, recipient_id, message, timestamp';
const MODERATION_MUTE_COLUMNS = 'target_user_id, expires_at, actor_id';
module.exports = {
    ACCOUNT_PUBLIC_COLUMNS,
    ACCOUNT_LOGIN_COLUMNS,
    PUBLIC_MESSAGE_COLUMNS,
    PRIVATE_MESSAGE_COLUMNS,
    MODERATION_MUTE_COLUMNS,
};
