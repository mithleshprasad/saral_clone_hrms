import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import TopBar from './components/TopBar';
import Login from './pages/Login';
import Licenses from './pages/Licenses';
import PaymentSettings from './pages/PaymentSettings';
import Transactions from './pages/Transactions';
import './styles/theme.css';
import './styles/winclassic.css';

const TABS = [
    ['licenses', 'Licenses & Plans'],
    ['payments', 'Payment Settings'],
    ['transactions', 'Transactions'],
];

function AdminShell({ onExit }) {
    const { user } = useAuth();
    const [tab, setTab] = useState('licenses');
    if (!user) return <Login onExit={onExit} />;
    return (
        <div className="win-app">
            <TopBar onExit={onExit} />
            <div className="win-tabs" style={{ margin: '8px 10px 0' }}>
                {TABS.map(([key, label]) => (
                    <div key={key} className={`win-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
                ))}
            </div>
            <div className="win-workspace">
                {tab === 'licenses' && <Licenses />}
                {tab === 'payments' && <PaymentSettings />}
                {tab === 'transactions' && <Transactions />}
            </div>
        </div>
    );
}

// This is the internal, authenticated tool the MpxHR team uses to issue and manage client
// licenses — a different audience from the public marketing site and docs, so it's not
// reachable from the main nav; only via a quiet footer link and the #admin deep link.
// It keeps its own visual language (the dense Windows-Classic admin skin, matching the
// product itself) rather than being restyled to match the marketing site, since it's a
// backoffice tool, not a customer-facing page — the point is that entering/leaving it is
// unmistakable, not that it looks like the landing page.
export default function AdminApp({ onExit }) {
    return (
        <div className="admin-shell">
            <AuthProvider>
                <AdminShell onExit={onExit} />
            </AuthProvider>
        </div>
    );
}
