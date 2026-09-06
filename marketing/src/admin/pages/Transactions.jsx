import { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';

export default function Transactions() {
    const [rows, setRows] = useState([]);

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/transactions');
        setRows(data);
    }, []);

    useEffect(() => { load(); }, [load]);

    const totalInr = rows.reduce((sum, r) => sum + Number(r.amount_inr), 0);

    return (
        <div>
            <div className="page-header"><h1>Transactions</h1></div>

            <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20, maxWidth: 460 }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1a6b1a' }}>₹{totalInr.toLocaleString('en-IN')}</div>
                    <div className="text-muted">Total recorded</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-dark)' }}>{rows.length}</div>
                    <div className="text-muted">Payments logged</div>
                </div>
            </div>

            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th><th>Client</th><th>Amount</th><th>Reference</th>
                            <th>Extended</th><th>Expiry: before → after</th><th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((t) => (
                            <tr key={t.id}>
                                <td>{new Date(t.created_at).toLocaleString('en-IN')}</td>
                                <td><strong>{t.client_name}</strong></td>
                                <td>₹{Number(t.amount_inr).toLocaleString('en-IN')}</td>
                                <td>{t.reference || <span className="text-muted">—</span>}</td>
                                <td>{t.extended_days} days</td>
                                <td>{t.previous_expires_at} → <strong>{t.new_expires_at}</strong></td>
                                <td className="text-muted">{t.notes}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && <tr><td colSpan={7} className="text-muted">No payments recorded yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
