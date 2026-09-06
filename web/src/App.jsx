import { AuthProvider, useAuth } from './context/AuthContext';
import { AppStateProvider } from './context/AppStateContext';
import AppLayout from './components/layout/AppLayout';
import EssWorkspace from './EssWorkspace';
import Login from './pages/Login';

// One app, one login, three workspaces picked purely by the signed-in user's role:
// Employee gets EssWorkspace (self-service), everyone else (Admin/HR/Super Admin) gets the
// MDI admin console — Super Admin additionally sees the Application Control menu item
// inside it (gated in menuConfig.js/MenuBar.jsx), rather than a wholly separate app.
//
// No react-router at this level, deliberately: AppLayout owns an MDI-style desktop where
// each open window carries its own isolated router (see WindowManagerContext/MdiDesktop/
// MdiWindowFrame), and EssWorkspace mounts its own <BrowserRouter> — react-router forbids
// nesting a <Router> inside another <Router>, so the app shell itself stays router-free and
// switches between Login/EssWorkspace/AppLayout purely off AuthContext's `user` state, and
// only ever mounts one of those routers at a time.
function AuthGate() {
    const { user } = useAuth();
    if (!user) return <Login />;
    if (user.role === 'Employee') return <EssWorkspace />;
    return <AppLayout />;
}

export default function App() {
    return (
        <AuthProvider>
            <AppStateProvider>
                <AuthGate />
            </AppStateProvider>
        </AuthProvider>
    );
}
