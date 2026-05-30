'use strict';

let _io      = null;
let _session = null;
let _db      = null;

function init(io, session, db) { _io = io; _session = session; _db = db; }

function emitToAdmins(event, data) {
  for (const sid of _session.adminSockets) {
    _io.sockets.sockets.get(sid)?.emit(event, data);
  }
}

async function broadcastAdminData() {
  const ipList = [];
  for (const [uid, ip] of _session.userIpMap) ipList.push({ userId: uid, ip });
  emitToAdmins('userIpList', ipList);

  const history = await _db.getAllUserIpHistory().catch(() => []);
  emitToAdmins('userIpHistory', history);
}

module.exports = { init, emitToAdmins, broadcastAdminData };
