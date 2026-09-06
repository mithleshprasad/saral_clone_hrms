import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';

const EMPTY_FORM = { leave_type: '', start_date: '', end_date: '', reason: '' };

export default function EssLeave() {
    const [balance, setBalance] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const [balRes, leavesRes, typesRes] = await Promise.all([
            apiClient.get('/ess/leave-balance'),
            apiClient.get('/ess/leaves'),
            apiClient.get('/ess/leave-types'),
        ]);
        setBalance(balRes.data);
        setLeaves(leavesRes.data.data);
        setLeaveTypes(typesRes.data);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            await apiClient.post('/ess/leaves', form);
            setForm(EMPTY_FORM);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit request');
        }
    }

    return (
        <div>
            <div className="page-header"><h1>My Leave</h1></div>

            {balance.length > 0 && (
                <div className="stat-grid">
                    {balance.map((b) => (
                        <div className="stat-card" key={b.id}>
                            <div className="label">{b.leave_type}</div>
                            <div className="value">{(Number(b.balance) - Number(b.used)).toFixed(1)}</div>
                            <div className="text-muted" style={{ fontSize: 10.5 }}>of {b.balance} allotted</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="groupbox" style={{ marginBottom: 16 }}>
                <div className="groupbox-label">Apply for Leave</div>
                <form onSubmit={handleSubmit} className="win-row" style={{ alignItems: 'flex-end' }}>
                    <div className="win-field stack">
                        <label>Type</label>
                        <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })} required>
                            <option value="">—</option>
                            {leaveTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="win-field stack"><label>From</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required /></div>
                    <div className="win-field stack"><label>To</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required /></div>
                    <div className="win-field stack" style={{ flex: 1 }}><label>Reason</label><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={{ width: '100%' }} /></div>
                    <button className="win-btn" type="submit">Submit</button>
                </form>
                {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>

            <table className="win-grid">
                <thead><tr><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                    {leaves.map((l) => (
                        <tr key={l.id}>
                            <td>{l.leave_type}</td>
                            <td>{l.start_date}</td>
                            <td>{l.end_date}</td>
                            <td>{l.reason}</td>
                            <td><span className={`win-badge ${l.status === 'Approved' ? 'ok' : l.status === 'Rejected' ? 'bad' : 'warn'}`}>{l.status}</span></td>
                        </tr>
                    ))}
                    {leaves.length === 0 && <tr><td colSpan={5} className="text-muted">No leave requests yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
