import { createContext, useContext, useCallback, useRef, useState } from 'react';

const WindowManagerContext = createContext(null);

export function useWindowManager() {
    const ctx = useContext(WindowManagerContext);
    if (!ctx) throw new Error('useWindowManager must be used within a WindowManagerProvider');
    return ctx;
}

let nextWindowId = 1;
const CASCADE_STEP = 28;
const CASCADE_SLOTS = 8;

// Tracks every open MDI window (path/title/icon/position/size/z-order/minimized/maximized)
// for the Admin/HR app's desktop-style workspace. One entry per distinct route path — opening
// a screen that's already open just focuses/restores it instead of creating a duplicate.
export function WindowManagerProvider({ children }) {
    const [windows, setWindows] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const zCounter = useRef(1);
    const desktopRef = useRef(null);

    const bringToFront = useCallback((id) => {
        zCounter.current += 1;
        const z = zCounter.current;
        setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, zIndex: z } : w)));
        setActiveId(id);
    }, []);

    const focusWindow = useCallback((id) => {
        bringToFront(id);
    }, [bringToFront]);

    const openWindow = useCallback(({ path, title, icon }) => {
        setWindows((ws) => {
            const existing = ws.find((w) => w.path === path);
            if (existing) {
                zCounter.current += 1;
                const z = zCounter.current;
                setActiveId(existing.id);
                return ws.map((w) => (w.id === existing.id ? { ...w, minimized: false, zIndex: z } : w));
            }

            const rect = desktopRef.current?.getBoundingClientRect();
            const areaW = rect?.width || 1200;
            const areaH = rect?.height || 700;
            const w = Math.min(1100, Math.max(420, areaW - 40));
            const h = Math.min(700, Math.max(320, areaH - 40));
            const idx = ws.length % CASCADE_SLOTS;

            zCounter.current += 1;
            const id = nextWindowId++;
            setActiveId(id);
            return [...ws, {
                id, path, title: title || path, icon: icon || 'fa-window-maximize',
                x: 16 + idx * CASCADE_STEP, y: 12 + idx * CASCADE_STEP, w, h,
                zIndex: zCounter.current, minimized: false, maximized: true,
            }];
        });
    }, []);

    const closeWindow = useCallback((id) => {
        setWindows((ws) => {
            const next = ws.filter((w) => w.id !== id);
            setActiveId((cur) => (cur === id ? (next[next.length - 1]?.id ?? null) : cur));
            return next;
        });
    }, []);

    const minimizeWindow = useCallback((id) => {
        setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
        setActiveId((cur) => (cur === id ? null : cur));
    }, []);

    const restoreWindow = useCallback((id) => {
        setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, minimized: false } : w)));
        bringToFront(id);
    }, [bringToFront]);

    const toggleMaximize = useCallback((id) => {
        setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)));
        bringToFront(id);
    }, [bringToFront]);

    // Drag deltas are computed from the pointer's movement since mousedown, not from the
    // window's live state each frame — sidesteps stale-closure bugs from reading `windows`
    // inside a long-lived mousemove listener.
    const startDrag = useCallback((id, e) => {
        const win = windows.find((w) => w.id === id);
        if (!win || win.maximized) return;
        e.preventDefault();
        bringToFront(id);

        const startX = e.clientX;
        const startY = e.clientY;
        const originX = win.x;
        const originY = win.y;
        const rect = desktopRef.current?.getBoundingClientRect();
        const areaW = rect?.width || 1200;
        const areaH = rect?.height || 700;

        function onMove(ev) {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            const nextX = Math.min(Math.max(originX + dx, -(win.w - 120)), areaW - 120);
            const nextY = Math.min(Math.max(originY + dy, 0), Math.max(0, areaH - 40));
            setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, x: nextX, y: nextY } : w)));
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [windows, bringToFront]);

    const value = {
        windows, activeId, desktopRef,
        openWindow, closeWindow, minimizeWindow, restoreWindow, toggleMaximize, focusWindow, startDrag,
    };

    return <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>;
}
