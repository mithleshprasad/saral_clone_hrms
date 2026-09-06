import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import DialogWindow from '../components/layout/DialogWindow';

const LABELS = {
    pf_percentage: 'Employee PF Contribution %',
    employer_pf_percentage: 'Employer PF Contribution %',
    eps_wage_limit: 'EPS Wage Ceiling (₹)',
    esi_threshold: 'ESI Eligibility Threshold (₹ gross/month)',
    esi_employee_percentage: 'Employee ESI Contribution %',
    esi_employer_percentage: 'Employer ESI Contribution %',
    professional_tax: 'Flat Professional Tax (₹/month)',
};

// TDS now runs on the actual statutory income-tax slabs (see server/src/utils/incomeTax.js)
// instead of a configurable flat rate — these old settings rows are hidden if still present
// in the database from before that change.
const HIDDEN_KEYS = new Set(['tax_slab_1', 'tax_slab_2']);

export default function Settings() {
    const [settings, setSettings] = useState([]);
    const [form, setForm] = useState({});
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        apiClient.get('/settings').then((res) => {
            setSettings(res.data);
            const f = {};
            res.data.forEach((s) => { f[s.key] = s.value; });
            setForm(f);
        });
    }, []);

    async function handleSave(e) {
        e.preventDefault();
        await apiClient.put('/settings', form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    return (
        <DialogWindow title="Statutory Settings" icon="fa-cogs">
            <form className="groupbox" style={{ maxWidth: 600, margin: 0 }} onSubmit={handleSave}>
                <div className="groupbox-label">PF / ESI / PT / TDS Rates</div>
                <p className="text-muted" style={{ marginTop: 0 }}>
                    These rates drive the payroll engine's PF, ESI and PT calculations for every employee.
                    TDS is computed from the actual income-tax slabs (old/new regime, per employee) rather than a
                    rate configured here.
                </p>
                <div className="win-row">
                    {settings.filter((s) => !HIDDEN_KEYS.has(s.key)).map((s) => (
                        <div className="win-field stack" key={s.key}>
                            <label>{LABELS[s.key] || s.key}</label>
                            <input
                                type="number" step="0.01"
                                value={form[s.key] ?? ''}
                                onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
                            />
                        </div>
                    ))}
                </div>
                <button className="win-btn mt-16" type="submit">Save Settings</button>
                {saved && <span style={{ color: 'var(--success)', marginLeft: 12 }}>Saved!</span>}
            </form>
        </DialogWindow>
    );
}
