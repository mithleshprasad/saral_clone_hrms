import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';

const STATUSES = ['Trial', 'Active', 'Expired', 'Suspended'];

export default function Subscriptions() {
    const [companies, setCompanies] = useState([]);
    const [plans, setPlans] = useState([]);
    const [edits, setEdits] = useState({});
    const [planForm, setPlanForm] = useState({ name: '', code: '', price_per_month: 0, price_per_year: 0, max_employees: '', max_companies: '' });
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const [companiesRes, plansRes] = await Promise.all([
            apiClient.get('/companies'),
            apiClient.get('/subscription-plans'),
        ]);
        setCompanies(companiesRes.data);
        setPlans(plansRes.data);
    }, []);

    useEffect(() => { load(); }, [load]);

    function setEdit(companyId, field, value) {
        setEdits({ ...edits, [companyId]: { ...edits[companyId], [field]: value } });
    }

    async function saveSubscription(company) {
        setError('');
        const patch = edits[company.id] || {};
        try {
            await apiClient.put(`/companies/${company.id}/subscription`, patch);
            setEdits({ ...edits, [company.id]: {} });
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update subscription — Super Admin role required.');
        }
    }

    async function addPlan(e) {
        e.preventDefault();
        if (!planForm.name.trim()) return;
        await apiClient.post('/subscription-plans', planForm);
        setPlanForm({ name: '', code: '', price_per_month: 0, price_per_year: 0, max_employees: '', max_companies: '' });
        load();
    }

    async function deletePlan(id) {
        if (!confirm('Delete this plan?')) return;
        await apiClient.delete(`/subscription-plans/${id}`);
        load();
    }

    return (
        <div>
            <div className="page-header"><h1>Application Control — Subscriptions</h1></div>
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

            <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginTop: 0 }}>Tenant Companies</h3>
                <table className="data-table">
                    <thead><tr><th>Company</th><th>Plan</th><th>Status</th><th>Ends On</th><th>App Access</th><th></th></tr></thead>
                    <tbody>
                        {companies.map((c) => {
                            const e = edits[c.id] || {};
                            return (
                                <tr key={c.id}>
                                    <td><strong>{c.name}</strong></td>
                                    <td>
                                        <select value={e.subscription_plan_id ?? c.subscription_plan_id ?? ''} onChange={(ev) => setEdit(c.id, 'subscription_plan_id', ev.target.value)}>
                                            <option value="">No plan</option>
                                            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select value={e.subscription_status ?? c.subscription_status ?? 'Trial'} onChange={(ev) => setEdit(c.id, 'subscription_status', ev.target.value)}>
                                            {STATUSES.map((s) => <option key={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <input type="date" value={e.subscription_ends_at ?? c.subscription_ends_at ?? ''} onChange={(ev) => setEdit(c.id, 'subscription_ends_at', ev.target.value)} />
                                    </td>
                                    <td>
                                        <label className="flex-gap">
                                            <input type="checkbox" checked={e.is_active ?? !!c.is_active} onChange={(ev) => setEdit(c.id, 'is_active', ev.target.checked)} />
                                            {(e.is_active ?? c.is_active) ? 'Enabled' : 'Blocked'}
                                        </label>
                                    </td>
                                    <td><button className="btn btn-primary btn-sm" onClick={() => saveSubscription(c)}>Save</button></td>
                                </tr>
                            );
                        })}
                        {companies.length === 0 && <tr><td colSpan={6} className="text-muted">No companies yet.</td></tr>}
                    </tbody>
                </table>
                <p className="text-muted mt-16">"App Access" is a hard kill switch — disabling it (or an Expired/Suspended status) blocks payroll generation for that company's employees immediately.</p>
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>Subscription Plans</h3>
                <table className="data-table" style={{ marginBottom: 16 }}>
                    <thead><tr><th>Name</th><th>Code</th><th>₹/month</th><th>₹/year</th><th>Max Employees</th><th>Max Companies</th><th></th></tr></thead>
                    <tbody>
                        {plans.map((p) => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.code}</td>
                                <td>{Number(p.price_per_month).toLocaleString()}</td>
                                <td>{Number(p.price_per_year).toLocaleString()}</td>
                                <td>{p.max_employees ?? '∞'}</td>
                                <td>{p.max_companies ?? '∞'}</td>
                                <td><button className="btn btn-danger btn-sm" onClick={() => deletePlan(p.id)}>Delete</button></td>
                            </tr>
                        ))}
                        {plans.length === 0 && <tr><td colSpan={7} className="text-muted">No plans yet.</td></tr>}
                    </tbody>
                </table>

                <form onSubmit={addPlan} className="form-grid">
                    <div className="form-field"><label>Name</label><input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required /></div>
                    <div className="form-field"><label>Code</label><input value={planForm.code} onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })} /></div>
                    <div className="form-field"><label>Price / month</label><input type="number" value={planForm.price_per_month} onChange={(e) => setPlanForm({ ...planForm, price_per_month: e.target.value })} /></div>
                    <div className="form-field"><label>Price / year</label><input type="number" value={planForm.price_per_year} onChange={(e) => setPlanForm({ ...planForm, price_per_year: e.target.value })} /></div>
                    <div className="form-field"><label>Max Employees</label><input type="number" value={planForm.max_employees} onChange={(e) => setPlanForm({ ...planForm, max_employees: e.target.value })} /></div>
                    <div className="form-field"><label>Max Companies</label><input type="number" value={planForm.max_companies} onChange={(e) => setPlanForm({ ...planForm, max_companies: e.target.value })} /></div>
                    <div className="form-field" style={{ alignSelf: 'flex-end' }}><button className="btn btn-primary" type="submit">Add Plan</button></div>
                </form>
            </div>
        </div>
    );
}
