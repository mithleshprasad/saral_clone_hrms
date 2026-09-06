import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation, Outlet } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';

export default function EmployeeList() {
    const { companyId } = useAppState();
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const showDetail = !!id || location.pathname.endsWith('/new');
    const [employees, setEmployees] = useState([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get('/employees', {
                params: { companyId: companyId || undefined, search: search || undefined, limit: 200 },
            });
            setEmployees(data.employees);
            setTotal(data.total);
        } finally {
            setLoading(false);
        }
    }, [companyId, search]);

    useEffect(() => { load(); }, [load]);

    const statusBar = <span>Total Employees: <span className="val">{total}</span></span>;

    return (
        <DialogWindow title="Employee Details" icon="fa-users" statusBar={statusBar}>
            <div className="win-btn-bar" style={{ marginBottom: 8, justifyContent: 'flex-end' }}>
                <button className="win-btn" onClick={() => navigate('/employees/new')}>
                    <i className="fas fa-user-plus"></i> New Employee
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                    <input
                        placeholder="Search by name…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: 280 }}
                    />
                </div>
                <table className="win-grid">
                    <thead><tr><th>Name</th><th>Code</th><th>Department</th></tr></thead>
                    <tbody>
                        {loading && <tr><td colSpan={3} className="text-muted">Loading…</td></tr>}
                        {!loading && employees.length === 0 && <tr><td colSpan={3} className="text-muted">No employees found.</td></tr>}
                        {employees.map((e) => (
                            <tr
                                key={e.id}
                                onClick={() => navigate(`/employees/${e.id}`)}
                                style={{ cursor: 'pointer', background: String(e.id) === id ? '#cfe4ff' : 'transparent' }}
                            >
                                <td style={{ fontWeight: 600 }}>{e.first_name} {e.last_name}</td>
                                <td>{e.employee_code || `#${e.id}`}</td>
                                <td>{e.department_name || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showDetail && (
                <div className="modal-backdrop" onClick={() => navigate('/employees')}>
                    <div style={{ width: 'min(1080px, 95vw)', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <Outlet context={{ reloadList: load, total }} />
                    </div>
                </div>
            )}
        </DialogWindow>
    );
}
