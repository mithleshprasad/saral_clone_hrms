import { useState } from 'react';
import apiClient from '../api/client';
import { useAppState } from '../context/AppStateContext';
import DialogWindow from '../components/layout/DialogWindow';

const REPORT_TYPES = [
    { value: 'sal_sheet', label: 'Salary Sheet', needsMonth: true },
    { value: 'pf_esi', label: 'PF / ESI Statement', needsMonth: true },
    { value: 'bank_adv', label: 'Bank Advice', needsMonth: true },
    { value: 'tax_rep', label: 'Tax (PT/TDS) Report', needsMonth: true },
    { value: 'form_16', label: 'Form 16 Feeder (Annual)', needsMonth: false },
    { value: 'yearly_salary', label: 'Yearly Salary Summary', needsMonth: false },
    { value: 'dept_summary', label: 'Department-wise Summary', needsMonth: true },
    { value: 'loan_ledger', label: 'Loan / Advance Ledger', needsMonth: false },
];

export default function Reports() {
    const { companyId, year, month } = useAppState();
    const [type, setType] = useState(REPORT_TYPES[0].value);
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const selected = REPORT_TYPES.find((r) => r.value === type);

    async function runReport() {
        setError('');
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/payroll/reports/${type}`, {
                params: { companyId, year, month: selected.needsMonth ? month : undefined },
            });
            setRows(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Report failed');
        } finally {
            setLoading(false);
        }
    }

    const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];
    const statusBar = rows ? <span>Rows: <span className="val">{rows.length}</span></span> : null;

    return (
        <DialogWindow title="Statutory Reports" icon="fa-chart-pie" statusBar={statusBar}>
            <div className="groupbox">
                <div className="groupbox-label">Report Criteria</div>
                <div className="win-row" style={{ alignItems: 'flex-end' }}>
                    <div className="win-field stack">
                        <label>Report</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 220 }}>
                            {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                    <button className="win-btn" onClick={runReport} disabled={loading}>
                        {loading ? 'Running…' : 'Run Report'}
                    </button>
                </div>
            </div>

            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

            {rows && (
                <div style={{ overflowX: 'auto', marginTop: 10 }}>
                    <table className="win-grid">
                        <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i}>{columns.map((c) => <td key={c}>{String(r[c] ?? '')}</td>)}</tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={columns.length || 1} className="text-muted">No data for this period.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </DialogWindow>
    );
}
