import { useEffect } from 'react';
import { useWindowManager } from '../../context/WindowManagerContext';
import { findMenuItem } from './menuConfig';
import MdiWindowFrame from './MdiWindowFrame';

export default function MdiDesktop() {
    const { windows, activeId, desktopRef, closeWindow, minimizeWindow, restoreWindow, toggleMaximize, startDrag, focusWindow, openWindow } = useWindowManager();

    // Seed exactly one window from wherever the browser's address bar happens to say (e.g. a
    // deep-linked/bookmarked path) — read directly off the browser, not react-router, since
    // this app shell deliberately has no ambient Router (see App.jsx). After this, all
    // navigation is handled by the window manager, not the URL.
    useEffect(() => {
        const item = findMenuItem(window.location.pathname) || { label: 'Dashboard', icon: 'fa-gauge-high', to: '/dashboard' };
        openWindow({ path: item.to, title: item.label, icon: item.icon });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const controls = { minimize: minimizeWindow, toggleMaximize, close: closeWindow, startDrag };

    return (
        <>
            <div className="mdi-desktop" ref={desktopRef}>
                {windows.filter((w) => !w.minimized).map((w) => (
                    <MdiWindowFrame key={w.id} win={w} isActive={w.id === activeId} controls={controls} onFocus={() => focusWindow(w.id)} />
                ))}
                {windows.length === 0 && (
                    <div className="mdi-empty-hint">All windows are closed. Use the menu bar above to open a screen.</div>
                )}
            </div>

            {windows.length > 0 && (
                <div className="mdi-taskbar">
                    {windows.map((w) => (
                        <div
                            key={w.id}
                            className={`mdi-taskbar-chip ${w.id === activeId && !w.minimized ? 'active' : ''} ${w.minimized ? 'minimized' : ''}`}
                            onClick={() => (w.minimized ? restoreWindow(w.id) : focusWindow(w.id))}
                            title={w.title}
                        >
                            <i className={`fas ${w.icon}`}></i>
                            <span>{w.title}</span>
                            <span className="close-x" onClick={(e) => { e.stopPropagation(); closeWindow(w.id); }}>✕</span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
