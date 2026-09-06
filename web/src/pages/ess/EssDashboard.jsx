import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

export default function EssDashboard() {
    const navigate = useNavigate();
    const [me, setMe] = useState(null);
    const [payslips, setPayslips] = useState([]);
    const [leaves, setLeaves] = useState([]);

    useEffect(() => {
        apiClient.get('/ess/me').then((res) => setMe(res.data));
        apiClient.get('/ess/payslips').then((res) => setPayslips(res.data));
        apiClient.get('/ess/leaves').then((res) => setLeaves(res.data.data));
    }, []);

    if (!me) return <p className="text-muted">Loading…</p>;

    const latestPayslip = payslips[0];
    const pendingLeaves = leaves.filter((l) => l.status === 'Pending').length;

    return (
        <div>
            <div className="page-header"><h1>Welcome, {me.first_name} {me.last_name}</h1></div>

            <div className="stat-grid">
                <div className="stat-card"><div className="label">Designation</div><div className="value" style={{ fontSize: 15 }}>{me.position_title || '—'}</div></div>
                <div className="stat-card"><div className="label">Department</div><div className="value" style={{ fontSize: 15 }}>{me.department_name || '—'}</div></div>
                <div className="stat-card"><div className="label">Latest Net Pay</div><div className="value">{latestPayslip ? `₹${Number(latestPayslip.net_salary).toLocaleString()}` : '—'}</div></div>
                <div className="stat-card"><div className="label">Pending Leave Requests</div><div className="value">{pendingLeaves}</div></div>
            </div>

            <div className="win-row">
                <button className="win-btn" onClick={() => navigate('/ess/payslips')}>View Payslips</button>
                <button className="win-btn outline" onClick={() => navigate('/ess/leave')}>Apply for Leave</button>
                <button className="win-btn outline" onClick={() => navigate('/ess/declarations')}>Tax Declarations</button>
                <button className="win-btn outline" onClick={() => navigate('/ess/letters')}>My Letters</button>
            </div>
        </div>
    );
}
