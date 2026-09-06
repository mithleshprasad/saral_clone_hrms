import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';

const CALC_TYPES = ['Lumpsum', '% of Basic', 'Every Month', 'Formula'];

export default function SalaryStructures() {
    const { companyId } = useAppState();
    const [structures, setStructures] = useState([]);
    const [selected, setSelected] = useState(null);
    const [components, setComponents] = useState([]);
    const [salaryHeads, setSalaryHeads] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [newStructureName, setNewStructureName] = useState('');
    const [componentForm, setComponentForm] = useState({ salary_head_id: '', calc_type: 'Lumpsum', calc_value: 0 });
    const [applyEmployeeId, setApplyEmployeeId] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const loadStructures = useCallback(async () => {
        const { data } = await apiClient.get('/salary-structures', { params: { company_id: companyId || undefined } });
        setStructures(data);
    }, [companyId]);

    useEffect(() => { loadStructures(); }, [loadStructures]);

    useEffect(() => {
        apiClient.get('/salary-heads', { params: { company_id: companyId || undefined } }).then((res) => setSalaryHeads(res.data));
        apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }).then((res) => setEmployees(res.data.employees));
    }, [companyId]);

    async function loadComponents(structure) {
        setSelected(structure);
        setError(''); setMessage('');
        const { data } = await apiClient.get(`/salary-structures/${structure.id}/components`);
        setComponents(data);
    }

    async function createStructure(e) {
        e.preventDefault();
        if (!newStructureName.trim()) return;
        const { data } = await apiClient.post('/salary-structures', { company_id: companyId, name: newStructureName });
        setNewStructureName('');
        await loadStructures();
        loadComponents(data);
    }

    async function deleteStructure(id) {
        if (!confirm('Delete this salary structure?')) return;
        await apiClient.delete(`/salary-structures/${id}`);
        if (selected?.id === id) { setSelected(null); setComponents([]); }
        loadStructures();
    }

    async function addComponent(e) {
        e.preventDefault();
        if (!componentForm.salary_head_id) return;
        await apiClient.post(`/salary-structures/${selected.id}/components`, componentForm);
        setComponentForm({ salary_head_id: '', calc_type: 'Lumpsum', calc_value: 0 });
        loadComponents(selected);
    }

    async function removeComponent(id) {
        await apiClient.delete(`/salary-structures/components/${id}`);
        loadComponents(selected);
    }

    async function applyToEmployee(e) {
        e.preventDefault();
        setError(''); setMessage('');
        try {
            const { data } = await apiClient.post(`/salary-structures/${selected.id}/apply`, { employeeId: applyEmployeeId });
            setMessage(`Applied to ${data.first_name} ${data.last_name}: Basic ₹${data.base_salary}, DA ₹${data.da_rate}, HRA ₹${data.hra_rate}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to apply structure');
        }
    }

    return (
        <DialogWindow title="Salary Structure" icon="fa-sitemap">
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
                <div className="card" style={{ padding: 0 }}>
                    <form onSubmit={createStructure} style={{ padding: 8, borderBottom: '1px solid var(--border)' }} className="flex-gap">
                        <input placeholder="New structure name" value={newStructureName} onChange={(e) => setNewStructureName(e.target.value)} style={{ flex: 1 }} />
                        <button className="win-btn small" type="submit">Add</button>
                    </form>
                    {structures.map((s) => (
                        <div
                            key={s.id}
                            onClick={() => loadComponents(s)}
                            style={{
                                padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #ddd8c4',
                                background: selected?.id === s.id ? '#cfe4ff' : 'transparent',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}
                        >
                            <span>{s.name}</span>
                            <button className="win-btn danger small" onClick={(e) => { e.stopPropagation(); deleteStructure(s.id); }}>✕</button>
                        </div>
                    ))}
                    {structures.length === 0 && <p className="text-muted" style={{ padding: 12 }}>No structures yet.</p>}
                </div>

                {selected ? (
                    <div className="groupbox">
                        <div className="groupbox-label">{selected.name} — Assign Heads</div>

                        <table className="win-grid" style={{ marginBottom: 12 }}>
                            <thead><tr><th>Salary Head</th><th>Calc Type</th><th>Value</th><th>PF</th><th>ESI</th><th>PT</th><th></th></tr></thead>
                            <tbody>
                                {components.map((c) => (
                                    <tr key={c.id}>
                                        <td>{c.salary_head_name}</td>
                                        <td>{c.calc_type}</td>
                                        <td>{c.calc_value}{c.calc_type === '% of Basic' ? '%' : ''}</td>
                                        <td>{c.consider_for_pf ? 'Yes' : 'No'}</td>
                                        <td>{c.consider_for_esi ? 'Yes' : 'No'}</td>
                                        <td>{c.consider_for_pt ? 'Yes' : 'No'}</td>
                                        <td><button className="win-btn danger small" onClick={() => removeComponent(c.id)}>Remove</button></td>
                                    </tr>
                                ))}
                                {components.length === 0 && <tr><td colSpan={7} className="text-muted">No heads assigned yet.</td></tr>}
                            </tbody>
                        </table>

                        <form onSubmit={addComponent} className="flex-gap" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
                            <select value={componentForm.salary_head_id} onChange={(e) => setComponentForm({ ...componentForm, salary_head_id: e.target.value })} required>
                                <option value="">Select salary head…</option>
                                {salaryHeads.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                            <select value={componentForm.calc_type} onChange={(e) => setComponentForm({ ...componentForm, calc_type: e.target.value })}>
                                {CALC_TYPES.map((t) => <option key={t}>{t}</option>)}
                            </select>
                            <input type="number" placeholder="Value" value={componentForm.calc_value} onChange={(e) => setComponentForm({ ...componentForm, calc_value: e.target.value })} style={{ width: 110 }} />
                            <button className="win-btn small" type="submit">Add Head</button>
                        </form>

                        <div className="groupbox-label" style={{ position: 'static', display: 'inline-block', marginBottom: 4 }}>Apply to Employee</div>
                        <p className="text-muted">Computes each component (using the employee's current Basic for % components) and writes the totals into that employee's salary fields.</p>
                        <form onSubmit={applyToEmployee} className="flex-gap">
                            <select value={applyEmployeeId} onChange={(e) => setApplyEmployeeId(e.target.value)} required>
                                <option value="">Select employee…</option>
                                {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                            </select>
                            <button className="win-btn small" type="submit" disabled={components.length === 0}>Apply</button>
                        </form>
                        {message && <p style={{ color: 'var(--success)' }}>{message}</p>}
                        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
                    </div>
                ) : (
                    <div className="groupbox text-muted">Select a structure on the left, or create one to start assigning salary heads.</div>
                )}
            </div>
        </DialogWindow>
    );
}
