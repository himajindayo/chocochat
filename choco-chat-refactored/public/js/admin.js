'use strict';

document.getElementById('toggle-ip').onclick   = () => document.getElementById('ip-list').classList.toggle('hidden');
document.getElementById('toggle-hist').onclick = () => document.getElementById('ip-history').classList.toggle('hidden');

function updateIpList(list) {
  const el = document.getElementById('ip-list');
  el.innerHTML = list?.length
    ? '<b>オンラインIP</b><br>' + list.map(e => `${esc(e.userId)}: ${esc(e.ip)}`).join('<br>')
    : '（なし）';
}

function updateIpHistory(hist) {
  const el = document.getElementById('ip-history');
  el.innerHTML = hist?.length
    ? '<b>IP履歴</b><br>' + hist.map(e => `${esc(e.userId)}: ${esc(e.ipAddress)} (${fmtTime(e.lastSeen)})`).join('<br>')
    : '（なし）';
}
