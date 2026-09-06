import { useEffect, useState, useCallback } from 'react';
import apiClient, { openFile } from '../api/client';
import { useAppState } from '../context/AppStateContext';
import DialogWindow from '../components/layout/DialogWindow';

const CODE_LABEL = { P: 'Present', A: 'Absent', HD: 'Half-Day', L: 'Leave', H: 'Holiday', WO: 'Weekly Off' };
// Compact per-cell colors for the dense day grid — deliberately not the padded pill
// `.win-badge` styling used for scattered status chips elsewhere, which is far too wide
// to fit 31 columns across a screen without wrapping or forcing horizontal scroll.
const CODE_COLOR = {
    P: { bg: '#d8f0d8', fg: '#1a6b1a' },
    A: { bg: '#fadbdb', fg: '#a02525' },
    HD: { bg: '#fff2cc', fg: '#8a6d00' },
    L: { bg: '#fff2cc', fg: '#8a6d00' },
    H: { bg: '#e2e2de', fg: '#444' },
    WO: { bg: '#e2e2de', fg: '#444' },
};
const DAY_COL_WIDTH = 24;

export default function MusterRoll() {
    const { companyId, year, month } = useAppState();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(false);

    const load = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        setError('');
        try {
            const { data } = await apiClient.get('/statutory-files/muster-roll-data', { params: { companyId, year, month } });
            setData(data);
        } catch (err) {
            setData(null);
            setError(err.response?.status === 404 ? (err.response?.data?.error || 'No employees were active during this period.') : (err.response?.data?.error || 'Failed to load muster roll'));
        } finally {
            setLoading(false);
        }
    }, [companyId, year, month]);

    useEffect(() => { load(); }, [load]);

    async function download() {
        setDownloading(true);
        try {
            await openFile('/statutory-files/muster-roll', { params: { companyId, year, month } });
        } catch (err) {
            setError(err.response?.data?.error || 'Download failed');
        } finally {
            setDownloading(false);
        }
    }

    const statusBar = data ? (
        <>
            <span>Employees: <span className="val">{data.rows.length}</span></span>
            <span>Period: <span className="val">{month}/{year}</span></span>
        </>
    ) : null;

    return (
        <DialogWindow title="Muster Roll" icon="fa-table-cells" statusBar={statusBar}>
            <div className="win-row" style={{ marginBottom: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                <p className="text-muted" style={{ margin: 0 }}>
                    Daily attendance register for <strong>{month}/{year}</strong> (change via the Month/FY selector above).
                    P = Present, A = Absent, HD = Half-Day, L = Leave, H = Holiday, WO = Weekly Off.
                </p>
                <button className="win-btn" onClick={download} disabled={downloading || !data}>
                    {downloading ? 'Generating…' : 'Download CSV'}
                </button>
            </div>

            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            {loading ? <p className="text-muted">Loading…</p> : data && (
                <div style={{ overflowX: 'auto' }}>
                    <table className="win-grid" style={{ fontSize: 10.5, width: 'max-content', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: 190 }} />
                            {Array.from({ length: data.totalDays }, (_, i) => <col key={i} style={{ width: DAY_COL_WIDTH }} />)}
                            {Array.from({ length: 6 }, (_, i) => <col key={i} style={{ width: 30 }} />)}
                        </colgroup>
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', left: 0, background: 'var(--win-panel)', whiteSpace: 'nowrap', textAlign: 'left' }}>Employee</th>
                                {Array.from({ length: data.totalDays }, (_, i) => i + 1).map((d) => (
                                    <th key={d} style={{ textAlign: 'center', padding: '4px 2px' }}>{d}</th>
                                ))}
                                <th style={{ textAlign: 'center' }}>P</th><th style={{ textAlign: 'center' }}>A</th><th style={{ textAlign: 'center' }}>HD</th><th style={{ textAlign: 'center' }}>L</th><th style={{ textAlign: 'center' }}>H</th><th style={{ textAlign: 'center' }}>WO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((r) => (
                                <tr key={r.employeeId}>
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--win-input-bg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {r.employeeCode ? `${r.employeeCode} — ` : ''}{r.name}
                                    </td>
                                    {r.days.map((code, i) => {
                                        const c = CODE_COLOR[code];
                                        return (
                                            <td
                                                key={i}
                                                title={CODE_LABEL[code] || ''}
                                                style={{
                                                    textAlign: 'center', padding: '4px 1px', fontWeight: 700,
                                                    background: c ? c.bg : 'transparent', color: c ? c.fg : 'var(--muted)',
                                                }}
                                            >
                                                {code}
                                            </td>
                                        );
                                    })}
                                    <td style={{ textAlign: 'center' }}>{r.summary.P}</td>
                                    <td style={{ textAlign: 'center' }}>{r.summary.A}</td>
                                    <td style={{ textAlign: 'center' }}>{r.summary.HD}</td>
                                    <td style={{ textAlign: 'center' }}>{r.summary.L}</td>
                                    <td style={{ textAlign: 'center' }}>{r.summary.H}</td>
                                    <td style={{ textAlign: 'center' }}>{r.summary.WO}</td>
                                </tr>
                            ))}
                            {data.rows.length === 0 && <tr><td colSpan={data.totalDays + 7} className="text-muted">No employees found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </DialogWindow>
    );
}
