import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';

function monthBounds(year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
}

export default function PayrollRun() {
    const { year, month, companyId } = useAppState();
    const navigate = useNavigate();
    const [bonuses, setBonuses] = useState(0);
    const [deductions, setDeductions] = useState(0);
    const [skipCompleted, setSkipCompleted] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [running, setRunning] = useState(false);

    const { start, end } = monthBounds(year, month);

    async function handleRun(e) {
        e.preventDefault();
        setError('');
        setResult(null);
        setRunning(true);
        try {
            const { data } = await apiClient.post('/payroll/generate', {
                startDate: start, endDate: end,
                bonuses: Number(bonuses) || 0, deductions: Number(deductions) || 0,
                skip_completed: skipCompleted,
                companyId: companyId || undefined,
            });
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Payroll run failed');
        } finally {
            setRunning(false);
        }
    }

    return (
        <DialogWindow title="Net Pay (Run Payroll)" icon="fa-file-invoice-dollar">
            <div className="groupbox" style={{ maxWidth: 520 }}>
                <div className="groupbox-label">Processing Period</div>
                <p className="text-muted" style={{ marginTop: 0 }}>
                    <strong>{start}</strong> to <strong>{end}</strong> (from the Month/FY selector above).
                </p>
                <form onSubmit={handleRun}>
                    <div className="win-row">
                        <div className="win-field stack"><label>Common Bonus (all employees)</label><input type="number" value={bonuses} onChange={(e) => setBonuses(e.target.value)} /></div>
                        <div className="win-field stack"><label>Common Other Deduction</label><input type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} /></div>
                    </div>
                    <label className="flex-gap mt-16">
                        <input type="checkbox" checked={skipCompleted} onChange={(e) => setSkipCompleted(e.target.checked)} />
                        Skip employees already processed for this period
                    </label>

                    {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

                    <button className="win-btn mt-16" disabled={running}>
                        {running ? 'Running…' : 'Generate Payroll for Active Employees'}
                    </button>
                </form>

                {result && (
                    <div className="win-statusbar mt-16" style={{ display: 'block', padding: 10 }}>
                        <strong>{result.processed}</strong> payslip(s) generated.
                        {result.skipped.length > 0 && <div className="text-muted">{result.skipped.length} employee(s) skipped (already processed).</div>}
                        <div className="mt-16"><button type="button" className="win-btn outline small" onClick={() => navigate('/payroll/payslips')}>View Payslips</button></div>
                    </div>
                )}
            </div>
        </DialogWindow>
    );
}
