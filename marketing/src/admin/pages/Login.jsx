import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onExit }) {
    const { login } = useAuth();
    const [username, setUsername] = useState('vendor');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-app)', fontFamily: 'Tahoma, "Segoe UI", sans-serif', gap: 14,
        }}>
            <div className="win-dialog" style={{ width: 360 }}>
                <div className="win-titlebar-bar">
                    <i className="fas fa-key win-titlebar-icon"></i>
                    <span>License Control — Sign In</span>
                </div>
                <form onSubmit={handleSubmit} className="win-dialog-body">
                    <p className="text-muted" style={{ marginTop: 0, fontSize: 11.5 }}>Vendor access only.</p>
                    <div className="win-field stack" style={{ marginBottom: 10 }}>
                        <label>Username</label>
                        <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required style={{ width: '100%' }} />
                    </div>
                    <div className="win-field stack" style={{ marginBottom: 14 }}>
                        <label>Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%' }} />
                    </div>

                    {error && <p style={{ color: 'var(--danger)', fontSize: 11.5 }}>{error}</p>}

                    <div className="win-btn-bar" style={{ borderTop: 'none', paddingTop: 0 }}>
                        <button className="win-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </div>
                </form>
            </div>
            <button
                type="button"
                onClick={onExit}
                style={{ background: 'none', border: 'none', color: '#1a5aa8', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
                ← Back to MpxHR.com
            </button>
        </div>
    );
}
