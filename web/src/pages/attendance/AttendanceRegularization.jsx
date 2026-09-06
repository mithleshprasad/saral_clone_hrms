import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import FormModal from '../../components/layout/FormModal';

const STATUSES = ['Present', 'Absent', 'Half-Day', 'Late', 'On Leave'];
const EMPTY_FORM = { employee_id: '', date: '', requested_status: 'Present', reason: '' };

export default function AttendanceRegularization() {
    const { companyId } = useAppState();
    const [requests, setRequests] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const [reqRes, empRes] = await Promise.all([
            apiClient.get('/attendance-regularizations', { params: { companyId: companyId || undefined } }),
            apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }),
        ]);
        setRequests(reqRes.data);
        setEmployees(empRes.data.employees);
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    async function handleCreate(e) {
        e.preventDefault();
        setError('');
        try {
            await apiClient.post('/attendance-regularizations', form);
            setForm(EMPTY_FORM);
            setShowNew(false);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit request');
        }
    }

    async function review(id, status) {
        const remarks = status === 'Rejected' ? prompt('Reason for rejection (optional):') || '' : undefined;
        await apiClient.put(`/attendance-regularizations/${id}/review`, { status, remarks });
        load();
    }

    const pending = requests.filter((r) => r.status === 'Pending').length;
    const statusBar = (
        <>
            <span>Total Requests: <span className="val">{requests.length}</span></span>
            <span>Pending: <span className="val">{pending}</span></span>
        </>
    );

    return (
        <DialogWindow title="Attendance Regularization" icon="fa-clock-rotate-left" statusBar={statusBar}>
            <div className="win-btn-bar" style={{ marginBottom: 8 }}>
                <button className="win-btn" onClick={() => setShowNew(true)}><i className="fas fa-plus"></i> New Request</button>
            </div>

            <table className="win-grid">
                <thead><tr><th>Employee</th><th>Date</th><th>Requested Status</th><th>Reason</th><th>Status</th><th></th></tr></thead>
                <tbody>
                    {requests.map((r) => (
                        <tr key={r.id}>
                            <td>{r.first_name} {r.last_name}</td>
                            <td>{r.date}</td>
                            <td>{r.requested_status}</td>
                            <td>{r.reason}</td>
                            <td>
                                <span className={`win-badge ${r.status === 'Approved' ? 'ok' : r.status === 'Rejected' ? 'bad' : 'warn'}`}>{r.status}</span>
                            </td>
                            <td>
                                {r.status === 'Pending' && (
                                    <div className="flex-gap">
                                        <button className="win-btn small" onClick={() => review(r.id, 'Approved')}>Approve</button>
                                        <button className="win-btn danger small" onClick={() => review(r.id, 'Rejected')}>Reject</button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {requests.length === 0 && <tr><td colSpan={6} className="text-muted">No regularization requests yet.</td></tr>}
                </tbody>
            </table>

            {showNew && (
                <FormModal title="New Regularization Request" icon="fa-clock-rotate-left" onClose={() => setShowNew(false)} width={520}>
                    <form onSubmit={handleCreate}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Employee</label>
                                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required>
                                    <option value="">—</option>
                                    {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                                </select>
                            </div>
                            <div className="form-field"><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
                            <div className="form-field">
                                <label>Requested Status</label>
                                <select value={form.requested_status} onChange={(e) => setForm({ ...form, requested_status: e.target.value })}>
                                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-field" style={{ gridColumn: '1 / -1' }}><label>Reason</label><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
                        </div>
                        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
                        <div className="win-btn-bar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                            <button type="button" className="win-btn outline" onClick={() => setShowNew(false)}>Cancel</button>
                            <button type="submit" className="win-btn">Submit Request</button>
                        </div>
                    </form>
                </FormModal>
            )}
        </DialogWindow>
    );
}
