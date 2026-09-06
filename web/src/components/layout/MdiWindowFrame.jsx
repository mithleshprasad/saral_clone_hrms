import { MemoryRouter } from 'react-router-dom';
import WindowFrameContext from '../../context/WindowFrameContext';
import AppRoutes from '../AppRoutes';

// Pure positioning/sizing wrapper for one MDI window — no chrome of its own. The window's
// actual title bar, icon and minimize/maximize/close controls come from whichever
// DialogWindow the routed page renders (see DialogWindow.jsx), via the WindowFrameContext
// this provides. Deliberately positioned with left/top, never `transform` — a transform
// here would create a new containing block and break every `position: fixed` popup nested
// inside (the Employee Detail modal, FormModal, MasterCrudPage's Add/Edit dialog...), which
// all rely on covering the full browser viewport regardless of where this window sits.
export default function MdiWindowFrame({ win, isActive, controls, onFocus }) {
    const frameValue = {
        isMaximized: win.maximized,
        isActive,
        minimize: () => controls.minimize(win.id),
        toggleMaximize: () => controls.toggleMaximize(win.id),
        close: () => controls.close(win.id),
        startDrag: (e) => controls.startDrag(win.id, e),
    };

    const style = win.maximized
        ? { left: 0, top: 0, width: '100%', height: '100%', zIndex: win.zIndex }
        : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.zIndex };

    return (
        <div className={`mdi-window ${isActive ? 'active' : ''}`} style={style} onMouseDownCapture={onFocus}>
            <div className="mdi-window-body">
                <WindowFrameContext.Provider value={frameValue}>
                    <MemoryRouter initialEntries={[win.path]}>
                        <AppRoutes />
                    </MemoryRouter>
                </WindowFrameContext.Provider>
            </div>
        </div>
    );
}
