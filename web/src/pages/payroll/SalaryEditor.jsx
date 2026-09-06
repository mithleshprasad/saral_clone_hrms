import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';

const EARNING_FIELDS = [
    ['basic_salary', 'Basic'], ['da', 'DA'], ['hra', 'HRA'],
    ['conveyance', 'Conveyance'], ['medical', 'Medical'], ['special_allowance', 'Special Allowance'], ['bonuses', 'Bonus'],
];
const DEDUCTION_FIELDS = [
    ['employee_pf', 'PF'], ['vpf_amount', 'VPF'], ['professional_tax', 'PT'], ['tds', 'TDS'],
    ['employee_esi', 'ESI'], ['lop_amount', 'LOP'], ['loan_deduction', 'Loan EMI'], ['other_deductions', 'Other'], ['user_defined_deduction', 'User-Defined'],
];

export default function SalaryEditor() {
    const { companyId, year, month } = useAppState();
    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/payroll', { params: { companyId: companyId || undefined, year, month } });
        setRows(data);
    }, [companyId, year, month]);

    useEffect(() => { load(); }, [load]);

    function select(row) {
        setSelected(row);
        setMessage('');
        const f = {};
        [...EARNING_FIELDS, ...DEDUCTION_FIELDS].forEach(([k]) => { f[k] = row[k]; });
        setForm(f);
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            const { data } = await apiClient.put(`/payroll/${selected.id}/components`, form);
            setMessage('Saved.');
            setSelected(data);
            load();
        } finally {
            setSaving(false);
        }
    }

    const grossPreview = EARNING_FIELDS.reduce((s, [k]) => s + (Number(form[k]) || 0), 0);
    const dedPreview = DEDUCTION_FIELDS.reduce((s, [k]) => s + (Number(form[k]) || 0), 0);

    return (
        <DialogWindow title={`Salary Editor — ${month}/${year}`} icon="fa-edit">
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
                <div className="card" style={{ padding: 0, maxHeight: '75vh', overflowY: 'auto' }}>
                    {rows.map((r) => (
                        <div
                            key={r.id}
                            onClick={() => select(r)}
                            style={{
                                padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #ddd8c4',
                                background: selected?.id === r.id ? '#cfe4ff' : 'transparent',
                            }}
                        >
                            <div style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>Net: ₹{Number(r.net_salary).toLocaleString()}</div>
                        </div>
                    ))}
                    {rows.length === 0 && <p className="text-muted" style={{ padding: 12 }}>No payroll processed for this period yet.</p>}
                </div>

                {selected ? (
                    <form className="groupbox" onSubmit={handleSave} style={{ margin: 0 }}>
                        <div className="groupbox-label">{selected.first_name} {selected.last_name}</div>

                        <div className="win-tabs" style={{ marginTop: 0 }}>
                            <div className="win-tab active">Earnings</div>
                        </div>
                        <div className="win-tab-body">
                            <div className="win-row">
                                {EARNING_FIELDS.map(([key, label]) => (
                                    <div className="win-field stack" key={key}>
                                        <label>{label}</label>
                                        <input type="number" value={form[key] ?? 0} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={{ width: 100 }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="win-tabs">
                            <div className="win-tab active">Deductions</div>
                        </div>
                        <div className="win-tab-body">
                            <div className="win-row">
                                {DEDUCTION_FIELDS.map(([key, label]) => (
                                    <div className="win-field stack" key={key}>
                                        <label>{label}</label>
                                        <input type="number" value={form[key] ?? 0} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={{ width: 100 }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-16 flex-gap" style={{ justifyContent: 'space-between' }}>
                            <div>
                                <strong>Gross: ₹{grossPreview.toLocaleString()}</strong>
                                {' · '}
                                <strong>Deductions: ₹{dedPreview.toLocaleString()}</strong>
                                {' · '}
                                <strong style={{ color: 'var(--primary)' }}>Net: ₹{(grossPreview - dedPreview).toLocaleString()}</strong>
                            </div>
                            <button className="win-btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                        </div>
                        {message && <p style={{ color: 'var(--success)' }}>{message}</p>}
                    </form>
                ) : (
                    <div className="groupbox text-muted">Select a payslip on the left to edit its components.</div>
                )}
            </div>
        </DialogWindow>
    );
}
