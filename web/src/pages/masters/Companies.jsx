import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import DialogWindow from '../../components/layout/DialogWindow';
import { useAppState } from '../../context/AppStateContext';

const EMPTY = {
    name: '', code: '', phone: '', phone2: '', email: '', website: '',
    address: '', address2: '', address3: '', city: '', state: '', pincode: '',
    business_type: '', est_date: '', pan: '', tan: '', gstin: '', cin: '',
    pf_code: '', pf_est_code: '', pf_ext: '', pf_signatory: '',
    esi_code: '', esi_local_office: '', esi_signatory: '',
    pt_rc_no: '', pt_ec_no: '', tax_circle: '', tax_cit: '', lwf_reg_no: '',
    bank_name: '', bank_branch: '', bank_account: '', bank_ifsc: '', bank_micr: '',
    signatory_name: '', signatory_designation: '',
};

export default function Companies() {
    const { refreshCompanies } = useAppState();
    const [companies, setCompanies] = useState([]);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/companies');
        setCompanies(data);
        return data;
    }, []);

    useEffect(() => { load(); }, [load]);

    function selectCompany(c) {
        setSelected(c);
        setForm({ ...EMPTY, ...c });
        setError('');
    }

    function startNew() {
        setSelected({});
        setForm(EMPTY);
        setError('');
    }

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    async function handleSave(e) {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            if (selected?.id) {
                await apiClient.put(`/companies/${selected.id}`, form);
            } else {
                const { data } = await apiClient.post('/companies', form);
                setSelected(data);
            }
            const list = await load();
            const updated = list.find((c) => c.id === (selected?.id || form.id));
            if (updated) setForm({ ...EMPTY, ...updated });
            await refreshCompanies(); // keep the global Company selector (top bar) in sync
        } catch (err) {
            setError(err.response?.data?.error || 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!selected?.id) return;
        if (!confirm(`Delete "${form.name}"? This removes its branches, employees and payroll data.`)) return;
        await apiClient.delete(`/companies/${selected.id}`);
        setSelected(null);
        setForm(EMPTY);
        load();
        refreshCompanies();
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12, alignItems: 'start' }}>
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
                    <button className="win-btn small" style={{ width: '100%' }} onClick={startNew}>+ New Company</button>
                </div>
                {companies.map((c) => (
                    <div key={c.id} onClick={() => selectCompany(c)}
                        style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #ddd8c4', background: selected?.id === c.id ? '#cfe4ff' : 'transparent', fontSize: 11.5 }}>
                        {c.name}
                    </div>
                ))}
                {companies.length === 0 && <div className="text-muted" style={{ padding: 10 }}>No companies yet.</div>}
            </div>

            {selected ? (
                <DialogWindow title="Company Details" icon="fa-landmark" onClose={() => setSelected(null)}>
                    <form onSubmit={handleSave}>
                        <div className="win-row">
                            <div className="win-field stack" style={{ flex: 1 }}><label>Company Name *</label><input value={form.name} onChange={set('name')} required style={{ width: '100%' }} /></div>
                            <div className="win-field stack"><label>Code</label><input value={form.code || ''} onChange={set('code')} /></div>
                            <div className="win-field stack"><label>Business Type</label><input value={form.business_type || ''} onChange={set('business_type')} /></div>
                        </div>
                        <div className="win-row">
                            <div className="win-field stack" style={{ flex: 1 }}><label>Address</label><input value={form.address || ''} onChange={set('address')} style={{ width: '100%' }} /></div>
                            <div className="win-field stack"><label>City</label><input value={form.city || ''} onChange={set('city')} /></div>
                            <div className="win-field stack"><label>State</label><input value={form.state || ''} onChange={set('state')} /></div>
                            <div className="win-field stack"><label>Pincode</label><input value={form.pincode || ''} onChange={set('pincode')} /></div>
                        </div>
                        <div className="win-row">
                            <div className="win-field stack"><label>Phone</label><input value={form.phone || ''} onChange={set('phone')} /></div>
                            <div className="win-field stack"><label>Email</label><input value={form.email || ''} onChange={set('email')} /></div>
                            <div className="win-field stack"><label>Website</label><input value={form.website || ''} onChange={set('website')} /></div>
                        </div>

                        <div className="win-row" style={{ alignItems: 'flex-start' }}>
                            <div className="groupbox" style={{ flex: 1 }}>
                                <div className="groupbox-label">PF</div>
                                <div className="win-field stack" style={{ marginBottom: 6 }}><label>Company PF No.</label><input value={form.pf_code || ''} onChange={set('pf_code')} /></div>
                                <div className="win-field stack" style={{ marginBottom: 6 }}><label>PF Establishment Code</label><input value={form.pf_est_code || ''} onChange={set('pf_est_code')} /></div>
                                <div className="win-field stack"><label>PF Signatory</label><input value={form.pf_signatory || ''} onChange={set('pf_signatory')} /></div>
                            </div>
                            <div className="groupbox" style={{ flex: 1 }}>
                                <div className="groupbox-label">ESI</div>
                                <div className="win-field stack" style={{ marginBottom: 6 }}><label>Company ESI No.</label><input value={form.esi_code || ''} onChange={set('esi_code')} /></div>
                                <div className="win-field stack" style={{ marginBottom: 6 }}><label>ESI Local Office</label><input value={form.esi_local_office || ''} onChange={set('esi_local_office')} /></div>
                                <div className="win-field stack"><label>ESI Signatory</label><input value={form.esi_signatory || ''} onChange={set('esi_signatory')} /></div>
                            </div>
                            <div className="groupbox" style={{ flex: 1 }}>
                                <div className="groupbox-label">TDS / PT / LWF</div>
                                <div className="win-field stack" style={{ marginBottom: 6 }}><label>PAN</label><input value={form.pan || ''} onChange={set('pan')} /></div>
                                <div className="win-field stack" style={{ marginBottom: 6 }}><label>TAN</label><input value={form.tan || ''} onChange={set('tan')} /></div>
                                <div className="win-field stack" style={{ marginBottom: 6 }}><label>GSTIN</label><input value={form.gstin || ''} onChange={set('gstin')} /></div>
                                <div className="win-field stack" style={{ marginBottom: 6 }}><label>PT RC No.</label><input value={form.pt_rc_no || ''} onChange={set('pt_rc_no')} /></div>
                                <div className="win-field stack"><label>LWF Registration No.</label><input value={form.lwf_reg_no || ''} onChange={set('lwf_reg_no')} /></div>
                            </div>
                        </div>

                        <div className="groupbox">
                            <div className="groupbox-label">Bank &amp; Signatory</div>
                            <div className="win-row">
                                <div className="win-field stack"><label>Bank Name</label><input value={form.bank_name || ''} onChange={set('bank_name')} /></div>
                                <div className="win-field stack"><label>Branch</label><input value={form.bank_branch || ''} onChange={set('bank_branch')} /></div>
                                <div className="win-field stack"><label>Account No.</label><input value={form.bank_account || ''} onChange={set('bank_account')} /></div>
                                <div className="win-field stack"><label>IFSC</label><input value={form.bank_ifsc || ''} onChange={set('bank_ifsc')} /></div>
                            </div>
                            <div className="win-row">
                                <div className="win-field stack"><label>Authorized Signatory</label><input value={form.signatory_name || ''} onChange={set('signatory_name')} /></div>
                                <div className="win-field stack"><label>Designation</label><input value={form.signatory_designation || ''} onChange={set('signatory_designation')} /></div>
                            </div>
                        </div>

                        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

                        <div className="win-btn-bar">
                            <button type="button" className="win-btn outline" onClick={startNew}>New</button>
                            <button type="submit" className="win-btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                            {selected.id && <button type="button" className="win-btn danger" onClick={handleDelete}>Delete</button>}
                            <button type="button" className="win-btn outline" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </form>
                </DialogWindow>
            ) : (
                <div className="card text-muted">Select a company on the left, or create a new one.</div>
            )}
        </div>
    );
}
