import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import FormModal from '../../components/layout/FormModal';

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];
const EMPTY_FORM = { employee_id: '', category: 'IT', priority: 'Medium', subject: '', description: '' };

export default function Tickets() {
    const { companyId } = useAppState();
    const [employees, setEmployees] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    useEffect(() => {
        apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }).then((res) => setEmployees(res.data.employees));
    }, [companyId]);

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/tickets', { params: { company_id: companyId || undefined } });
        setTickets(data);
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    async function handleCreate(e) {
        e.preventDefault();
        if (!form.subject.trim()) return;
        await apiClient.post('/tickets', { ...form, company_id: companyId || undefined });
        setForm(EMPTY_FORM);
        setShowNew(false);
        load();
    }

    async function updateStatus(ticket, status) {
        await apiClient.put(`/tickets/${ticket.id}/status`, { status });
        load();
    }

    const open = tickets.filter((t) => t.status !== 'Closed' && t.status !== 'Resolved').length;
    const statusBar = (
        <>
            <span>Total Tickets: <span className="val">{tickets.length}</span></span>
            <span>Open: <span className="val">{open}</span></span>
        </>
    );

    return (
        <DialogWindow title="Helpdesk Tickets" icon="fa-headset" statusBar={statusBar}>
            <div className="win-btn-bar" style={{ marginBottom: 8 }}>
                <button className="win-btn" onClick={() => setShowNew(true)}><i className="fas fa-plus"></i> New Ticket</button>
            </div>

            <table className="win-grid">
                <thead><tr><th>Employee</th><th>Category</th><th>Priority</th><th>Subject</th><th>Status</th></tr></thead>
                <tbody>
                    {tickets.map((t) => (
                        <tr key={t.id}>
                            <td>{t.first_name ? `${t.first_name} ${t.last_name}` : '—'}</td>
                            <td>{t.category}</td>
                            <td><span className={`win-badge ${t.priority === 'Urgent' || t.priority === 'High' ? 'bad' : 'neutral'}`}>{t.priority}</span></td>
                            <td>{t.subject}</td>
                            <td>
                                <select value={t.status || 'Open'} onChange={(e) => updateStatus(t, e.target.value)}>
                                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                                </select>
                            </td>
                        </tr>
                    ))}
                    {tickets.length === 0 && <tr><td colSpan={5} className="text-muted">No tickets yet.</td></tr>}
                </tbody>
            </table>

            {showNew && (
                <FormModal title="New Ticket" icon="fa-headset" onClose={() => setShowNew(false)} width={560}>
                    <form onSubmit={handleCreate}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Employee</label>
                                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                                    <option value="">—</option>
                                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Category</label>
                                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    <option>IT</option><option>HR</option><option>Payroll</option><option>Facilities</option><option>Other</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Priority</label>
                                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                    <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
                                </select>
                            </div>
                            <div className="form-field"><label>Subject</label><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
                            <div className="form-field" style={{ gridColumn: '1 / -1' }}><label>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                        </div>
                        <div className="win-btn-bar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                            <button type="button" className="win-btn outline" onClick={() => setShowNew(false)}>Cancel</button>
                            <button type="submit" className="win-btn">Create Ticket</button>
                        </div>
                    </form>
                </FormModal>
            )}
        </DialogWindow>
    );
}
