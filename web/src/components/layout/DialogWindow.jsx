import WindowFrameContext, { useWindowFrame } from '../../context/WindowFrameContext';

// Wraps page content in the classic dialog-box look used throughout SaralPayPack (Employee
// Details, Full & Final Settlement, Attendance Configuration, ...). When rendered as the
// outermost DialogWindow inside an MDI window (see MdiWindowFrame), it also becomes that
// window's actual chrome — drag handle, minimize/maximize/close — via WindowFrameContext.
// Any DialogWindow nested further inside (a detail popup, a MasterCrudPage Add/Edit dialog)
// sees the context reset to null below and renders as a plain, non-MDI dialog as before.
export default function DialogWindow({ title, icon = 'fa-window-maximize', statusBar, onClose, children }) {
    const frame = useWindowFrame();

    function handleTitleBarMouseDown(e) {
        if (!frame || frame.isMaximized) return;
        if (e.target.closest('.win-mdi-btn, .win-close')) return;
        frame.startDrag(e);
    }

    return (
        <div className="win-dialog" style={frame ? { width: '100%', height: '100%', maxWidth: 'none', margin: 0, display: 'flex', flexDirection: 'column' } : undefined}>
            <div
                className={`win-titlebar-bar ${frame && !frame.isMaximized ? 'draggable' : ''}`}
                onMouseDown={handleTitleBarMouseDown}
                onDoubleClick={() => frame?.toggleMaximize()}
            >
                <i className={`fas ${icon} win-titlebar-icon`}></i>
                <span>{title}</span>
                <div className="spacer"></div>
                {frame && (
                    <div className="mdi-window-controls">
                        <div className="win-mdi-btn" title="Minimize" onClick={frame.minimize}>–</div>
                        <div className="win-mdi-btn" title={frame.isMaximized ? 'Restore' : 'Maximize'} onClick={frame.toggleMaximize}>
                            {frame.isMaximized ? '❐' : '□'}
                        </div>
                        <div className="win-mdi-btn close" title="Close" onClick={frame.close}>✕</div>
                    </div>
                )}
                {onClose && <div className="win-close" onClick={onClose}>✕</div>}
            </div>
            <div className="win-dialog-body" style={frame ? { flex: 1, overflow: 'auto' } : undefined}>
                <WindowFrameContext.Provider value={null}>
                    {children}
                </WindowFrameContext.Provider>
            </div>
            {statusBar && <div className="win-statusbar">{statusBar}</div>}
        </div>
    );
}
