import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import FormModal from '../../components/layout/FormModal';

const EMPTY_FORM = { loan_type: 'Salary Advance', principal_amount: 0, monthly_emi: 0, start_date: '' };

export default function Advances() {
    const { companyId } = useAppState();
    const [employees, setEmployees] = useState([]);
    const [employeeId, setEmployeeId] = useState('');
    const [loans, setLoans] = useState([]);
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    useEffect(() => {
        apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }).then((res) => {
            setEmployees(res.data.employees);
            if (res.data.employees.length > 0 && !employeeId) setEmployeeId(String(res.data.employees[0].id));
        });
    }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadLoans = useCallback(async () => {
        if (!employeeId) return;
        const { data } = await apiClient.get('/loans', { params: { employee_id: employeeId } });
        setLoans(data);
    }, [employeeId]);

    useEffect(() => { loadLoans(); }, [loadLoans]);

    async function handleAdd(e) {
        e.preventDefault();
        await apiClient.post('/loans', { ...form, employee_id: employeeId, balance: form.principal_amount, status: 'Active' });
        setForm(EMPTY_FORM);
        setShowNew(false);
        loadLoans();
    }

    async function remove(id) {
        if (!confirm('Delete this advance/loan?')) return;
        await apiClient.delete(`/loans/${id}`);
        loadLoans();
    }

    const totalAdvance = loans.reduce((s, l) => s + Number(l.principal_amount), 0);
    const totalRecovered = loans.reduce((s, l) => s + (Number(l.principal_amount) - Number(l.balance)), 0);
    const totalDue = loans.reduce((s, l) => s + Number(l.balance), 0);
    const selectedEmployee = employees.find((e) => String(e.id) === String(employeeId));

    const statusBar = (
        <>
            <span>Total Advance: <span className="val">₹{totalAdvance.toLocaleString()}</span></span>
            <span>Total Receipts: <span className="val">₹{totalRecovered.toLocaleString()}</span></span>
            <span>Total Due: <span className="val" style={{ color: totalDue > 0 ? 'var(--danger)' : 'inherit' }}>₹{totalDue.toLocaleString()}</span></span>
        </>
    );

    return (
        <DialogWindow title="Advance" icon="fa-hand-holding-usd" statusBar={statusBar}>
            <div className="win-row" style={{ justifyContent: 'space-between' }}>
                <div className="win-row" style={{ marginBottom: 0 }}>
                    <div className="win-field">
                        <label>Employee Name</label>
                        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ width: 220 }}>
                            {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                        </select>
                    </div>
                    <div className="win-field"><label>Ref. No.</label><input value={selectedEmployee ? `#${selectedEmployee.id}` : ''} disabled style={{ width: 70 }} /></div>
                </div>
                <button className="win-btn" onClick={() => setShowNew(true)} disabled={!employeeId}><i className="fas fa-plus"></i> New Advance</button>
            </div>

            <table className="win-grid" style={{ marginTop: 10 }}>
                <thead><tr><th>Advance Name</th><th>Date</th><th>Amount</th><th>EMI</th><th>Recovered</th><th>Balance</th><th>Status</th><th></th></tr></thead>
                <tbody>
                    {loans.map((l) => (
                        <tr key={l.id}>
                            <td>{l.loan_type}</td>
                            <td>{l.start_date}</td>
                            <td>{Number(l.principal_amount).toLocaleString()}</td>
                            <td>{Number(l.monthly_emi).toLocaleString()}</td>
                            <td style={{ color: '#1a6b1a' }}>{(Number(l.principal_amount) - Number(l.balance)).toLocaleString()}</td>
                            <td style={{ color: Number(l.balance) > 0 ? '#a02525' : '#1a6b1a' }}>{Number(l.balance).toLocaleString()}</td>
                            <td><span className={`win-badge ${l.status === 'Active' ? 'warn' : 'ok'}`}>{l.status}</span></td>
                            <td><button className="win-btn danger small" onClick={() => remove(l.id)}>Delete</button></td>
                        </tr>
                    ))}
                    {loans.length === 0 && <tr><td colSpan={8} className="text-muted">No advances for this employee.</td></tr>}
                </tbody>
            </table>

            {showNew && (
                <FormModal title="New Advance" icon="fa-hand-holding-usd" onClose={() => setShowNew(false)} width={480}>
                    <form onSubmit={handleAdd}>
                        <div className="form-grid">
                            <div className="form-field"><label>Advance Name</label><input value={form.loan_type} onChange={(e) => setForm({ ...form, loan_type: e.target.value })} /></div>
                            <div className="form-field"><label>Amount</label><input type="number" value={form.principal_amount} onChange={(e) => setForm({ ...form, principal_amount: e.target.value })} /></div>
                            <div className="form-field"><label>Monthly EMI</label><input type="number" value={form.monthly_emi} onChange={(e) => setForm({ ...form, monthly_emi: e.target.value })} /></div>
                            <div className="form-field"><label>Date</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                        </div>
                        <p className="text-muted mt-16" style={{ fontSize: 11 }}>EMI is deducted automatically from this employee's payroll each time it's run, until the balance reaches zero.</p>
                        <div className="win-btn-bar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                            <button type="button" className="win-btn outline" onClick={() => setShowNew(false)}>Cancel</button>
                            <button type="submit" className="win-btn">Save</button>
                        </div>
                    </form>
                </FormModal>
            )}
        </DialogWindow>
    );
}
