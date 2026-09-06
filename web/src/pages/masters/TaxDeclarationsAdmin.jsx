import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';

function currentFY() {
    const now = new Date();
    const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${y}-${y + 1}`;
}

export default function TaxDeclarationsAdmin() {
    const { companyId } = useAppState();
    const [fy, setFy] = useState(currentFY());
    const [status, setStatus] = useState('');
    const [rows, setRows] = useState([]);

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/tax-declarations', { params: { financialYear: fy || undefined, status: status || undefined, companyId: companyId || undefined } });
        setRows(data);
    }, [fy, status, companyId]);

    useEffect(() => { load(); }, [load]);

    async function review(id, newStatus) {
        const remarks = newStatus === 'Rejected' ? prompt('Reason for rejection (optional):') || '' : undefined;
        await apiClient.put(`/tax-declarations/${id}/review`, { status: newStatus, remarks });
        load();
    }

    const statusBar = <span>Declarations: <span className="val">{rows.length}</span></span>;

    return (
        <DialogWindow title="Tax Declarations — Review" icon="fa-file-invoice" statusBar={statusBar}>
            <div className="groupbox">
                <div className="groupbox-label">Filter</div>
                <div className="win-row">
                    <div className="win-field"><label>Financial Year</label><input value={fy} onChange={(e) => setFy(e.target.value)} style={{ width: 110 }} /></div>
                    <div className="win-field">
                        <label>Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">All</option>
                            <option>Draft</option><option>Submitted</option><option>Approved</option><option>Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            <table className="win-grid">
                <thead><tr><th>Employee</th><th>FY</th><th>80C</th><th>80D</th><th>HRA</th><th>Home Loan</th><th>Total</th><th>Status</th><th></th></tr></thead>
                <tbody>
                    {rows.map((d) => (
                        <tr key={d.id}>
                            <td>{d.first_name} {d.last_name}</td>
                            <td>{d.financial_year}</td>
                            <td>{Number(d.section_80c).toLocaleString()}</td>
                            <td>{Number(d.section_80d).toLocaleString()}</td>
                            <td>{Number(d.hra_exemption_claimed).toLocaleString()}</td>
                            <td>{Number(d.home_loan_interest).toLocaleString()}</td>
                            <td><strong>{Number(d.total_declared).toLocaleString()}</strong></td>
                            <td><span className={`win-badge ${d.status === 'Approved' ? 'ok' : d.status === 'Rejected' ? 'bad' : 'warn'}`}>{d.status}</span></td>
                            <td>
                                {d.status === 'Submitted' && (
                                    <div className="flex-gap">
                                        <button className="win-btn small" onClick={() => review(d.id, 'Approved')}>Approve</button>
                                        <button className="win-btn danger small" onClick={() => review(d.id, 'Rejected')}>Reject</button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={9} className="text-muted">No declarations found.</td></tr>}
                </tbody>
            </table>
        </DialogWindow>
    );
}
