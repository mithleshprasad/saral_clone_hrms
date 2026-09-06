import { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';
import { useAppState } from '../context/AppStateContext';
import DialogWindow from '../components/layout/DialogWindow';

export default function SmsLog() {
    const { companyId } = useAppState();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get('/sms-log', { params: { companyId: companyId || undefined } });
            setRows(data);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    const statusBar = <span>Total: <span className="val">{rows.length}</span></span>;

    return (
        <DialogWindow title="SMS Log" icon="fa-comment-sms" statusBar={statusBar}>
            <p className="text-muted" style={{ marginTop: 0 }}>
                Every SMS notification the system has sent (or, without a gateway configured, would have sent). "Logged"
                means no SMS gateway is set up yet — see <code>SMS_API_URL</code> in the server's environment config.
            </p>
            {loading ? <p className="text-muted">Loading…</p> : (
                <table className="win-grid">
                    <thead><tr><th>To</th><th>Employee</th><th>Message</th><th>Template</th><th>Status</th><th>Sent</th></tr></thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td>{r.to_number}</td>
                                <td>{r.first_name ? `${r.first_name} ${r.last_name}` : '—'}</td>
                                <td style={{ maxWidth: 320 }}>{r.message}</td>
                                <td>{r.template || '—'}</td>
                                <td>
                                    <span className={`win-badge ${r.status === 'Sent' ? 'ok' : r.status === 'Failed' ? 'bad' : 'neutral'}`} title={r.error || ''}>
                                        {r.status}
                                    </span>
                                </td>
                                <td>{new Date(r.created_at).toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && <tr><td colSpan={6} className="text-muted">No SMS sent yet.</td></tr>}
                    </tbody>
                </table>
            )}
        </DialogWindow>
    );
}
