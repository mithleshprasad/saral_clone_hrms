// Escapes text before it's interpolated into an innerHTML template literal.
// Grid/report rows render DB-backed free-text fields (names, notes, addresses, ...);
// without this a value like `<img src=x onerror=...>` saved in any text field
// executes in the privileged renderer the moment the row is drawn.
export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// For values interpolated inside `onclick="fn('${value}')"` style handlers: the browser
// HTML-decodes the attribute before handing it to the JS parser, so escaping quotes to
// &#39; alone does NOT stop a `'` in the data from closing the JS string early. Escape the
// JS string content first, then HTML-escape the whole attribute value.
export function escapeJsAttr(value) {
    const jsSafe = String(value === null || value === undefined ? '' : value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    return escapeHtml(jsSafe);
}

// Convenience for window-global (non-module) callers.
window.escapeHtml = escapeHtml;
window.escapeJsAttr = escapeJsAttr;
