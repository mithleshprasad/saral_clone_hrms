import { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';
import { useAppState } from '../context/AppStateContext';
import DialogWindow from '../components/layout/DialogWindow';

const ENTITY_TYPES = ['', 'Employee', 'Payroll', 'Company', 'User'];

export default function AuditLog() {
    const { companyId } = useAppState();
    const [rows, setRows] = useState([]);
    const [entityType, setEntityType] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get('/audit-log', { params: { companyId: companyId || undefined, entityType: entityType || undefined } });
            setRows(data);
        } finally {
            setLoading(false);
        }
    }, [companyId, entityType]);

    useEffect(() => { load(); }, [load]);

    const statusBar = <span>Total: <span className="val">{rows.length}</span></span>;

    return (
        <DialogWindow title="Audit Log" icon="fa-clipboard-list" statusBar={statusBar}>
            <p className="text-muted" style={{ marginTop: 0 }}>
                Who created, changed, or deleted what — Employees, Payroll, Companies, and ESS logins.
            </p>
            <div className="win-row">
                <div className="win-field">
                    <label>Entity</label>
                    <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                        {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t || 'All'}</option>)}
                    </select>
                </div>
            </div>
            {loading ? <p className="text-muted">Loading…</p> : (
                <table className="win-grid">
                    <thead><tr><th>When</th><th>By</th><th>Action</th><th>Entity</th><th>Summary</th></tr></thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td>{new Date(r.created_at).toLocaleString('en-IN')}</td>
                                <td>{r.username || '—'}</td>
                                <td>
                                    <span className={`win-badge ${r.action === 'Delete' ? 'bad' : r.action === 'Create' ? 'ok' : 'warn'}`}>{r.action}</span>
                                </td>
                                <td>{r.entity_type}</td>
                                <td>{r.summary}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && <tr><td colSpan={5} className="text-muted">No activity logged yet.</td></tr>}
                    </tbody>
                </table>
            )}
        </DialogWindow>
    );
}
