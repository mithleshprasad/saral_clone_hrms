import { useEffect, useState } from 'react';
import apiClient, { openFile } from '../../api/client';

function currentFY() {
    const now = new Date();
    const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${y}-${y + 1}`;
}

export default function EssPayslips() {
    const [payslips, setPayslips] = useState([]);
    const [fy, setFy] = useState(currentFY());
    const [error, setError] = useState('');

    useEffect(() => {
        apiClient.get('/ess/payslips').then((res) => setPayslips(res.data));
    }, []);

    async function viewPayslip(id) {
        await openFile(`/ess/payslips/${id}/payslip.pdf`);
    }

    async function downloadForm16() {
        setError('');
        try {
            await openFile('/ess/form16.pdf', { params: { financialYear: fy } });
        } catch (err) {
            setError('No payroll records found for that financial year.');
        }
    }

    return (
        <div>
            <div className="page-header"><h1>My Payslips</h1></div>

            <table className="win-grid" style={{ marginBottom: 16 }}>
                <thead><tr><th>Period</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th></th></tr></thead>
                <tbody>
                    {payslips.map((p) => (
                        <tr key={p.id}>
                            <td>{p.pay_period_start} to {p.pay_period_end}</td>
                            <td>₹{Number(p.gross_salary).toLocaleString()}</td>
                            <td>₹{Number(p.total_deductions).toLocaleString()}</td>
                            <td><strong>₹{Number(p.net_salary).toLocaleString()}</strong></td>
                            <td><span className="win-badge ok">{p.status}</span></td>
                            <td><button className="win-btn small" onClick={() => viewPayslip(p.id)}>View PDF</button></td>
                        </tr>
                    ))}
                    {payslips.length === 0 && <tr><td colSpan={6} className="text-muted">No payslips yet.</td></tr>}
                </tbody>
            </table>

            <div className="groupbox">
                <div className="groupbox-label">Form 16 (Annual)</div>
                <div className="win-row" style={{ alignItems: 'flex-end' }}>
                    <div className="win-field stack">
                        <label>Financial Year</label>
                        <input value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2026-2027" style={{ width: 120 }} />
                    </div>
                    <button className="win-btn" onClick={downloadForm16}>Download Form 16</button>
                </div>
                {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>
        </div>
    );
}
