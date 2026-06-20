'use strict';
function buildContentSecurityPolicy({ httpsEnabled = false } = {}) {
    const directives = [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        "style-src 'self'",
        "script-src 'self' https://cdn.socket.io",
        "connect-src 'self' ws: wss:",
    ];
    if (httpsEnabled) {
        directives.push('upgrade-insecure-requests', 'block-all-mixed-content');
    }
    return directives.join('; ');
}
function applySecurityHeaders(req, res, next, options = {}) {
    const { httpsEnabled = false } = options;
    res.setHeader('Content-Security-Policy', buildContentSecurityPolicy({ httpsEnabled }));
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    if (httpsEnabled) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
}
module.exports = { applySecurityHeaders };
