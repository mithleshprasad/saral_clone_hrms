// Self-contained toast/notification layer. Injects its own styles + container
// so it works from any page without HTML changes, and overrides window.alert
// so the 90+ existing alert() calls across the app upgrade for free.
import { escapeHtml } from './utils.js';

const ICONS = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
};

const COLORS = {
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
    info: '#4f46e5'
};

let container = null;

function ensureContainer() {
    if (container && document.body.contains(container)) return container;
    container = document.createElement('div');
    container.id = 'toast-stack';
    container.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 20000;
        display: flex; flex-direction: column; gap: 10px; align-items: flex-end;
        pointer-events: none;
    `;
    document.body.appendChild(container);

    if (!document.getElementById('toast-stack-style')) {
        const style = document.createElement('style');
        style.id = 'toast-stack-style';
        style.textContent = `
            .toast-item {
                pointer-events: auto;
                display: flex; align-items: center; gap: 10px;
                background: #fff; color: #1e293b;
                padding: 12px 16px; border-radius: 10px;
                box-shadow: 0 10px 25px -5px rgba(15,23,42,0.15), 0 4px 6px -4px rgba(15,23,42,0.1);
                border-left: 4px solid var(--toast-accent, #4f46e5);
                font-size: 13.5px; font-weight: 500; max-width: 360px;
                animation: toastIn 0.25s cubic-bezier(0.16,1,0.3,1);
            }
            .toast-item.leaving { animation: toastOut 0.2s ease-in forwards; }
            .toast-item i { font-size: 16px; color: var(--toast-accent, #4f46e5); flex-shrink: 0; }
            .toast-item .toast-close {
                margin-left: auto; cursor: pointer; color: #94a3b8; font-size: 13px;
                padding: 2px 4px; border-radius: 4px; flex-shrink: 0;
            }
            .toast-item .toast-close:hover { background: #f1f5f9; color: #475569; }
            @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes toastOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(20px); } }
        `;
        document.head.appendChild(style);
    }
    return container;
}

export function showToast(message, type = 'info', duration = 4000) {
    const el = ensureContainer();
    const item = document.createElement('div');
    item.className = 'toast-item';
    item.style.setProperty('--toast-accent', COLORS[type] || COLORS.info);
    item.innerHTML = `
        <i class="fas ${ICONS[type] || ICONS.info}"></i>
        <span>${escapeHtml(message)}</span>
        <span class="toast-close"><i class="fas fa-xmark"></i></span>
    `;
    const remove = () => {
        item.classList.add('leaving');
        setTimeout(() => item.remove(), 200);
    };
    item.querySelector('.toast-close').addEventListener('click', remove);
    el.appendChild(item);
    if (duration > 0) setTimeout(remove, duration);
    return item;
}

// Styled replacement for window.confirm(). Existing `if (confirm(msg))` call
// sites are synchronous and can't be swapped for this without an await, so
// this is opt-in: call `await confirmDialog(msg)` in new/updated code.
export function confirmDialog(message, { title = 'Please Confirm', okText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'erp-modal-overlay active';
        overlay.style.zIndex = '20001';
        overlay.innerHTML = `
            <div class="erp-modal-window" style="width:420px;">
                <div class="erp-modal-header">
                    <span>${escapeHtml(title)}</span>
                </div>
                <div class="erp-modal-body" style="font-size:14px; color:#334155;">${escapeHtml(message)}</div>
                <div class="erp-modal-footer">
                    <button class="erp-btn" id="confirm-cancel-btn">${escapeHtml(cancelText)}</button>
                    <button class="erp-btn ${danger ? '' : 'erp-btn-primary'}" id="confirm-ok-btn"
                        style="${danger ? 'background:#dc2626;border-color:#dc2626;color:#fff;' : ''}">${escapeHtml(okText)}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const cleanup = (result) => {
            overlay.remove();
            resolve(result);
        };
        overlay.querySelector('#confirm-ok-btn').addEventListener('click', () => cleanup(true));
        overlay.querySelector('#confirm-cancel-btn').addEventListener('click', () => cleanup(false));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
    });
}

export function initToastSystem() {
    const nativeAlert = window.alert.bind(window);
    window.alert = (message) => {
        try {
            const isError = /error|fail|invalid|denied|required|not found|cannot|unable/i.test(String(message));
            showToast(String(message), isError ? 'error' : 'info');
        } catch (e) {
            nativeAlert(message);
        }
    };
    window.showToast = showToast;
    window.confirmDialog = confirmDialog;
}
