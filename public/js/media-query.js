'use strict';
function getMediaQueryList(query) {
    if (typeof window.matchMedia !== 'function')
        return null;
    return window.matchMedia(query);
}
function watchMediaQuery(mql, handler) {
    if (!mql || typeof handler !== 'function')
        return undefined;
    if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }
    if (typeof mql.addListener === 'function') {
        mql.addListener(handler);
        return () => mql.removeListener(handler);
    }
    return undefined;
}
