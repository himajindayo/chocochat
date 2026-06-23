'use strict';
const PUBLIC_COMMANDS = [
    { name: '/omikuji', desc: 'おみくじを引く' },
    { name: '/dice', desc: 'サイコロを振る（1〜6）' },
    { name: '/coin', desc: 'コインを投げる（表/裏）' },
    { name: '/pm', desc: 'オンライン中のユーザーへ個別メッセージを送信', example: '例: /pm ユーザーID 内容' },
];
const ADMIN_COMMANDS = [
    { name: '/delete', desc: '全メッセージを削除' },
    { name: '/rule', desc: '全体またはオンライン中のユーザーへルール案内を送信', example: '例: /rule ユーザーID' },
    { name: '/mute', desc: 'オンライン中のユーザーを一時ミュート', example: '例: /mute ユーザーID 分数' },
    { name: '/unmute', desc: 'ユーザーのミュートを解除', example: '例: /unmute ユーザーID' },
    { name: '/mutelist', desc: 'ミュート中ユーザー一覧を表示' },
    { name: '/ban', desc: 'オンライン中のユーザーをBAN', example: '例: /ban ユーザーID' },
    { name: '/unban', desc: 'ユーザーのBANを解除', example: '例: /unban ユーザーID' },
    { name: '/banlist', desc: 'BAN中ユーザー一覧を表示' },
    { name: '/shadowban', desc: 'オンライン中のユーザーをシャドウBAN', example: '例: /shadowban ユーザーID' },
    { name: '/shadowunban', desc: 'ユーザーのシャドウBANを解除', example: '例: /shadowunban ユーザーID' },
    { name: '/shadowbanlist', desc: 'シャドウBAN中ユーザー一覧を表示' },
];
const SUPER_ADMIN_COMMANDS = [
    { name: '/addadmin', desc: 'オンライン中のユーザーに管理者権限を付与', example: '例: /addadmin ユーザーID' },
    { name: '/removeadmin', desc: '指定ユーザーの管理者権限を削除', example: '例: /removeadmin ユーザーID' },
    { name: '/adminlist', desc: '管理者一覧を表示' },
];
const COMMAND_SECTIONS = [
    {
        id: 'public',
        title: '基本コマンド',
        items: PUBLIC_COMMANDS,
        visible: () => true,
    },
    {
        id: 'admin',
        title: '管理者',
        items: ADMIN_COMMANDS,
        visible: ({ isAdmin, isSuperAdmin }) => isAdmin || isSuperAdmin,
    },
    {
        id: 'superadmin',
        title: 'ADMIN',
        items: SUPER_ADMIN_COMMANDS,
        visible: ({ isSuperAdmin }) => isSuperAdmin,
    },
];
function cloneCommand(item) {
    return {
        name: item.name,
        desc: item.desc,
        ...(item.example ? { example: item.example } : {}),
    };
}
function getCommandSections(options = {}) {
    return COMMAND_SECTIONS
        .filter(section => section.visible(options))
        .map(section => ({
        id: section.id,
        title: section.title,
        cards: section.items.map(cloneCommand),
    }));
}
function buildCommandCatalogPayload(options = {}) {
    return {
        sections: getCommandSections(options),
    };
}
function buildRuleText(username) {
    return [
        `こんにちは、${username}です。`,
        'このサーバーのルールをご案内します。',
        '',
        '【ルール】',
        '他の人が嫌がることはしないでください。',
        '例:',
        '・暴言や相手を傷つける発言',
        '・過度な発言や迷惑行為',
        '・ログイン／ログアウトの繰り返し',
        '',
        '【補足】',
        '役職の有無による上下関係はありません。',
        'お互いが問題なければ、タメ口で気軽に交流していただいて大丈夫です。',
        '',
        '【注意事項】',
        'ルールに違反する行為が確認された場合は、内容に応じて対応します。',
        '誰でも気持ちよく過ごせるよう、ご協力をお願いします。',
    ].join('\n');
}
module.exports = {
    buildCommandCatalogPayload,
    buildRuleText,
};
