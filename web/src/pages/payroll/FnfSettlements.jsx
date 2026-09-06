import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';

export default function FnfSettlements() {
    const { companyId } = useAppState();
    const [settlements, setSettlements] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selected, setSelected] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({
        employee_id: '', date_of_leaving: '', reason_for_leaving: '',
        include_last_month_salary: true, include_pending_loan: true,
        gratuity_amount: 0, leave_encashment_amount: 0,
    });
    const [itemForm, setItemForm] = useState({ type: 'Deduction', description: '', modified_amount: 0 });
    const [error, setError] = useState('');

    const loadList = useCallback(async () => {
        const { data } = await apiClient.get('/fnf-settlements', { params: { companyId: companyId || undefined } });
        setSettlements(data);
    }, [companyId]);

    useEffect(() => { loadList(); }, [loadList]);
    useEffect(() => {
        apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }).then((res) => setEmployees(res.data.employees));
    }, [companyId]);

    async function openSettlement(id) {
        setError('');
        const { data } = await apiClient.get(`/fnf-settlements/${id}`);
        setSelected(data);
    }

    async function handleCreate(e) {
        e.preventDefault();
        setError('');
        try {
            const { data } = await apiClient.post('/fnf-settlements', createForm);
            setShowCreate(false);
            setCreateForm({ employee_id: '', date_of_leaving: '', reason_for_leaving: '', include_last_month_salary: true, include_pending_loan: true, gratuity_amount: 0, leave_encashment_amount: 0 });
            await loadList();
            openSettlement(data.id);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create settlement');
        }
    }

    async function addItem(e) {
        e.preventDefault();
        if (!itemForm.description) return;
        await apiClient.post(`/fnf-settlements/${selected.id}/items`, { ...itemForm, actual_amount: itemForm.modified_amount });
        setItemForm({ type: 'Deduction', description: '', modified_amount: 0 });
        openSettlement(selected.id);
    }

    async function updateItemAmount(item, value) {
        await apiClient.put(`/fnf-settlements/${selected.id}/items/${item.id}`, { description: item.description, modified_amount: value, tds_ref: item.tds_ref });
        openSettlement(selected.id);
    }

    async function removeItem(itemId) {
        await apiClient.delete(`/fnf-settlements/${selected.id}/items/${itemId}`);
        openSettlement(selected.id);
    }

    async function finalize() {
        await apiClient.post(`/fnf-settlements/${selected.id}/finalize`);
        openSettlement(selected.id);
        loadList();
    }

    async function remove(id) {
        if (!confirm('Delete this settlement?')) return;
        await apiClient.delete(`/fnf-settlements/${id}`);
        if (selected?.id === id) setSelected(null);
        loadList();
    }

    return (
        <div>
            <div className="win-btn-bar" style={{ marginBottom: 8, justifyContent: 'flex-end' }}>
                <button className="win-btn" onClick={() => setShowCreate(true)}><i className="fas fa-plus"></i> Create Settlement</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
                <div className="card" style={{ padding: 0 }}>
                    {settlements.map((s) => (
                        <div key={s.id} onClick={() => openSettlement(s.id)}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #ddd8c4', background: selected?.id === s.id ? '#cfe4ff' : 'transparent' }}>
                            <div style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>Left: {s.date_of_leaving} · <span className={`win-badge ${s.status === 'Created' ? 'ok' : 'warn'}`}>{s.status}</span></div>
                        </div>
                    ))}
                    {settlements.length === 0 && <p className="text-muted" style={{ padding: 12 }}>No settlements yet.</p>}
                </div>

                {selected ? (
                    <DialogWindow
                        title={`Full & Final Settlement — ${selected.first_name} ${selected.last_name}`}
                        icon="fa-user-slash"
                        onClose={() => setSelected(null)}
                        statusBar={<>
                            <span>Total Earnings: <span className="val">₹{Number(selected.total_earnings).toLocaleString()}</span></span>
                            <span>Total Deductions: <span className="val">₹{Number(selected.total_deductions).toLocaleString()}</span></span>
                            <span>Net Amount: <span className="val">₹{Number(selected.net_amount).toLocaleString()}</span></span>
                        </>}
                    >
                        <div className="win-row" style={{ marginBottom: 12 }}>
                            <div><span className="text-muted">Date of Joining:</span> {selected.date_of_joining || '—'}</div>
                            <div><span className="text-muted">Date of Leaving:</span> {selected.date_of_leaving || '—'}</div>
                            <div><span className="text-muted">Department:</span> {selected.department_name || '—'}</div>
                            <div><span className="text-muted">Designation:</span> {selected.position_title || '—'}</div>
                        </div>

                        <table className="win-grid" style={{ marginBottom: 12 }}>
                            <thead><tr><th>Type</th><th>Description</th><th>Actual</th><th>Modified</th><th></th></tr></thead>
                            <tbody>
                                {selected.items.map((item) => (
                                    <tr key={item.id}>
                                        <td><span className={`win-badge ${item.type === 'Earning' ? 'ok' : 'bad'}`}>{item.type}</span></td>
                                        <td>{item.description}</td>
                                        <td>{Number(item.actual_amount).toLocaleString()}</td>
                                        <td>
                                            <input type="number" defaultValue={item.modified_amount} style={{ width: 110 }}
                                                onBlur={(e) => updateItemAmount(item, e.target.value)} />
                                        </td>
                                        <td><button className="win-btn danger small" onClick={() => removeItem(item.id)}>✕</button></td>
                                    </tr>
                                ))}
                                {selected.items.length === 0 && <tr><td colSpan={5} className="text-muted">No line items.</td></tr>}
                            </tbody>
                        </table>

                        <form onSubmit={addItem} className="flex-gap" style={{ marginBottom: 20 }}>
                            <select value={itemForm.type} onChange={(e) => setItemForm({ ...itemForm, type: e.target.value })}>
                                <option>Earning</option><option>Deduction</option>
                            </select>
                            <input placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
                            <input type="number" placeholder="Amount" value={itemForm.modified_amount} onChange={(e) => setItemForm({ ...itemForm, modified_amount: e.target.value })} style={{ width: 110 }} />
                            <button className="win-btn outline small" type="submit">Add Item</button>
                        </form>

                        <div className="win-btn-bar">
                            <button className="win-btn danger" onClick={() => remove(selected.id)}>Remove</button>
                            {selected.status === 'Draft' && <button className="win-btn" onClick={finalize}>Create</button>}
                        </div>
                    </DialogWindow>
                ) : (
                    <div className="card text-muted">Select a settlement, or create a new one.</div>
                )}
            </div>

            {showCreate && (
                <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
                    <div className="win-dialog" style={{ width: 'min(640px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
                        <div className="win-titlebar-bar">
                            <i className="fas fa-user-slash win-titlebar-icon"></i>
                            <span>Create Full &amp; Final Settlement</span>
                            <div className="spacer"></div>
                            <div className="win-close" onClick={() => setShowCreate(false)}>✕</div>
                        </div>
                        <form onSubmit={handleCreate} className="win-dialog-body">
                            <div className="form-grid">
                                <div className="form-field">
                                    <label>Employee</label>
                                    <select value={createForm.employee_id} onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })} required>
                                        <option value="">—</option>
                                        {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
                                    </select>
                                </div>
                                <div className="form-field"><label>Left On</label><input type="date" value={createForm.date_of_leaving} onChange={(e) => setCreateForm({ ...createForm, date_of_leaving: e.target.value })} required /></div>
                                <div className="form-field" style={{ gridColumn: '1 / -1' }}><label>Reason for Leaving</label><input value={createForm.reason_for_leaving} onChange={(e) => setCreateForm({ ...createForm, reason_for_leaving: e.target.value })} /></div>
                                <div className="form-field"><label>Gratuity Amount</label><input type="number" value={createForm.gratuity_amount} onChange={(e) => setCreateForm({ ...createForm, gratuity_amount: e.target.value })} /></div>
                                <div className="form-field"><label>Leave Encashment Amount</label><input type="number" value={createForm.leave_encashment_amount} onChange={(e) => setCreateForm({ ...createForm, leave_encashment_amount: e.target.value })} /></div>
                            </div>
                            <div className="mt-16">
                                <label className="flex-gap"><input type="checkbox" checked={createForm.include_last_month_salary} onChange={(e) => setCreateForm({ ...createForm, include_last_month_salary: e.target.checked })} /> Include last month salary (Detailed)</label>
                                <label className="flex-gap mt-16"><input type="checkbox" checked={createForm.include_pending_loan} onChange={(e) => setCreateForm({ ...createForm, include_pending_loan: e.target.checked })} /> Include pending loan amount</label>
                            </div>
                            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
                            <div className="win-btn-bar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                                <button type="button" className="win-btn outline" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="win-btn">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
