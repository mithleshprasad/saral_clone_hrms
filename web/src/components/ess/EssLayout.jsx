import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
    { label: 'Dashboard', icon: 'fa-gauge-high', to: '/dashboard' },
    { label: 'Payslips', icon: 'fa-receipt', to: '/payslips' },
    { label: 'Attendance', icon: 'fa-calendar-day', to: '/attendance' },
    { label: 'Regularize', icon: 'fa-clock-rotate-left', to: '/attendance-regularization' },
    { label: 'Leave', icon: 'fa-paper-plane', to: '/leave' },
    { label: 'Tax Declarations', icon: 'fa-file-invoice', to: '/declarations' },
    { label: 'Letters', icon: 'fa-envelope-open-text', to: '/letters' },
    { label: 'Documents', icon: 'fa-file-lines', to: '/documents' },
    { label: 'Expenses', icon: 'fa-file-invoice-dollar', to: '/expense-claims' },
];

export default function EssLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="win-app">
            <div className="menubar-shell">
                <div className="menubar-brand">
                    <i className="fas fa-user-circle"></i>
                    <span>MpxHR — Employee Self-Service</span>
                    <div className="spacer"></div>
                    <div className="menubar-context">
                        <span>{user?.username}</span>
                        <button className="menubar-logout" onClick={logout}>Logout</button>
                    </div>
                </div>
                <div className="win-toolbar">
                    {NAV.map((item) => (
                        <button
                            key={item.to}
                            className={`win-toolbar-btn ${location.pathname === item.to ? 'active' : ''}`}
                            onClick={() => navigate(item.to)}
                        >
                            <i className={`fas ${item.icon}`}></i>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="win-workspace">
                <Outlet />
            </div>
        </div>
    );
}
