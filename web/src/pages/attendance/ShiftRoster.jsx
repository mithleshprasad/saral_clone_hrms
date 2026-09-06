import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import FormModal from '../../components/layout/FormModal';

const EMPTY_FORM = { employee_id: '', shift_id: '', start_date: '', end_date: '' };

export default function ShiftRoster() {
    const { companyId } = useAppState();
    const [roster, setRoster] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const today = new Date().toISOString().slice(0, 10);
        const [rosterRes, empRes, shiftRes] = await Promise.all([
            apiClient.get('/shift-roster', { params: { companyId: companyId || undefined, from: today } }),
            apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }),
            apiClient.get('/shifts', { params: { company_id: companyId || undefined } }),
        ]);
        setRoster(rosterRes.data);
        setEmployees(empRes.data.employees);
        setShifts(shiftRes.data);
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    async function handleAssign(e) {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const { data } = await apiClient.post('/shift-roster', form);
            setForm(EMPTY_FORM);
            setShowNew(false);
            load();
            return data;
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to assign shift');
        } finally {
            setSaving(false);
        }
    }

    async function removeEntry(id) {
        if (!confirm('Remove this day\'s shift assignment?')) return;
        await apiClient.delete(`/shift-roster/${id}`);
        load();
    }

    const statusBar = <span>Upcoming Assignments: <span className="val">{roster.length}</span></span>;

    return (
        <DialogWindow title="Shift Roster" icon="fa-calendar-days" statusBar={statusBar}>
            <p className="text-muted" style={{ fontSize: 11 }}>
                Assigns a shift to an employee across a date range — showing today onward. Re-assigning a date just changes which shift it points to.
            </p>
            <div className="win-btn-bar" style={{ marginBottom: 8 }}>
                <button className="win-btn" onClick={() => setShowNew(true)}><i className="fas fa-plus"></i> New Assignment</button>
            </div>

            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

            <table className="win-grid">
                <thead><tr><th>Employee</th><th>Date</th><th>Shift</th><th>Timing</th><th></th></tr></thead>
                <tbody>
                    {roster.map((r) => (
                        <tr key={r.id}>
                            <td>{r.employee_code ? `${r.employee_code} — ` : ''}{r.first_name} {r.last_name}</td>
                            <td>{r.date}</td>
                            <td>{r.shift_name}</td>
                            <td>{r.start_time || '—'}{r.start_time && r.end_time ? ' – ' : ''}{r.end_time || ''}</td>
                            <td><button className="win-btn danger small" onClick={() => removeEntry(r.id)}>✕</button></td>
                        </tr>
                    ))}
                    {roster.length === 0 && <tr><td colSpan={5} className="text-muted">No upcoming shift assignments.</td></tr>}
                </tbody>
            </table>

            {showNew && (
                <FormModal title="New Shift Assignment" icon="fa-calendar-days" onClose={() => setShowNew(false)} width={520}>
                    <form onSubmit={handleAssign}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Employee</label>
                                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required>
                                    <option value="">—</option>
                                    {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Shift</label>
                                <select value={form.shift_id} onChange={(e) => setForm({ ...form, shift_id: e.target.value })} required>
                                    <option value="">—</option>
                                    {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="form-field"><label>From</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required /></div>
                            <div className="form-field"><label>To</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required /></div>
                        </div>
                        <div className="win-btn-bar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                            <button type="button" className="win-btn outline" onClick={() => setShowNew(false)}>Cancel</button>
                            <button type="submit" className="win-btn" disabled={saving}>{saving ? 'Assigning…' : 'Assign'}</button>
                        </div>
                    </form>
                </FormModal>
            )}
        </DialogWindow>
    );
}
