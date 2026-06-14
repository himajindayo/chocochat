'use strict';
const { THEME_SYSTEM, SUPPORTED_THEME_MODES } = require('./constants');
function normalizeThemeMode(theme) {
    if (typeof theme !== 'string')
        return THEME_SYSTEM;
    const value = theme.trim().toLowerCase();
    return SUPPORTED_THEME_MODES.has(value) ? value : THEME_SYSTEM;
}
function isThemeMode(theme) {
    return typeof theme === 'string' && SUPPORTED_THEME_MODES.has(theme.trim().toLowerCase());
}
module.exports = { normalizeThemeMode, isThemeMode };
