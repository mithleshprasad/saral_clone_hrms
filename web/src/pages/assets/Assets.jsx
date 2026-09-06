import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import FormModal from '../../components/layout/FormModal';

const EMPTY_FORM = { name: '', serial_number: '', type: '', value: 0 };

export default function Assets() {
    const { companyId } = useAppState();
    const [assets, setAssets] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [assignTarget, setAssignTarget] = useState({});

    useEffect(() => {
        apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }).then((res) => setEmployees(res.data.employees));
    }, [companyId]);

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/assets', { params: { company_id: companyId || undefined } });
        setAssets(data);
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    async function handleAdd(e) {
        e.preventDefault();
        if (!form.name.trim()) return;
        await apiClient.post('/assets', { ...form, company_id: companyId || undefined });
        setForm(EMPTY_FORM);
        setShowNew(false);
        load();
    }

    async function assign(asset) {
        const employeeId = assignTarget[asset.id];
        if (!employeeId) return;
        await apiClient.post(`/assets/${asset.id}/assign`, { employeeId });
        load();
    }

    async function returnAsset(asset) {
        await apiClient.post(`/assets/${asset.id}/return`);
        load();
    }

    async function remove(id) {
        if (!confirm('Delete this asset?')) return;
        await apiClient.delete(`/assets/${id}`);
        load();
    }

    const statusBar = <span>Total Assets: <span className="val">{assets.length}</span></span>;

    return (
        <DialogWindow title="Assets" icon="fa-laptop" statusBar={statusBar}>
            <div className="win-btn-bar" style={{ marginBottom: 8 }}>
                <button className="win-btn" onClick={() => setShowNew(true)}><i className="fas fa-plus"></i> New Asset</button>
            </div>

            <table className="win-grid">
                <thead><tr><th>Name</th><th>Serial</th><th>Type</th><th>Status</th><th>Assigned To</th><th>Value</th><th></th></tr></thead>
                <tbody>
                    {assets.map((a) => (
                        <tr key={a.id}>
                            <td>{a.name}</td>
                            <td>{a.serial_number}</td>
                            <td>{a.type}</td>
                            <td><span className={`win-badge ${a.status === 'Available' ? 'ok' : 'warn'}`}>{a.status}</span></td>
                            <td>{a.first_name ? `${a.first_name} ${a.last_name}` : '—'}</td>
                            <td>{a.value ? Number(a.value).toLocaleString() : '—'}</td>
                            <td>
                                <div className="flex-gap">
                                    {a.status === 'Available' ? (
                                        <>
                                            <select value={assignTarget[a.id] || ''} onChange={(e) => setAssignTarget({ ...assignTarget, [a.id]: e.target.value })}>
                                                <option value="">Assign to…</option>
                                                {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                                            </select>
                                            <button className="win-btn small" onClick={() => assign(a)}>Assign</button>
                                        </>
                                    ) : (
                                        <button className="win-btn small" onClick={() => returnAsset(a)}>Return</button>
                                    )}
                                    <button className="win-btn danger small" onClick={() => remove(a.id)}>Delete</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {assets.length === 0 && <tr><td colSpan={7} className="text-muted">No assets yet.</td></tr>}
                </tbody>
            </table>

            {showNew && (
                <FormModal title="New Asset" icon="fa-laptop" onClose={() => setShowNew(false)} width={520}>
                    <form onSubmit={handleAdd}>
                        <div className="form-grid">
                            <div className="form-field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                            <div className="form-field"><label>Serial Number</label><input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
                            <div className="form-field"><label>Type</label><input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
                            <div className="form-field"><label>Value</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                        </div>
                        <div className="win-btn-bar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                            <button type="button" className="win-btn outline" onClick={() => setShowNew(false)}>Cancel</button>
                            <button type="submit" className="win-btn">Add Asset</button>
                        </div>
                    </form>
                </FormModal>
            )}
        </DialogWindow>
    );
}
