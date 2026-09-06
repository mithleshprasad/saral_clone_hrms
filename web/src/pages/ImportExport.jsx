import { useState } from 'react';
import apiClient from '../api/client';
import { useAppState } from '../context/AppStateContext';
import DialogWindow from '../components/layout/DialogWindow';
import { downloadCsv } from '../utils/csv';

const EMPLOYEE_EXPORT_COLUMNS = [
    'employee_code', 'first_name', 'last_name', 'email', 'phone', 'department_name',
    'position_title', 'date_of_joining', 'status', 'pan_number', 'uan', 'bank_name', 'account_number', 'ifsc_code',
];

const REPORT_EXPORTS = [
    { type: 'sal_sheet', label: 'Salary Sheet', needsMonth: true },
    { type: 'pf_esi', label: 'PF / ESI Statement', needsMonth: true },
    { type: 'tax_rep', label: 'Tax (PT/TDS) Report', needsMonth: true },
    { type: 'dept_summary', label: 'Department-wise Summary', needsMonth: true },
    { type: 'loan_ledger', label: 'Loan / Advance Ledger', needsMonth: false },
];

export default function ImportExport() {
    const { companyId, year, month } = useAppState();
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [exporting, setExporting] = useState('');
    const [error, setError] = useState('');

    async function handleFileSelected(e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (companyId) formData.append('companyId', companyId);
            const { data } = await apiClient.post('/employees/bulk-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportResult(data);
        } catch (err) {
            setImportResult({ error: err.response?.data?.error || 'Import failed' });
        } finally {
            setImporting(false);
        }
    }

    async function exportEmployees() {
        setError('');
        setExporting('employees');
        try {
            const { data } = await apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 5000 } });
            downloadCsv(`Employees_${new Date().toISOString().slice(0, 10)}.csv`, data.employees, EMPLOYEE_EXPORT_COLUMNS);
        } catch (err) {
            setError(err.response?.data?.error || 'Export failed');
        } finally {
            setExporting('');
        }
    }

    async function exportReport(item) {
        setError('');
        setExporting(item.type);
        try {
            const { data } = await apiClient.get(`/payroll/reports/${item.type}`, {
                params: { companyId: companyId || undefined, year, month: item.needsMonth ? month : undefined },
            });
            if (!data || data.length === 0) {
                setError(`No data found for "${item.label}" in the selected period.`);
                return;
            }
            downloadCsv(`${item.label.replace(/[^a-z0-9]+/gi, '_')}_${year}${item.needsMonth ? `_${String(month).padStart(2, '0')}` : ''}.csv`, data);
        } catch (err) {
            setError(err.response?.data?.error || 'Export failed');
        } finally {
            setExporting('');
        }
    }

    return (
        <DialogWindow title="Import / Export" icon="fa-file-export">
            <div className="groupbox">
                <div className="groupbox-label">Import Employees (Excel / CSV)</div>
                <p style={{ fontSize: 11 }}>Bulk-create employees from a spreadsheet. Column headers are matched flexibly (case/whitespace-insensitive) — see Quick Start for the expected columns.</p>
                <label className="win-btn outline" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                    <i className="fas fa-file-excel"></i>&nbsp;{importing ? 'Importing…' : 'Choose File & Import'}
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelected} disabled={importing} style={{ display: 'none' }} />
                </label>
                {importResult && (
                    <p className="mt-16" style={{ color: importResult.error ? 'var(--danger)' : 'var(--success)' }}>
                        {importResult.error || `Imported ${importResult.created} of ${importResult.total} rows.${importResult.skipped.length > 0 ? ` ${importResult.skipped.length} skipped.` : ''}`}
                    </p>
                )}
            </div>

            <div className="groupbox">
                <div className="groupbox-label">Export Employees</div>
                <p style={{ fontSize: 11 }}>Full employee master for the selected company, as CSV.</p>
                <button className="win-btn" onClick={exportEmployees} disabled={exporting === 'employees'}>
                    {exporting === 'employees' ? 'Exporting…' : 'Export Employees (CSV)'}
                </button>
            </div>

            <div className="groupbox">
                <div className="groupbox-label">Export Reports</div>
                <p style={{ fontSize: 11 }}>Same figures as Statutory Reports, downloaded straight to CSV for the current Month/FY selection.</p>
                <div className="win-row">
                    {REPORT_EXPORTS.map((item) => (
                        <button key={item.type} className="win-btn outline" onClick={() => exportReport(item)} disabled={exporting === item.type}>
                            {exporting === item.type ? 'Exporting…' : `Export ${item.label}`}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        </DialogWindow>
    );
}
