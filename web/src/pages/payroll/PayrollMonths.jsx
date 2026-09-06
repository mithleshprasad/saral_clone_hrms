import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';

export default function PayrollMonths() {
    const { year, month, companyId } = useAppState();
    const [months, setMonths] = useState([]);

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/payroll/months/list', { params: { companyId: companyId || undefined } });
        setMonths(data);
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    async function openCurrent() {
        await apiClient.post('/payroll/months', { companyId, year, month });
        load();
    }

    async function toggle(m) {
        await apiClient.post(`/payroll/months/${m.id}/${m.locked ? 'reopen' : 'close'}`);
        load();
    }

    const statusBar = <span>Pay Periods: <span className="val">{months.length}</span></span>;

    return (
        <DialogWindow title="Pay Periods" icon="fa-calendar-check" statusBar={statusBar}>
            <div className="win-btn-bar" style={{ marginBottom: 8 }}>
                <button className="win-btn" onClick={openCurrent} disabled={!companyId}>
                    <i className="fas fa-plus"></i> Open {month}/{year}
                </button>
            </div>

            <table className="win-grid">
                <thead><tr><th>Year</th><th>Month</th><th>Status</th><th></th></tr></thead>
                <tbody>
                    {months.map((m) => (
                        <tr key={m.id}>
                            <td>{m.year}</td>
                            <td>{new Date(2000, m.month - 1, 1).toLocaleString('default', { month: 'long' })}</td>
                            <td><span className={`win-badge ${m.locked ? 'bad' : 'ok'}`}>{m.status}</span></td>
                            <td>
                                <button className="win-btn small" onClick={() => toggle(m)}>
                                    {m.locked ? 'Reopen' : 'Close'}
                                </button>
                            </td>
                        </tr>
                    ))}
                    {months.length === 0 && <tr><td colSpan={4} className="text-muted">No pay periods opened yet.</td></tr>}
                </tbody>
            </table>
        </DialogWindow>
    );
}
