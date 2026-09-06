import { useAuth } from '../context/AuthContext';

export default function TopBar({ onExit }) {
    const { user, logout } = useAuth();
    return (
        <div className="menubar-shell">
            <div className="menubar-brand">
                <i className="fas fa-key"></i>
                <span>MpxHR — License Control</span>
                <div className="spacer"></div>
                <div className="menubar-context">
                    <button className="menubar-logout" onClick={onExit} title="Leave License Control, back to MpxHR.com">
                        <i className="fas fa-arrow-left" style={{ marginRight: 5 }}></i>Exit
                    </button>
                    <span>{user?.username}</span>
                    <button className="menubar-logout" onClick={logout}>Logout</button>
                </div>
            </div>
        </div>
    );
}
