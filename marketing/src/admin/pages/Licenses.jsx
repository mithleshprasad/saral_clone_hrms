import { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';

const ALL_FEATURES = ['payroll', 'attendance', 'leave', 'reports', 'statutory_filing', 'recruitment', 'ess', 'letters', 'assets', 'helpdesk', 'performance_reviews'];
const EMPTY_LICENSE = { client_name: '', contact_email: '', plan_id: '', expires_at: '', notes: '' };
const EMPTY_PLAN = { name: '', max_companies: '', max_employees: '', monthly_price_inr: '', features: [], price_notes: '' };
const EMPTY_PAYMENT = { amount_inr: '', extended_days: '30', reference: '', notes: '' };

function RecordPaymentModal({ license, onClose, onRecorded }) {
    const [form, setForm] = useState(EMPTY_PAYMENT);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    async function submit(e) {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await apiClient.post(`/licenses/${license.id}/transactions`, form);
            onRecorded();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to record payment');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ margin: 0 }}>Record payment — {license.client_name}</h3>
                    <button className="btn btn-sm" onClick={onClose}>Close</button>
                </div>
                <p className="text-muted" style={{ marginTop: 0 }}>
                    Confirm you've received the money in your own UPI/bank app first, then log it here — this immediately reactivates the license and extends its expiry.
                </p>
                {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
                <form onSubmit={submit} className="form-grid">
                    <div className="form-field"><label>Amount (₹)</label><input type="number" min="1" value={form.amount_inr} onChange={(e) => setForm({ ...form, amount_inr: e.target.value })} required autoFocus /></div>
                    <div className="form-field"><label>Extend by (days)</label><input type="number" min="1" value={form.extended_days} onChange={(e) => setForm({ ...form, extended_days: e.target.value })} required /></div>
                    <div className="form-field"><label>UTR / Reference No.</label><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
                    <div className="form-field" style={{ flex: 1, minWidth: 240 }}><label>Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                    <div className="form-field" style={{ alignSelf: 'flex-end' }}>
                        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Recording…' : 'Record & Activate'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function StatusBadge({ license }) {
    const today = new Date().toISOString().slice(0, 10);
    const isExpired = license.status === 'Active' && license.expires_at < today;
    if (license.status === 'Revoked') return <span className="badge badge-danger">Revoked</span>;
    if (license.status === 'Suspended') return <span className="badge badge-warning">Suspended</span>;
    if (isExpired) return <span className="badge badge-warning">Expired (read-only)</span>;
    return <span className="badge badge-success">Active</span>;
}

export default function Licenses() {
    const [licenses, setLicenses] = useState([]);
    const [plans, setPlans] = useState([]);
    const [licenseForm, setLicenseForm] = useState(EMPTY_LICENSE);
    const [planForm, setPlanForm] = useState(EMPTY_PLAN);
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [error, setError] = useState('');
    const [copiedKey, setCopiedKey] = useState(null);
    const [payingLicense, setPayingLicense] = useState(null);

    const load = useCallback(async () => {
        const [licRes, planRes] = await Promise.all([
            apiClient.get('/licenses'),
            apiClient.get('/license-plans'),
        ]);
        setLicenses(licRes.data);
        setPlans(planRes.data);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function issueLicense(e) {
        e.preventDefault();
        setError('');
        try {
            await apiClient.post('/licenses', licenseForm);
            setLicenseForm(EMPTY_LICENSE);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to issue license');
        }
    }

    async function setStatus(license, action) {
        if (action === 'revoke' && !confirm(`Revoke the license for "${license.client_name}"? Their installation will be fully locked out immediately.`)) return;
        await apiClient.post(`/licenses/${license.id}/${action}`);
        load();
    }

    async function removeLicense(license) {
        if (!confirm(`Permanently delete the license record for "${license.client_name}"? This cannot be undone.`)) return;
        await apiClient.delete(`/licenses/${license.id}`);
        load();
    }

    function copyKey(key) {
        navigator.clipboard?.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1500);
    }

    function toggleFeature(f) {
        setPlanForm((p) => ({ ...p, features: p.features.includes(f) ? p.features.filter((x) => x !== f) : [...p.features, f] }));
    }

    async function savePlan(e) {
        e.preventDefault();
        setError('');
        try {
            if (editingPlanId) {
                await apiClient.put(`/license-plans/${editingPlanId}`, planForm);
            } else {
                await apiClient.post('/license-plans', planForm);
            }
            setPlanForm(EMPTY_PLAN);
            setEditingPlanId(null);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save plan');
        }
    }

    function editPlan(p) {
        setEditingPlanId(p.id);
        setPlanForm({
            name: p.name, max_companies: p.max_companies ?? '', max_employees: p.max_employees ?? '',
            monthly_price_inr: p.monthly_price_inr ?? '', features: p.features, price_notes: p.price_notes ?? '',
        });
    }

    async function deletePlan(id) {
        if (!confirm('Delete this plan? Licenses already issued against it are unaffected until reassigned.')) return;
        try {
            await apiClient.delete(`/license-plans/${id}`);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete plan — it may still be in use by a license.');
        }
    }

    const active = licenses.filter((l) => l.status === 'Active' && l.expires_at >= new Date().toISOString().slice(0, 10)).length;
    const expired = licenses.filter((l) => l.status === 'Active' && l.expires_at < new Date().toISOString().slice(0, 10)).length;
    const suspended = licenses.filter((l) => l.status === 'Suspended').length;
    const revoked = licenses.filter((l) => l.status === 'Revoked').length;

    return (
        <div>
            <div className="page-header"><h1>License Control</h1></div>
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

            <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: '#1a6b1a' }}>{active}</div><div className="text-muted">Active</div></div>
                <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: '#8a6d00' }}>{expired}</div><div className="text-muted">Expired (read-only)</div></div>
                <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: '#8a6d00' }}>{suspended}</div><div className="text-muted">Suspended</div></div>
                <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: '#a02525' }}>{revoked}</div><div className="text-muted">Revoked</div></div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginTop: 0 }}>Client Installations</h3>
                <table className="data-table">
                    <thead><tr><th>Client</th><th>Plan</th><th>License Key</th><th>Status</th><th>Expires</th><th>Last Check-in</th><th></th></tr></thead>
                    <tbody>
                        {licenses.map((l) => (
                            <tr key={l.id}>
                                <td><strong>{l.client_name}</strong>{l.contact_email && <div className="text-muted" style={{ fontSize: 11 }}>{l.contact_email}</div>}</td>
                                <td>{l.plan_name}</td>
                                <td>
                                    <code style={{ fontSize: 11 }}>{l.license_key}</code>{' '}
                                    <button className="btn btn-sm" onClick={() => copyKey(l.license_key)}>{copiedKey === l.license_key ? 'Copied' : 'Copy'}</button>
                                </td>
                                <td><StatusBadge license={l} /></td>
                                <td>{l.expires_at}</td>
                                <td>{l.last_checkin_at ? new Date(l.last_checkin_at).toLocaleString('en-IN') : <span className="text-muted">Never</span>}</td>
                                <td>
                                    <div className="flex-gap">
                                        <button className="btn btn-sm btn-primary" onClick={() => setPayingLicense(l)}>Record Payment</button>
                                        {l.status !== 'Suspended' && l.status !== 'Revoked' && (
                                            <button className="btn btn-sm" onClick={() => setStatus(l, 'suspend')}>Suspend</button>
                                        )}
                                        {(l.status === 'Suspended' || l.status === 'Revoked') && (
                                            <button className="btn btn-sm btn-primary" onClick={() => setStatus(l, 'reactivate')}>Reactivate</button>
                                        )}
                                        {l.status !== 'Revoked' && (
                                            <button className="btn btn-sm btn-danger" onClick={() => setStatus(l, 'revoke')}>Revoke</button>
                                        )}
                                        <button className="btn btn-sm btn-danger" onClick={() => removeLicense(l)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {licenses.length === 0 && <tr><td colSpan={7} className="text-muted">No licenses issued yet.</td></tr>}
                    </tbody>
                </table>

                <h4 style={{ marginBottom: 6 }}>Issue a new license</h4>
                <form onSubmit={issueLicense} className="form-grid">
                    <div className="form-field"><label>Client Name</label><input value={licenseForm.client_name} onChange={(e) => setLicenseForm({ ...licenseForm, client_name: e.target.value })} required /></div>
                    <div className="form-field"><label>Contact Email</label><input type="email" value={licenseForm.contact_email} onChange={(e) => setLicenseForm({ ...licenseForm, contact_email: e.target.value })} /></div>
                    <div className="form-field">
                        <label>Plan</label>
                        <select value={licenseForm.plan_id} onChange={(e) => setLicenseForm({ ...licenseForm, plan_id: e.target.value })} required>
                            <option value="">— Select a plan —</option>
                            {plans.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} — {p.monthly_price_inr != null ? `₹${Number(p.monthly_price_inr).toLocaleString('en-IN')}/mo` : 'Custom pricing'}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-field"><label>Expires On</label><input type="date" value={licenseForm.expires_at} onChange={(e) => setLicenseForm({ ...licenseForm, expires_at: e.target.value })} required /></div>
                    <div className="form-field"><label>Notes</label><input value={licenseForm.notes} onChange={(e) => setLicenseForm({ ...licenseForm, notes: e.target.value })} /></div>
                    <div className="form-field" style={{ alignSelf: 'flex-end' }}><button className="btn btn-primary" type="submit">Issue License</button></div>
                </form>
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>License Plans</h3>
                <table className="data-table" style={{ marginBottom: 16 }}>
                    <thead><tr><th>Name</th><th>₹/month</th><th>Max Employees</th><th>Max Companies</th><th>Features</th><th>Notes</th><th></th></tr></thead>
                    <tbody>
                        {plans.map((p) => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.monthly_price_inr !== null && p.monthly_price_inr !== undefined ? `₹${Number(p.monthly_price_inr).toLocaleString('en-IN')}` : (p.name === 'Enterprise' ? 'Custom' : '—')}</td>
                                <td>{p.max_employees ?? '∞'}</td>
                                <td>{p.max_companies ?? '∞'}</td>
                                <td style={{ fontSize: 11 }}>{p.features.join(', ')}</td>
                                <td className="text-muted">{p.price_notes}</td>
                                <td>
                                    <div className="flex-gap">
                                        <button className="btn btn-sm" onClick={() => editPlan(p)}>Edit</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => deletePlan(p.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {plans.length === 0 && <tr><td colSpan={7} className="text-muted">No plans yet.</td></tr>}
                    </tbody>
                </table>

                <h4 style={{ marginBottom: 6 }}>{editingPlanId ? 'Edit plan' : 'New plan'}</h4>
                <form onSubmit={savePlan} className="form-grid" style={{ marginBottom: 10 }}>
                    <div className="form-field"><label>Name</label><input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required /></div>
                    <div className="form-field"><label>₹ / month (blank = custom pricing)</label><input type="number" value={planForm.monthly_price_inr} onChange={(e) => setPlanForm({ ...planForm, monthly_price_inr: e.target.value })} /></div>
                    <div className="form-field"><label>Max Employees (blank = unlimited)</label><input type="number" value={planForm.max_employees} onChange={(e) => setPlanForm({ ...planForm, max_employees: e.target.value })} /></div>
                    <div className="form-field"><label>Max Companies (blank = unlimited)</label><input type="number" value={planForm.max_companies} onChange={(e) => setPlanForm({ ...planForm, max_companies: e.target.value })} /></div>
                    <div className="form-field" style={{ flex: 1, minWidth: 240 }}><label>Notes</label><input value={planForm.price_notes} onChange={(e) => setPlanForm({ ...planForm, price_notes: e.target.value })} /></div>
                </form>
                <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 700 }}>Enabled Features</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {ALL_FEATURES.map((f) => (
                            <label key={f} className="flex-gap" style={{ fontSize: 12 }}>
                                <input type="checkbox" checked={planForm.features.includes(f)} onChange={() => toggleFeature(f)} />
                                {f}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex-gap">
                    <button className="btn btn-primary" onClick={savePlan}>{editingPlanId ? 'Save Changes' : 'Add Plan'}</button>
                    {editingPlanId && <button className="btn" onClick={() => { setEditingPlanId(null); setPlanForm(EMPTY_PLAN); }}>Cancel</button>}
                </div>
            </div>

            {payingLicense && (
                <RecordPaymentModal
                    license={payingLicense}
                    onClose={() => setPayingLicense(null)}
                    onRecorded={load}
                />
            )}
        </div>
    );
}
