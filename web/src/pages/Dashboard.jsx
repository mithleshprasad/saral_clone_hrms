import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAppState } from '../context/AppStateContext';
import DialogWindow from '../components/layout/DialogWindow';

export default function Dashboard() {
    const { companyId } = useAppState();
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        setStats(null);
        apiClient.get('/dashboard/stats', { params: { companyId: companyId || undefined } })
            .then((res) => setStats(res.data))
            .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'));
    }, [companyId]);

    if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>;
    if (!stats) return <p className="text-muted">Loading…</p>;

    const statusBar = (
        <>
            <span>Employees: <span className="val">{stats.totalEmployees}</span></span>
            <span>Departments: <span className="val">{stats.departments}</span></span>
            <span>Present Today: <span className="val">{stats.presentToday}</span></span>
        </>
    );

    return (
        <DialogWindow title="Dashboard" icon="fa-gauge-high" statusBar={statusBar}>
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="label">Total Employees</div>
                    <div className="value">{stats.totalEmployees}</div>
                </div>
                <div className="stat-card">
                    <div className="label">Departments</div>
                    <div className="value">{stats.departments}</div>
                </div>
                <div className="stat-card">
                    <div className="label">Present Today</div>
                    <div className="value">{stats.presentToday}</div>
                </div>
            </div>

            <div className="win-row" style={{ alignItems: 'flex-start' }}>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">Department Distribution</div>
                    {stats.deptDist.length === 0 && <p className="text-muted">No departments yet.</p>}
                    {stats.deptDist.map((d) => (
                        <div key={d.name} className="flex-gap" style={{ justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #ddd8c4' }}>
                            <span>{d.name || 'Unassigned'}</span>
                            <strong>{d.count}</strong>
                        </div>
                    ))}
                </div>

                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">Recent Hires</div>
                    {stats.recentHires.length === 0 && <p className="text-muted">No employees yet.</p>}
                    {stats.recentHires.map((h, i) => (
                        <div key={i} className="flex-gap" style={{ justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #ddd8c4' }}>
                            <span>{h.first_name} {h.last_name}</span>
                            <span className="text-muted">{h.date_of_joining}</span>
                        </div>
                    ))}
                </div>
            </div>
        </DialogWindow>
    );
}
