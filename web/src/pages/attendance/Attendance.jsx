import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import { todayLocal } from '../../utils/date';

const STATUSES = ['Present', 'Absent', 'Half-Day', 'Late', 'On Leave'];

export default function Attendance() {
    const { companyId } = useAppState();
    const [date, setDate] = useState(todayLocal);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [empRes, attRes] = await Promise.all([
                apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }),
                apiClient.get('/attendance', { params: { companyId: companyId || undefined, date, limit: 500 } }),
            ]);
            const attByEmp = new Map(attRes.data.data.map((a) => [a.employee_id, a]));
            setRows(empRes.data.employees.map((e) => ({
                employee: e,
                attendance: attByEmp.get(e.id) || null,
            })));
        } finally {
            setLoading(false);
        }
    }, [companyId, date]);

    useEffect(() => { load(); }, [load]);

    async function markStatus(row, status) {
        if (row.attendance) {
            await apiClient.put(`/attendance/${row.attendance.id}`, { status });
        } else {
            await apiClient.post('/attendance/manual', { employee_id: row.employee.id, date, status });
        }
        load();
    }

    async function handlePunchImport(e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (companyId) formData.append('companyId', companyId);
            const { data } = await apiClient.post('/attendance/punch-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportResult(data);
            load();
        } catch (err) {
            setImportResult({ error: err.response?.data?.error || 'Import failed' });
        } finally {
            setImporting(false);
        }
    }

    const marked = rows.filter((r) => r.attendance?.status === 'Present').length;
    const statusBar = (
        <>
            <span>Employees: <span className="val">{rows.length}</span></span>
            <span>Present: <span className="val">{marked}</span></span>
        </>
    );

    return (
        <DialogWindow title="Daily Attendance" icon="fa-calendar-day" statusBar={statusBar}>
            <div className="win-row" style={{ marginBottom: 8, justifyContent: 'space-between' }}>
                <div className="win-field"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <label className="win-btn outline" style={{ cursor: 'pointer' }}>
                    <i className="fas fa-fingerprint"></i> {importing ? 'Importing…' : 'Import Punch Log'}
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handlePunchImport} disabled={importing} style={{ display: 'none' }} />
                </label>
            </div>

            {importResult && (
                <p className="mt-16" style={{ color: importResult.error ? 'var(--danger)' : 'var(--success)' }}>
                    {importResult.error || `Imported ${importResult.imported} employee-day record(s) from ${importResult.totalPunchRows} punch rows.${importResult.skipped.length > 0 ? ` ${importResult.skipped.length} row(s) skipped — see below.` : ''}`}
                    {!importResult.error && importResult.skipped.length > 0 && (
                        <span className="text-muted" style={{ display: 'block', fontSize: 11 }}>
                            {importResult.skipped.slice(0, 5).map((s, i) => (
                                <span key={i}>{s.row ? `Row ${s.row}` : s.employeeCode}: {s.reason}{i < Math.min(4, importResult.skipped.length - 1) ? '; ' : ''}</span>
                            ))}
                            {importResult.skipped.length > 5 ? ` …and ${importResult.skipped.length - 5} more` : ''}
                        </span>
                    )}
                </p>
            )}

            {loading ? <p className="text-muted">Loading…</p> : (
                <table className="win-grid">
                    <thead>
                        <tr><th>Employee</th><th>Status</th><th>Check In</th><th>Check Out</th><th>OT Hrs</th><th>Mark</th></tr>
                    </thead>
                    <tbody>
                        {rows.map(({ employee, attendance }) => (
                            <tr key={employee.id}>
                                <td>{employee.first_name} {employee.last_name}</td>
                                <td>
                                    {attendance?.status
                                        ? <span className={`win-badge ${attendance.status === 'Present' ? 'ok' : attendance.status === 'Absent' ? 'bad' : 'warn'}`}>{attendance.status}</span>
                                        : <span className="win-badge neutral">Not marked</span>}
                                </td>
                                <td>{attendance?.check_in_time || '—'}</td>
                                <td>{attendance?.check_out_time || '—'}</td>
                                <td>{Number(attendance?.overtime_hours || 0) > 0 ? Number(attendance.overtime_hours).toFixed(2) : '—'}</td>
                                <td>
                                    <select value="" onChange={(e) => e.target.value && markStatus({ employee, attendance }, e.target.value)}>
                                        <option value="">Set status…</option>
                                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && <tr><td colSpan={6} className="text-muted">No employees found.</td></tr>}
                    </tbody>
                </table>
            )}
        </DialogWindow>
    );
}
