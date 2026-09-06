import { useState } from 'react';
import { openFile } from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import { todayLocal } from '../../utils/date';

function currentQuarter(month) {
    if (month >= 4 && month <= 6) return 'Q1';
    if (month >= 7 && month <= 9) return 'Q2';
    if (month >= 10 && month <= 12) return 'Q3';
    return 'Q4';
}

export default function StatutoryFiles() {
    const { companyId, year, month, financialYear } = useAppState();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState('');
    const [bonusPercent, setBonusPercent] = useState(8.33);
    const [asOfDate, setAsOfDate] = useState(todayLocal);
    const [quarter, setQuarter] = useState(currentQuarter(month));
    const [bsrCode, setBsrCode] = useState('');
    const [challanNumber, setChallanNumber] = useState('');
    const [challanDate, setChallanDate] = useState('');
    const [challanAmount, setChallanAmount] = useState('');

    async function download(kind, path, params, notFoundHint) {
        setError('');
        setLoading(kind);
        try {
            await openFile(path, { params });
        } catch (err) {
            setError(err.response?.status === 404 ? notFoundHint : (err.response?.data?.error || 'Download failed'));
        } finally {
            setLoading('');
        }
    }

    return (
        <DialogWindow title="Statutory Files" icon="fa-file-export">
            <p className="text-muted">For period <strong>{month}/{year}</strong> (change via the Month/FY selector above).</p>

            <div className="win-row" style={{ alignItems: 'stretch' }}>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">PF ECR File</div>
                    <p style={{ fontSize: 11 }}>EPFO Electronic Challan cum Return — '#~#' delimited text file for the unified portal's monthly PF filing.</p>
                    <button className="win-btn" onClick={() => download('PF', '/statutory-files/pf-ecr', { companyId, year, month }, `No PF-enrolled payroll records found for ${month}/${year}. Run payroll first.`)} disabled={loading === 'PF'}>
                        {loading === 'PF' ? 'Generating…' : 'Download PF ECR'}
                    </button>
                </div>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">ESI Return</div>
                    <p style={{ fontSize: 11 }}>Monthly contribution summary (IP number, wages, employee/employer contribution) as CSV — a data feeder for ESIC's portal, not a direct-upload file.</p>
                    <button className="win-btn" onClick={() => download('ESI', '/statutory-files/esi-return', { companyId, year, month }, `No ESI-enrolled payroll records found for ${month}/${year}. Run payroll first.`)} disabled={loading === 'ESI'}>
                        {loading === 'ESI' ? 'Generating…' : 'Download ESI Return'}
                    </button>
                </div>
            </div>

            <div className="win-row" style={{ alignItems: 'stretch' }}>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">Professional Tax Register</div>
                    <p style={{ fontSize: 11 }}>What was actually deducted per employee this period, using state-wise slabs where the company's state is mapped.</p>
                    <button className="win-btn" onClick={() => download('PT', '/statutory-files/pt-register', { companyId, year, month }, `No PT-deducted payroll records found for ${month}/${year}. Run payroll first.`)} disabled={loading === 'PT'}>
                        {loading === 'PT' ? 'Generating…' : 'Download PT Register'}
                    </button>
                </div>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">LWF Register</div>
                    <p style={{ fontSize: 11 }}>Labour Welfare Fund contribution due for the company's state, per active employee — filing cadence varies by state (monthly/half-yearly/yearly).</p>
                    <button className="win-btn" onClick={() => download('LWF', '/statutory-files/lwf-register', { companyId, year, month }, 'No LWF rate is mapped for this company\'s state, or no active employees found. Check Company Details.')} disabled={loading === 'LWF'}>
                        {loading === 'LWF' ? 'Generating…' : 'Download LWF Register'}
                    </button>
                </div>
            </div>

            <div className="win-row" style={{ alignItems: 'stretch' }}>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">Bonus Register</div>
                    <p style={{ fontSize: 11 }}>Payment of Bonus Act — eligible employees (avg. gross ≤ ₹21,000/month) for financial year <strong>{financialYear}</strong>, computed on Basic+DA capped at ₹7,000.</p>
                    <div className="win-field stack" style={{ marginBottom: 8 }}>
                        <label>Bonus %</label>
                        <input type="number" step="0.01" value={bonusPercent} onChange={(e) => setBonusPercent(e.target.value)} style={{ width: 90 }} />
                    </div>
                    <button className="win-btn" onClick={() => download('Bonus', '/statutory-files/bonus-register', { companyId, financialYear, bonusPercent }, `No employees fall within the wage-ceiling eligibility for FY ${financialYear}, or no payroll processed yet.`)} disabled={loading === 'Bonus'}>
                        {loading === 'Bonus' ? 'Generating…' : 'Download Bonus Register'}
                    </button>
                </div>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">Gratuity Register</div>
                    <p style={{ fontSize: 11 }}>Payment of Gratuity Act — accrued liability for every employee with 5+ years of service, as of a chosen date.</p>
                    <div className="win-field stack" style={{ marginBottom: 8 }}>
                        <label>As of Date</label>
                        <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
                    </div>
                    <button className="win-btn" onClick={() => download('Gratuity', '/statutory-files/gratuity-register', { companyId, asOfDate }, 'No employees with 5+ years of service found.')} disabled={loading === 'Gratuity'}>
                        {loading === 'Gratuity' ? 'Generating…' : 'Download Gratuity Register'}
                    </button>
                </div>
            </div>

            <div className="groupbox">
                <div className="groupbox-label">Form 24Q — Quarterly TDS Data</div>
                <p style={{ fontSize: 11 }}>
                    Employee-wise PAN/gross/TDS for the quarter — the underlying figures a real Form 24Q return needs, not
                    NSDL's fixed-format upload file (deductor/challan/deductee annexures) itself.
                </p>
                <div className="win-row" style={{ alignItems: 'flex-end' }}>
                    <div className="win-field stack">
                        <label>Quarter</label>
                        <select value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                            <option value="Q1">Q1 (Apr–Jun)</option>
                            <option value="Q2">Q2 (Jul–Sep)</option>
                            <option value="Q3">Q3 (Oct–Dec)</option>
                            <option value="Q4">Q4 (Jan–Mar)</option>
                        </select>
                    </div>
                    <button className="win-btn" onClick={() => download('Form24Q', '/statutory-files/form-24q', { companyId, financialYear, quarter }, `No TDS-bearing payroll records found for ${quarter} of FY ${financialYear}.`)} disabled={loading === 'Form24Q'}>
                        {loading === 'Form24Q' ? 'Generating…' : `Download Form 24Q — ${quarter} FY ${financialYear}`}
                    </button>
                </div>

                <div className="groupbox" style={{ marginTop: 12 }}>
                    <div className="groupbox-label">Form 24Q — NSDL Format (.txt)</div>
                    <p style={{ fontSize: 11 }}>
                        Mirrors NSDL's e-TDS record structure (File Header / Batch Header / Challan Detail / Deductee Detail) rather than
                        a flat CSV. Enter the TDS deposit challan details from your bank receipt for {quarter} — a structural approximation
                        for review/adaptation, not guaranteed to pass NSDL's File Validation Utility byte-for-byte.
                    </p>
                    <div className="win-row" style={{ alignItems: 'flex-end' }}>
                        <div className="win-field stack"><label>BSR Code</label><input value={bsrCode} onChange={(e) => setBsrCode(e.target.value)} style={{ width: 100 }} /></div>
                        <div className="win-field stack"><label>Challan Serial No.</label><input value={challanNumber} onChange={(e) => setChallanNumber(e.target.value)} style={{ width: 110 }} /></div>
                        <div className="win-field stack"><label>Deposit Date</label><input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} /></div>
                        <div className="win-field stack"><label>Deposit Amount</label><input type="number" step="0.01" value={challanAmount} onChange={(e) => setChallanAmount(e.target.value)} style={{ width: 110 }} /></div>
                        <button
                            className="win-btn"
                            onClick={() => download('Form24QNsdl', '/statutory-files/form-24q-nsdl', { companyId, financialYear, quarter, bsrCode, challanNumber, challanDate, challanAmount }, `No TDS-bearing payroll records found for ${quarter} of FY ${financialYear}.`)}
                            disabled={loading === 'Form24QNsdl' || !bsrCode || !challanNumber || !challanDate || !challanAmount}
                        >
                            {loading === 'Form24QNsdl' ? 'Generating…' : 'Download NSDL Format'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="win-row" style={{ alignItems: 'stretch' }}>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">Form 3A — Annual PF Statement</div>
                    <p style={{ fontSize: 11 }}>EPFO's member-wise annual PF contribution statement — month-wise EPF wages, employee/employer PF and EPS contributions for financial year <strong>{financialYear}</strong>, with an annual total per employee.</p>
                    <button className="win-btn" onClick={() => download('Form3A', '/statutory-files/form-3a', { companyId, financialYear }, `No PF-enrolled payroll records found for FY ${financialYear}.`)} disabled={loading === 'Form3A'}>
                        {loading === 'Form3A' ? 'Generating…' : 'Download Form 3A'}
                    </button>
                </div>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">Form 5 — New PF Subscribers</div>
                    <p style={{ fontSize: 11 }}>EPFO's monthly return of employees newly enrolled in PF (date of joining falls in this period).</p>
                    <button className="win-btn" onClick={() => download('Form5', '/statutory-files/form-5', { companyId, year, month }, `No new PF-enrolled joiners found for ${month}/${year}.`)} disabled={loading === 'Form5'}>
                        {loading === 'Form5' ? 'Generating…' : 'Download Form 5'}
                    </button>
                </div>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">Form 10 — PF Exits</div>
                    <p style={{ fontSize: 11 }}>EPFO's monthly return of employees who left PF coverage (exit date falls in this period).</p>
                    <button className="win-btn" onClick={() => download('Form10', '/statutory-files/form-10', { companyId, year, month }, `No PF-enrolled exits found for ${month}/${year}.`)} disabled={loading === 'Form10'}>
                        {loading === 'Form10' ? 'Generating…' : 'Download Form 10'}
                    </button>
                </div>
            </div>

            <div className="groupbox">
                <div className="groupbox-label">Bank Payment File — NEFT/RTGS Salary Upload</div>
                <p style={{ fontSize: 11 }}>
                    Bank-specific bulk-upload layouts for {month}/{year} — column order/headers differ by bank; each auto-picks NEFT
                    below ₹2,00,000 and RTGS above it. Verify against your bank's current corporate netbanking template before uploading.
                </p>
                <div className="win-row">
                    <button className="win-btn" onClick={() => download('SBI', '/statutory-files/bank-file/sbi', { companyId, year, month }, `No payroll records with a bank account on file were found for ${month}/${year}.`)} disabled={loading === 'SBI'}>
                        {loading === 'SBI' ? 'Generating…' : 'SBI Format'}
                    </button>
                    <button className="win-btn" onClick={() => download('HDFC', '/statutory-files/bank-file/hdfc', { companyId, year, month }, `No payroll records with a bank account on file were found for ${month}/${year}.`)} disabled={loading === 'HDFC'}>
                        {loading === 'HDFC' ? 'Generating…' : 'HDFC Format'}
                    </button>
                    <button className="win-btn" onClick={() => download('ICICI', '/statutory-files/bank-file/icici', { companyId, year, month }, `No payroll records with a bank account on file were found for ${month}/${year}.`)} disabled={loading === 'ICICI'}>
                        {loading === 'ICICI' ? 'Generating…' : 'ICICI Format'}
                    </button>
                </div>
            </div>

            {error && <p style={{ color: 'var(--danger)', marginTop: 12 }}>{error}</p>}
        </DialogWindow>
    );
}
