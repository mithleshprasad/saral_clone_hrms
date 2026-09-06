import { createContext, useContext } from 'react';

// Provided by MdiWindowFrame to the outermost DialogWindow rendered inside it — lets
// DialogWindow grow minimize/maximize/close/drag controls without every page needing to
// know it's running inside an MDI window. DialogWindow resets this to null for its own
// children, so a DialogWindow nested inside another (e.g. the Employee Detail popup) never
// picks up a second set of window controls.
const WindowFrameContext = createContext(null);

export function useWindowFrame() {
    return useContext(WindowFrameContext);
}

export default WindowFrameContext;
