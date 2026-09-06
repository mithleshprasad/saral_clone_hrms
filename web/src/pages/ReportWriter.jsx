import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAppState } from '../context/AppStateContext';
import DialogWindow from '../components/layout/DialogWindow';

export default function ReportWriter() {
    const { companyId, year, month } = useAppState();
    const [columns, setColumns] = useState([]);
    const [selectedColumns, setSelectedColumns] = useState(new Set(['first_name', 'last_name', 'net_salary']));
    const [employees, setEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState(new Set());
    const [groupBy, setGroupBy] = useState('none');
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        apiClient.get('/report-writer/columns').then((res) => setColumns(res.data));
        apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }).then((res) => setEmployees(res.data.employees));
    }, [companyId]);

    const grouped = columns.reduce((acc, c) => {
        (acc[c.group] = acc[c.group] || []).push(c);
        return acc;
    }, {});

    function toggleColumn(key) {
        const next = new Set(selectedColumns);
        next.has(key) ? next.delete(key) : next.add(key);
        setSelectedColumns(next);
    }

    function toggleEmployee(id) {
        const next = new Set(selectedEmployees);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedEmployees(next);
    }

    async function runReport() {
        setError('');
        setLoading(true);
        try {
            const lastDay = new Date(year, month, 0).getDate();
            const { data } = await apiClient.post('/report-writer/run', {
                columns: Array.from(selectedColumns),
                employeeIds: selectedEmployees.size > 0 ? Array.from(selectedEmployees) : undefined,
                companyId,
                startDate: `${year}-${String(month).padStart(2, '0')}-01`,
                endDate: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
                groupBy: groupBy === 'none' ? undefined : groupBy,
            });
            setRows(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Report failed');
        } finally {
            setLoading(false);
        }
    }

    const statusBar = rows ? <span>Rows: <span className="val">{rows.length}</span></span> : null;

    return (
        <DialogWindow title="Report Writer" icon="fa-table" statusBar={statusBar}>
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 1fr', gap: 12, marginBottom: 8 }}>
                <div className="groupbox" style={{ maxHeight: 340, overflowY: 'auto' }}>
                    <div className="groupbox-label">Employees</div>
                    <p className="text-muted" style={{ fontSize: 11 }}>None selected = all employees</p>
                    {employees.map((e) => (
                        <label key={e.id} style={{ display: 'block', fontSize: 12, padding: '2px 0' }}>
                            <input type="checkbox" checked={selectedEmployees.has(e.id)} onChange={() => toggleEmployee(e.id)} /> {e.first_name} {e.last_name}
                        </label>
                    ))}
                </div>

                <div className="groupbox" style={{ gridColumn: 'span 2', maxHeight: 340, overflowY: 'auto' }}>
                    <div className="groupbox-label">Columns</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {Object.entries(grouped).map(([group, cols]) => (
                            <div key={group}>
                                <strong style={{ fontSize: 11, color: 'var(--win-text-muted)' }}>{group}</strong>
                                {cols.map((c) => (
                                    <label key={c.key} style={{ display: 'block', fontSize: 12, padding: '2px 0' }}>
                                        <input type="checkbox" checked={selectedColumns.has(c.key)} onChange={() => toggleColumn(c.key)} /> {c.label}
                                    </label>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="groupbox">
                <div className="groupbox-label">Run</div>
                <div className="win-row" style={{ alignItems: 'flex-end' }}>
                    <div className="win-field stack">
                        <label>Group By</label>
                        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                            <option value="none">None (row per payslip)</option>
                            <option value="employee">Employee (period totals)</option>
                            <option value="department">Department</option>
                        </select>
                    </div>
                    <div className="text-muted">Period: {month}/{year} (from the selector above)</div>
                    <button className="win-btn" onClick={runReport} disabled={loading || selectedColumns.size === 0}>
                        {loading ? 'Running…' : 'View Report'}
                    </button>
                </div>
            </div>

            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

            {rows && (
                <div style={{ overflowX: 'auto', marginTop: 10 }}>
                    <table className="win-grid">
                        <thead><tr>{Object.keys(rows[0] || {}).map((c) => <th key={c}>{c}</th>)}</tr></thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i}>{Object.keys(rows[0] || {}).map((c) => <td key={c}>{String(r[c] ?? '')}</td>)}</tr>
                            ))}
                            {rows.length === 0 && <tr><td className="text-muted">No data for this selection.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </DialogWindow>
    );
}
