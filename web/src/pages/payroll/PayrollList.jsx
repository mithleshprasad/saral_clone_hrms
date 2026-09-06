import { useEffect, useState, useCallback } from 'react';
import apiClient, { openFile } from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';

export default function PayrollList() {
    const { companyId, year, month } = useAppState();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get('/payroll', { params: { companyId: companyId || undefined, year, month } });
            setRows(data);
        } finally {
            setLoading(false);
        }
    }, [companyId, year, month]);

    useEffect(() => { load(); }, [load]);

    async function remove(id) {
        if (!confirm('Delete this payslip record?')) return;
        await apiClient.delete(`/payroll/${id}`);
        load();
    }

    const totalNet = rows.reduce((sum, r) => sum + Number(r.net_salary || 0), 0);
    const statusBar = (
        <>
            <span>Payslips: <span className="val">{rows.length}</span></span>
            <span>Total Net Payout: <span className="val">₹{totalNet.toLocaleString()}</span></span>
        </>
    );

    return (
        <DialogWindow title={`Pay Slip — ${month}/${year}`} icon="fa-receipt" statusBar={statusBar}>
            {loading ? <p className="text-muted">Loading…</p> : (
                <table className="win-grid">
                    <thead>
                        <tr>
                            <th>Employee</th><th title="Days marked Present, out of total days in this pay period — this is what the LOP amount is calculated from">Attendance</th><th>Gross</th><th>PF</th><th>ESI</th><th>PT</th><th>TDS</th>
                            <th>LOP</th><th>Total Ded.</th><th>Net Pay</th><th>Status</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td>{r.first_name} {r.last_name}</td>
                                <td title={`${r.present_days} present out of ${r.period_days} days — LOP charged for the remaining ${r.period_days - r.present_days}`}>
                                    <span className={`win-badge ${Number(r.present_days) === Number(r.period_days) ? 'ok' : Number(r.present_days) === 0 ? 'bad' : 'warn'}`}>
                                        {r.present_days}/{r.period_days}
                                    </span>
                                </td>
                                <td>{Number(r.gross_salary).toLocaleString()}</td>
                                <td>{Number(r.employee_pf).toLocaleString()}</td>
                                <td>{Number(r.employee_esi).toLocaleString()}</td>
                                <td>{Number(r.professional_tax).toLocaleString()}</td>
                                <td>{Number(r.tds).toLocaleString()}</td>
                                <td>{Number(r.lop_amount).toLocaleString()}</td>
                                <td>{Number(r.total_deductions).toLocaleString()}</td>
                                <td><strong>{Number(r.net_salary).toLocaleString()}</strong></td>
                                <td><span className="win-badge ok">{r.status}</span></td>
                                <td>
                                    <div className="flex-gap">
                                        <button className="win-btn small" onClick={() => openFile(`/payroll/${r.id}/payslip.pdf`)}>PDF</button>
                                        <button className="win-btn danger small" onClick={() => remove(r.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && <tr><td colSpan={12} className="text-muted">No payroll processed for this period yet.</td></tr>}
                    </tbody>
                </table>
            )}
        </DialogWindow>
    );
}
