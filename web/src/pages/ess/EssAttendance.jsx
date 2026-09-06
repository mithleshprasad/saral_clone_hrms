import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

export default function EssAttendance() {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        apiClient.get('/ess/attendance').then((res) => setRows(res.data));
    }, []);

    return (
        <div>
            <div className="page-header"><h1>My Attendance</h1></div>
            <table className="win-grid">
                <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th></tr></thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <td>{r.date}</td>
                            <td><span className={`win-badge ${r.status === 'Present' ? 'ok' : r.status === 'Absent' ? 'bad' : 'warn'}`}>{r.status}</span></td>
                            <td>{r.check_in_time || '—'}</td>
                            <td>{r.check_out_time || '—'}</td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={4} className="text-muted">No attendance records yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
