import { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';
import { useAppState } from '../context/AppStateContext';
import DialogWindow from '../components/layout/DialogWindow';

export default function EmailLog() {
    const { companyId } = useAppState();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get('/email-log', { params: { companyId: companyId || undefined } });
            setRows(data);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    const statusBar = <span>Total: <span className="val">{rows.length}</span></span>;

    return (
        <DialogWindow title="Email Log" icon="fa-envelope" statusBar={statusBar}>
            <p className="text-muted" style={{ marginTop: 0 }}>
                Every notification the system has sent (or, without SMTP configured, would have sent). "Logged" means no
                mail server is set up yet — see <code>SMTP_HOST</code> in the server's environment config.
            </p>
            {loading ? <p className="text-muted">Loading…</p> : (
                <table className="win-grid">
                    <thead><tr><th>To</th><th>Employee</th><th>Subject</th><th>Template</th><th>Status</th><th>Sent</th></tr></thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td>{r.to_address}</td>
                                <td>{r.first_name ? `${r.first_name} ${r.last_name}` : '—'}</td>
                                <td>{r.subject}</td>
                                <td>{r.template || '—'}</td>
                                <td>
                                    <span className={`win-badge ${r.status === 'Sent' ? 'ok' : r.status === 'Failed' ? 'bad' : 'neutral'}`} title={r.error || ''}>
                                        {r.status}
                                    </span>
                                </td>
                                <td>{new Date(r.created_at).toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && <tr><td colSpan={6} className="text-muted">No emails sent yet.</td></tr>}
                    </tbody>
                </table>
            )}
        </DialogWindow>
    );
}
