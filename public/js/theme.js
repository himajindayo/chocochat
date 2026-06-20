'use strict';
const SUPPORTED_THEME_MODES = new Set(['system', 'light', 'dark']);
function normalizeThemeMode(theme) {
    if (typeof theme !== 'string')
        return 'system';
    const value = theme.trim().toLowerCase();
    return SUPPORTED_THEME_MODES.has(value) ? value : 'system';
}
function applyTheme(theme = 'system') {
    const mode = normalizeThemeMode(theme);
    document.body.dataset.theme = mode;
    return mode;
}
