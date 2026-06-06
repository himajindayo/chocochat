'use strict';

const { MAX_MSG_HISTORY } = require('./constants');

let cache = [];

function get()          { return cache; }
function set(msgs)      { cache = msgs; }
function find(id)       { return cache.find(m => m.id === id) ?? null; }
function removeById(id) { cache = cache.filter(m => m.id !== id); }
function clear() { cache = []; }

function push(msg) {
  cache.push(msg);
  if (cache.length > MAX_MSG_HISTORY) cache.shift();
}

function updateMessage(id, newText) {
  const idx = cache.findIndex(m => m.id === id);
  if (idx === -1) return false;

  cache[idx].message = newText;
  cache[idx].edited = true;
  return true;
}

module.exports = { get, set, find, removeById, clear, push, updateMessage };
