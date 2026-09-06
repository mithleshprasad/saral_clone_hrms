import { useEffect, useState } from 'react';
import apiClient, { openFile } from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';

export default function Letters() {
    const { companyId } = useAppState();
    const [employees, setEmployees] = useState([]);
    const [types, setTypes] = useState([]);
    const [employeeId, setEmployeeId] = useState('');
    const [type, setType] = useState('');
    const [letters, setLetters] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }).then((res) => setEmployees(res.data.employees));
        apiClient.get('/letters/types').then((res) => { setTypes(res.data); setType(res.data[0]); });
    }, [companyId]);

    async function loadLetters(empId) {
        const { data } = await apiClient.get(`/letters/employee/${empId}`);
        setLetters(data);
    }

    useEffect(() => { if (employeeId) loadLetters(employeeId); else setLetters([]); }, [employeeId]);

    async function generate(e) {
        e.preventDefault();
        setError('');
        if (!employeeId) { setError('Select an employee'); return; }
        try {
            await apiClient.post('/letters/generate', { employee_id: employeeId, type });
            loadLetters(employeeId);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate letter');
        }
    }

    return (
        <DialogWindow title="Letters" icon="fa-envelope-open-text">
            <div className="groupbox" style={{ marginBottom: 16 }}>
                <div className="groupbox-label">Generate Letter</div>
                <form onSubmit={generate} className="win-row" style={{ alignItems: 'flex-end' }}>
                    <div className="win-field stack">
                        <label>Employee</label>
                        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ width: 220 }}>
                            <option value="">—</option>
                            {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                        </select>
                    </div>
                    <div className="win-field stack">
                        <label>Letter Type</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 160 }}>
                            {types.map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <button className="win-btn" type="submit">Generate</button>
                </form>
                {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            </div>

            {employeeId && (
                <table className="win-grid">
                    <thead><tr><th>Type</th><th>Generated On</th><th></th></tr></thead>
                    <tbody>
                        {letters.map((l) => (
                            <tr key={l.id}>
                                <td>{l.type}</td>
                                <td>{new Date(l.generated_at).toLocaleString()}</td>
                                <td><button className="win-btn small" onClick={() => openFile(`/letters/${l.id}/download`)}>Download</button></td>
                            </tr>
                        ))}
                        {letters.length === 0 && <tr><td colSpan={3} className="text-muted">No letters generated for this employee yet.</td></tr>}
                    </tbody>
                </table>
            )}
        </DialogWindow>
    );
}
