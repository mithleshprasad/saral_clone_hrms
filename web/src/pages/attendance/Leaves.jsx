import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import FormModal from '../../components/layout/FormModal';

const EMPTY_FORM = { employee_id: '', leave_type: '', start_date: '', end_date: '', reason: '' };

export default function Leaves() {
    const { companyId } = useAppState();
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const [leavesRes, empRes, typesRes] = await Promise.all([
            apiClient.get('/leaves', { params: { companyId: companyId || undefined, limit: 200 } }),
            apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }),
            apiClient.get('/leave-types', { params: { company_id: companyId || undefined } }),
        ]);
        setLeaves(leavesRes.data.data);
        setEmployees(empRes.data.employees);
        setLeaveTypes(typesRes.data);
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    async function handleRequest(e) {
        e.preventDefault();
        setError('');
        try {
            await apiClient.post('/leaves', form);
            setForm(EMPTY_FORM);
            setShowNew(false);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit leave request');
        }
    }

    async function updateStatus(id, status) {
        await apiClient.put(`/leaves/${id}/status`, { status });
        load();
    }

    const pending = leaves.filter((l) => l.status === 'Pending').length;
    const statusBar = (
        <>
            <span>Total Requests: <span className="val">{leaves.length}</span></span>
            <span>Pending: <span className="val">{pending}</span></span>
        </>
    );

    return (
        <DialogWindow title="Leave Applications" icon="fa-paper-plane" statusBar={statusBar}>
            <div className="win-btn-bar" style={{ marginBottom: 8 }}>
                <button className="win-btn" onClick={() => setShowNew(true)}><i className="fas fa-plus"></i> New Leave Request</button>
            </div>

            <table className="win-grid">
                <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th></th></tr></thead>
                <tbody>
                    {leaves.map((l) => (
                        <tr key={l.id}>
                            <td>{l.first_name} {l.last_name}</td>
                            <td>{l.leave_type}</td>
                            <td>{l.start_date}</td>
                            <td>{l.end_date}</td>
                            <td>{l.reason}</td>
                            <td>
                                <span className={`win-badge ${l.status === 'Approved' ? 'ok' : l.status === 'Rejected' ? 'bad' : 'warn'}`}>{l.status}</span>
                            </td>
                            <td>
                                {l.status === 'Pending' && (
                                    <div className="flex-gap">
                                        <button className="win-btn small" onClick={() => updateStatus(l.id, 'Approved')}>Approve</button>
                                        <button className="win-btn danger small" onClick={() => updateStatus(l.id, 'Rejected')}>Reject</button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {leaves.length === 0 && <tr><td colSpan={7} className="text-muted">No leave requests yet.</td></tr>}
                </tbody>
            </table>

            {showNew && (
                <FormModal title="New Leave Request" icon="fa-paper-plane" onClose={() => setShowNew(false)} width={560}>
                    <form onSubmit={handleRequest}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Employee</label>
                                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required>
                                    <option value="">—</option>
                                    {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Leave Type</label>
                                <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })} required>
                                    <option value="">—</option>
                                    {leaveTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="form-field"><label>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required /></div>
                            <div className="form-field"><label>End Date</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required /></div>
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
