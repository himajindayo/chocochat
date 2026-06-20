'use strict';

const MOBILE_INPUT_QUERY = '(max-width: 820px) and (pointer: coarse)';
const mobileInputMedia = getMediaQueryList(MOBILE_INPUT_QUERY);
const msgInputEl = byId('msg-input');
let msgInputKeydownAttached = false;
let lastTypingEmitAt = 0;

function isMobileInputMode() {
    return !!mobileInputMedia.matches;
}

function getMsgInputPlaceholder() {
    return isMobileInputMode()
        ? 'メッセージを入力…　（Enterで改行）'
        : 'メッセージを入力…　（Enterで送信 / Shift+Enterで改行）';
}

function shouldSubmitOnEnter(e) {
    return e.key === 'Enter' && !e.shiftKey && !isMobileInputMode();
}

function onMsgInputKeydown(e) {
    if (!shouldSubmitOnEnter(e))
        return;
    e.preventDefault();
    sendMsg();
}

function updateMsgInputKeydownBinding() {
    if (!msgInputEl)
        return;
    const shouldAttach = !isMobileInputMode();
    if (shouldAttach && !msgInputKeydownAttached) {
        msgInputEl.addEventListener('keydown', onMsgInputKeydown);
        msgInputKeydownAttached = true;
    }
    else if (!shouldAttach && msgInputKeydownAttached) {
        msgInputEl.removeEventListener('keydown', onMsgInputKeydown);
        msgInputKeydownAttached = false;
    }
}

function syncMsgInputBehavior() {
    if (!msgInputEl)
        return;
    msgInputEl.placeholder = getMsgInputPlaceholder();
    updateMsgInputKeydownBinding();
}

syncMsgInputBehavior();
watchMediaQuery(mobileInputMedia, syncMsgInputBehavior);

function setReply(id, senderId, senderUsername, message) {
    App.replyTo = { id, senderId, senderUsername, message };
    setTextById('reply-text', formatReplyPreview(senderUsername, senderId, message, 60));
    toggleHiddenById('reply-bar', false);
    byId('msg-input').focus();
}
function cancelReply() {
    App.replyTo = null;
    toggleHiddenById('reply-bar', true);
}
onClick('cancel-reply', cancelReply);
function sendMsg() {
    if (App.sending)
        return;
    const msg = byId('msg-input').value.trim();
    if (!msg)
        return;
    App.sending = true;
    setDisabledById('send-btn', true);
    socket.emit('sendMessage', {
        message: msg,
        replyTo: App.replyTo,
        color: byId('p-color').value,
    }, res => {
        App.sending = false;
        setDisabledById('send-btn', false);
        if (res?.success) {
            byId('msg-input').value = '';
            const cc = byId('char-count');
            if (cc) {
                cc.textContent = '0';
                cc.classList.remove('over');
            }
            cancelReply();
            clearTimeout(App.typingTimer);
            App.typingTimer = null;
            socket.emit('stopTyping');
        }
        else {
            alert(res?.error || '送信に失敗しました');
        }
    });
}
onClick('send-btn', sendMsg);
onClick('omi-btn', () => {
    byId('msg-input').value = '/omikuji';
    sendMsg();
});
msgInputEl?.addEventListener('input', () => {
    const input = msgInputEl;
    if (!input)
        return;
    const len = input.value.length;
    const cc = byId('char-count');
    if (cc) {
        cc.textContent = len;
        cc.classList.toggle('over', len > 180);
    }
    const now = Date.now();
    if (now - lastTypingEmitAt >= 1000) {
        lastTypingEmitAt = now;
        socket.emit('typing');
    }
    clearTimeout(App.typingTimer);
    App.typingTimer = setTimeout(() => socket.emit('stopTyping'), 2000);
});
onClick('sys-toggle', () => {
    App.showSys = !App.showSys;
    byId('sys-toggle').textContent = App.showSys ? '入退室 ON' : '入退室 OFF';
});
