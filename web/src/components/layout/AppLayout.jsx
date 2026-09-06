import { WindowManagerProvider } from '../../context/WindowManagerContext';
import MenuBar from './MenuBar';
import MdiDesktop from './MdiDesktop';

export default function AppLayout() {
    return (
        <WindowManagerProvider>
            <div className="win-app">
                <div className="app-bg-diamonds">
                    <div className="diamond d1"></div>
                    <div className="diamond d2"></div>
                    <div className="diamond d3"></div>
                    <div className="diamond d4"></div>
                    <div className="diamond d5"></div>
                    <div className="diamond d6"></div>
                    <div className="diamond d7"></div>
                </div>
                <MenuBar />
                <div className="win-workspace">
                    <MdiDesktop />
                </div>
            </div>
        </WindowManagerProvider>
    );
}
