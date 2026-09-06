import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';

const STATUSES = ['Present', 'Absent', 'Half-Day', 'Late', 'On Leave'];
const EMPTY_FORM = { date: '', requested_status: 'Present', reason: '' };

export default function EssAttendanceRegularization() {
    const [requests, setRequests] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/ess/attendance-regularizations');
        setRequests(data);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            await apiClient.post('/ess/attendance-regularizations', form);
            setForm(EMPTY_FORM);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit request');
        }
    }

    return (
        <div>
            <div className="page-header"><h1>Attendance Regularization</h1></div>

            <div className="groupbox" style={{ marginBottom: 16 }}>
                <div className="groupbox-label">Request a Correction</div>
                <form onSubmit={handleSubmit} className="win-row" style={{ alignItems: 'flex-end' }}>
                    <div className="win-field stack"><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
                    <div className="win-field stack">
                        <label>Should Be</label>
                        <select value={form.requested_status} onChange={(e) => setForm({ ...form, requested_status: e.target.value })}>
                            {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="win-field stack" style={{ flex: 1 }}><label>Reason</label><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={{ width: '100%' }} required /></div>
                    <button className="win-btn" type="submit">Submit</button>
                </form>
                {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>

            <table className="win-grid">
                <thead><tr><th>Date</th><th>Requested Status</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                    {requests.map((r) => (
                        <tr key={r.id}>
                            <td>{r.date}</td>
                            <td>{r.requested_status}</td>
                            <td>{r.reason}</td>
                            <td><span className={`win-badge ${r.status === 'Approved' ? 'ok' : r.status === 'Rejected' ? 'bad' : 'warn'}`}>{r.status}</span></td>
                        </tr>
                    ))}
                    {requests.length === 0 && <tr><td colSpan={4} className="text-muted">No regularization requests yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
