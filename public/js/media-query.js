'use strict';
function getMediaQueryList(query) {
    if (typeof window.matchMedia !== 'function')
        return null;
    return window.matchMedia(query);
}
function watchMediaQuery(mql, handler) {
    if (!mql || typeof handler !== 'function' || typeof mql.addEventListener !== 'function')
        return undefined;
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
}
