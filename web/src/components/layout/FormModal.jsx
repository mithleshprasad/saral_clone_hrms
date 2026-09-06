/**
 * Floating classic dialog box for "New X" / quick-create flows — the popup counterpart to
 * DialogWindow (which is used for full-page screens). Matches SaralPayPack's behavior of
 * opening a separate window for record entry instead of an inline embedded form.
 */
export default function FormModal({ title, icon = 'fa-window-maximize', onClose, children, width = 640 }) {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="win-dialog" style={{ width: `min(${width}px, 92vw)`, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <div className="win-titlebar-bar">
                    <i className={`fas ${icon} win-titlebar-icon`}></i>
                    <span>{title}</span>
                    <div className="spacer"></div>
                    <div className="win-close" onClick={onClose}>✕</div>
                </div>
                <div className="win-dialog-body">
                    {children}
                </div>
            </div>
        </div>
    );
}
