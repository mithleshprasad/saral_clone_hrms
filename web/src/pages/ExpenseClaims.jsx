import { useEffect, useState, useCallback } from 'react';
import apiClient, { openFile } from '../api/client';
import { useAppState } from '../context/AppStateContext';
import DialogWindow from '../components/layout/DialogWindow';

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Paid'];

export default function ExpenseClaims() {
    const { companyId } = useAppState();
    const [claims, setClaims] = useState([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/expense-claims', {
            params: { companyId: companyId || undefined, status: statusFilter === 'All' ? undefined : statusFilter },
        });
        setClaims(data);
    }, [companyId, statusFilter]);

    useEffect(() => { load(); }, [load]);

    async function review(id, status) {
        setError('');
        const remarks = status === 'Rejected' ? prompt('Reason for rejection (optional):') || '' : undefined;
        try {
            await apiClient.put(`/expense-claims/${id}/review`, { status, remarks });
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update claim');
        }
    }

    const pending = claims.filter((c) => c.status === 'Pending').length;
    const totalApproved = claims.filter((c) => c.status === 'Approved').reduce((s, c) => s + Number(c.amount), 0);
    const statusBar = (
        <>
            <span>Claims: <span className="val">{claims.length}</span></span>
            <span>Pending: <span className="val">{pending}</span></span>
            <span>Approved (unpaid): <span className="val">₹{totalApproved.toFixed(2)}</span></span>
        </>
    );

    return (
        <DialogWindow title="Expense Claims" icon="fa-receipt" statusBar={statusBar}>
            <div className="win-row" style={{ marginBottom: 8 }}>
                <div className="win-field stack">
                    <label>Status</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        {STATUS_FILTERS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

            <table className="win-grid">
                <thead>
                    <tr><th>Employee</th><th>Category</th><th>Date</th><th>Amount</th><th>Description</th><th>Receipt</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                    {claims.map((c) => (
                        <tr key={c.id}>
                            <td>{c.employee_code ? `${c.employee_code} — ` : ''}{c.first_name} {c.last_name}</td>
                            <td>{c.category}</td>
                            <td>{c.expense_date}</td>
                            <td>₹{Number(c.amount).toFixed(2)}</td>
                            <td>{c.description}</td>
                            <td>
                                {c.receipt_stored_name
                                    ? <button className="win-btn small outline" onClick={() => openFile(`/expense-claims/${c.id}/receipt`)}>View</button>
                                    : <span className="text-muted">—</span>}
                            </td>
                            <td>
                                <span className={`win-badge ${c.status === 'Approved' || c.status === 'Paid' ? 'ok' : c.status === 'Rejected' ? 'bad' : 'warn'}`}>{c.status}</span>
                            </td>
                            <td>
                                {c.status === 'Pending' && (
                                    <div className="flex-gap">
                                        <button className="win-btn small" onClick={() => review(c.id, 'Approved')}>Approve</button>
                                        <button className="win-btn danger small" onClick={() => review(c.id, 'Rejected')}>Reject</button>
                                    </div>
                                )}
                                {c.status === 'Approved' && (
                                    <button className="win-btn small" onClick={() => review(c.id, 'Paid')}>Mark Paid</button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {claims.length === 0 && <tr><td colSpan={8} className="text-muted">No expense claims found.</td></tr>}
                </tbody>
            </table>
        </DialogWindow>
    );
}
