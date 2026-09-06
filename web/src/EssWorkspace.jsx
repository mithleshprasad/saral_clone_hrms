import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import EssLayout from './components/ess/EssLayout';

import EssDashboard from './pages/ess/EssDashboard';
import EssPayslips from './pages/ess/EssPayslips';
import EssAttendance from './pages/ess/EssAttendance';
import EssAttendanceRegularization from './pages/ess/EssAttendanceRegularization';
import EssLeave from './pages/ess/EssLeave';
import EssDeclarations from './pages/ess/EssDeclarations';
import EssLetters from './pages/ess/EssLetters';
import EssDocuments from './pages/ess/EssDocuments';
import EssExpenseClaims from './pages/ess/EssExpenseClaims';

function NotLinked() {
    const { user, logout } = useAuth();
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
            <div className="win-dialog" style={{ width: 420 }}>
                <div className="win-titlebar-bar"><i className="fas fa-triangle-exclamation win-titlebar-icon"></i><span>Access Restricted</span></div>
                <div className="win-dialog-body">
                    <p>The account <strong>{user?.username}</strong> is not linked to an employee record, so it has nothing to self-serve here.</p>
                    <p className="text-muted" style={{ fontSize: 11 }}>Ask your HR admin to link this login to your employee profile.</p>
                    <button className="win-btn" onClick={logout}>Logout</button>
                </div>
            </div>
        </div>
    );
}

// Mounted only when AuthGate (App.jsx) has already resolved the signed-in user to the
// Employee role — no separate login/auth guard needed here, that's all handled one level
// up. Own BrowserRouter is safe to nest here (not inside AppLayout's MDI router-free
// shell) since AuthGate renders exactly one of Login / EssWorkspace / AppLayout at a time,
// never more than one router mounted simultaneously.
export default function EssWorkspace() {
    const { user } = useAuth();
    if (!user?.employeeId) return <NotLinked />;

    return (
        <BrowserRouter>
            <Routes>
                <Route element={<EssLayout />}>
                    <Route path="/dashboard" element={<EssDashboard />} />
                    <Route path="/payslips" element={<EssPayslips />} />
                    <Route path="/attendance" element={<EssAttendance />} />
                    <Route path="/attendance-regularization" element={<EssAttendanceRegularization />} />
                    <Route path="/leave" element={<EssLeave />} />
                    <Route path="/declarations" element={<EssDeclarations />} />
                    <Route path="/letters" element={<EssLetters />} />
                    <Route path="/documents" element={<EssDocuments />} />
                    <Route path="/expense-claims" element={<EssExpenseClaims />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
