import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

function currentFY() {
    const now = new Date();
    const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${y}-${y + 1}`;
}

const EMPTY = { financial_year: currentFY(), section_80c: 0, section_80ccd: 0, section_80d: 0, hra_exemption_claimed: 0, home_loan_interest: 0, other_deductions: 0 };

export default function EssDeclarations() {
    const [declarations, setDeclarations] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [current, setCurrent] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    async function load() {
        const { data } = await apiClient.get('/ess/declarations');
        setDeclarations(data);
        const thisYear = data.find((d) => d.financial_year === form.financial_year);
        setCurrent(thisYear || null);
        if (thisYear) setForm({ ...EMPTY, ...thisYear });
    }

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const locked = current?.status === 'Approved';
    const total = ['section_80c', 'section_80ccd', 'section_80d', 'hra_exemption_claimed', 'home_loan_interest', 'other_deductions']
        .reduce((s, k) => s + (Number(form[k]) || 0), 0);

    async function handleSave(e) {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await apiClient.post('/ess/declarations', form);
            await load();
        } catch (err) {
            setError(err.response?.data?.error || 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    async function handleSubmit() {
        if (!current?.id) return;
        await apiClient.post(`/ess/declarations/${current.id}/submit`);
        load();
    }

    return (
        <div>
            <div className="page-header"><h1>Tax Declarations</h1></div>

            <form onSubmit={handleSave} className="groupbox">
                <div className="groupbox-label">
                    Investment Declaration {current && <span className={`win-badge ${current.status === 'Approved' ? 'ok' : current.status === 'Rejected' ? 'bad' : 'warn'}`} style={{ marginLeft: 8 }}>{current.status}</span>}
                </div>
                <div className="win-row">
                    <div className="win-field stack"><label>Financial Year</label><input value={form.financial_year} onChange={(e) => setForm({ ...form, financial_year: e.target.value })} disabled={!!current} style={{ width: 110 }} /></div>
                </div>
                <div className="win-row">
                    <div className="win-field stack"><label>Section 80C (PF/PPF/ELSS/LIC, max 1,50,000)</label><input type="number" value={form.section_80c} onChange={(e) => setForm({ ...form, section_80c: e.target.value })} disabled={locked} /></div>
                    <div className="win-field stack"><label>Section 80CCD (NPS)</label><input type="number" value={form.section_80ccd} onChange={(e) => setForm({ ...form, section_80ccd: e.target.value })} disabled={locked} /></div>
                    <div className="win-field stack"><label>Section 80D (Medical Insurance)</label><input type="number" value={form.section_80d} onChange={(e) => setForm({ ...form, section_80d: e.target.value })} disabled={locked} /></div>
                </div>
                <div className="win-row">
                    <div className="win-field stack"><label>HRA Exemption Claimed</label><input type="number" value={form.hra_exemption_claimed} onChange={(e) => setForm({ ...form, hra_exemption_claimed: e.target.value })} disabled={locked} /></div>
                    <div className="win-field stack"><label>Home Loan Interest (Sec 24)</label><input type="number" value={form.home_loan_interest} onChange={(e) => setForm({ ...form, home_loan_interest: e.target.value })} disabled={locked} /></div>
                    <div className="win-field stack"><label>Other Deductions</label><input type="number" value={form.other_deductions} onChange={(e) => setForm({ ...form, other_deductions: e.target.value })} disabled={locked} /></div>
                </div>

                <p style={{ fontWeight: 700, marginTop: 8 }}>Total Declared: ₹{total.toLocaleString()}</p>
                {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

                {!locked && (
                    <div className="win-btn-bar">
                        <button type="submit" className="win-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
                        {current?.status === 'Draft' && <button type="button" className="win-btn outline" onClick={handleSubmit}>Submit for Approval</button>}
                    </div>
                )}
                {locked && <p className="text-muted mt-16">This declaration is approved and locked. Contact HR to make changes.</p>}
            </form>

            <p className="text-muted mt-16" style={{ fontSize: 11 }}>
                Approved declarations reduce your taxable earnings (prorated monthly) in the TDS calculation from your next payroll run onward.
            </p>

            {declarations.length > 1 && (
                <table className="win-grid mt-16">
                    <thead><tr><th>FY</th><th>Total Declared</th><th>Status</th></tr></thead>
                    <tbody>
                        {declarations.map((d) => (
                            <tr key={d.id}><td>{d.financial_year}</td><td>₹{Number(d.total_declared).toLocaleString()}</td><td>{d.status}</td></tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
