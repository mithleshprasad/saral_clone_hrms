import { useEffect, useState, useCallback } from 'react';
import apiClient, { openFile } from '../../api/client';

const CATEGORIES = ['Travel', 'Medical', 'LTA', 'Telephone', 'Food', 'Office Supplies', 'Other'];
const EMPTY_FORM = { category: 'Travel', amount: '', expense_date: '', description: '' };

export default function EssExpenseClaims() {
    const [claims, setClaims] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [receipt, setReceipt] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/ess/expense-claims');
        setClaims(data);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([k, v]) => formData.append(k, v));
            if (receipt) formData.append('receipt', receipt);
            await apiClient.post('/ess/expense-claims', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setForm(EMPTY_FORM);
            setReceipt(null);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit claim');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div>
            <div className="page-header"><h1>Expense Claims</h1></div>

            <div className="groupbox" style={{ marginBottom: 16 }}>
                <div className="groupbox-label">Submit a Claim</div>
                <form onSubmit={handleSubmit} className="win-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="win-field stack">
                        <label>Category</label>
                        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="win-field stack">
                        <label>Amount</label>
                        <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required style={{ width: 120 }} />
                    </div>
                    <div className="win-field stack">
                        <label>Date</label>
                        <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
                    </div>
                    <div className="win-field stack" style={{ flex: 1, minWidth: 180 }}>
                        <label>Description</label>
                        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%' }} />
                    </div>
                    <div className="win-field stack">
                        <label>Receipt (optional)</label>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setReceipt(e.target.files[0] || null)} />
                    </div>
                    <button className="win-btn" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Claim'}</button>
                </form>
                {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>

            <table className="win-grid">
                <thead><tr><th>Category</th><th>Date</th><th>Amount</th><th>Description</th><th>Receipt</th><th>Status</th></tr></thead>
                <tbody>
                    {claims.map((c) => (
                        <tr key={c.id}>
                            <td>{c.category}</td>
                            <td>{c.expense_date}</td>
                            <td>₹{Number(c.amount).toFixed(2)}</td>
                            <td>{c.description}</td>
                            <td>
                                {c.receipt_stored_name
                                    ? <button className="win-btn small outline" onClick={() => openFile(`/ess/expense-claims/${c.id}/receipt`)}>View</button>
                                    : <span className="text-muted">—</span>}
                            </td>
                            <td><span className={`win-badge ${c.status === 'Approved' || c.status === 'Paid' ? 'ok' : c.status === 'Rejected' ? 'bad' : 'warn'}`}>{c.status}</span></td>
                        </tr>
                    ))}
                    {claims.length === 0 && <tr><td colSpan={6} className="text-muted">No expense claims submitted yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
