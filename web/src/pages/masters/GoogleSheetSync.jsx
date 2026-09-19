import { useEffect, useState, useCallback } from 'react';
import DialogWindow from '../../components/layout/DialogWindow';
import FormModal from '../../components/layout/FormModal';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';

export default function GoogleSheetSync() {
    const { companyId } = useAppState();
    const [connections, setConnections] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [syncableTables, setSyncableTables] = useState([]);
    const [reviewQueue, setReviewQueue] = useState([]);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);

    const [connectModal, setConnectModal] = useState(false);
    const [connectForm, setConnectForm] = useState({ name: '', url: '' });
    const [pendingSecret, setPendingSecret] = useState('');
    const [scriptCode, setScriptCode] = useState('Generating your one-time code…');
    const [connectStatus, setConnectStatus] = useState('');
    const [connectBusy, setConnectBusy] = useState(false);

    const [syncModal, setSyncModal] = useState(false);
    const [editingMappingId, setEditingMappingId] = useState(null);
    const [syncForm, setSyncForm] = useState({ tableName: '', connectionId: '', sheetTab: '', direction: 'export' });
    const [columnMapping, setColumnMapping] = useState({});
    const [sheetHeaders, setSheetHeaders] = useState([]);
    const [mappingLoading, setMappingLoading] = useState(false);
    const [syncBusy, setSyncBusy] = useState(false);

    const load = useCallback(async () => {
        if (!companyId) return;
        try {
            const [connRes, mapRes, tableRes, reviewRes] = await Promise.all([
                apiClient.get('/google-sync/connections', { params: { companyId } }),
                apiClient.get('/google-sync/mappings', { params: { companyId } }),
                apiClient.get('/google-sync/syncable-tables'),
                apiClient.get('/google-sync/review-queue', { params: { companyId } }),
            ]);
            setConnections(connRes.data);
            setMappings(mapRes.data);
            setSyncableTables(tableRes.data);
            setReviewQueue(reviewRes.data);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to load Google Sync data');
        }
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    // ---- Connect a Sheet ----
    async function openConnectModal() {
        setConnectForm({ name: '', url: '' });
        setConnectStatus('');
        setScriptCode('Generating your one-time code…');
        setConnectModal(true);
        try {
            const { data } = await apiClient.post('/google-sync/generate-template');
            setPendingSecret(data.secret);
            setScriptCode(data.scriptCode);
        } catch (e) {
            setScriptCode('Error generating code: ' + (e.response?.data?.error || e.message));
        }
    }

    function copyScript() {
        navigator.clipboard?.writeText(scriptCode);
        setConnectStatus('Script copied to clipboard.');
    }

    async function testAndSaveConnection() {
        if (!connectForm.url.trim()) { setConnectStatus('Paste the Web app URL first.'); return; }
        if (!pendingSecret) { setConnectStatus('Code not ready yet, try again in a moment.'); return; }
        setConnectBusy(true);
        setConnectStatus('Testing connection…');
        try {
            await apiClient.post('/google-sync/connections', {
                companyId, name: connectForm.name.trim() || undefined, scriptUrl: connectForm.url.trim(), secret: pendingSecret,
            });
            setConnectModal(false);
            load();
        } catch (e) {
            setConnectStatus(e.response?.data?.error || 'Failed to connect.');
        } finally {
            setConnectBusy(false);
        }
    }

    async function deleteConnection(id) {
        if (!confirm('Disconnect this sheet? Any table syncs using it will stop working.')) return;
        setBusyId('conn-' + id);
        try { await apiClient.delete(`/google-sync/connections/${id}`); load(); }
        finally { setBusyId(null); }
    }

    async function refreshTabs(id) {
        setBusyId('refresh-' + id);
        try { await apiClient.post(`/google-sync/connections/${id}/refresh-tabs`); load(); }
        finally { setBusyId(null); }
    }

    // ---- Table Sync mapping ----
    function openNewSyncModal() {
        if (connections.length === 0) { alert('Connect a Sheet first.'); return; }
        setEditingMappingId(null);
        const firstConn = connections[0];
        setSyncForm({ tableName: syncableTables[0]?.table || '', connectionId: firstConn.id, sheetTab: firstConn.tabs[0] || '', direction: 'export' });
        setColumnMapping({});
        setSheetHeaders([]);
        setSyncModal(true);
    }

    function openEditSyncModal(m) {
        setEditingMappingId(m.id);
        setSyncForm({ tableName: m.table_name, connectionId: m.connection_id, sheetTab: m.sheet_tab, direction: m.direction });
        setColumnMapping(m.column_mapping || {});
        setSheetHeaders([]);
        setSyncModal(true);
    }

    // Rebuilds the column-mapping table whenever table/connection/tab/direction changes —
    // for import it also fetches the sheet's real headers so the second column is a
    // dropdown of what's actually there, not a guess.
    const rebuildMappingUI = useCallback(async (form, existingMapping) => {
        const cfg = syncableTables.find((t) => t.table === form.tableName);
        if (!cfg || !form.sheetTab) { setSheetHeaders([]); return; }
        if (form.direction === 'import' && form.connectionId) {
            setMappingLoading(true);
            try {
                const { data } = await apiClient.get('/google-sync/tab-headers', { params: { connectionId: form.connectionId, tab: form.sheetTab } });
                setSheetHeaders(data);
                if (!existingMapping) {
                    const guessed = {};
                    cfg.columns.forEach((col) => {
                        const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const match = data.find((h) => norm(h) === norm(col));
                        if (match) guessed[col] = match;
                    });
                    setColumnMapping(guessed);
                }
            } catch (e) {
                setError(e.response?.data?.error || 'Failed to read sheet columns');
                setSheetHeaders([]);
            } finally {
                setMappingLoading(false);
            }
        } else {
            setSheetHeaders([]);
            if (!existingMapping && form.direction === 'export') {
                const identity = {};
                cfg.columns.forEach((col) => { identity[col] = col; });
                setColumnMapping(identity);
            }
        }
    }, [syncableTables]);

    useEffect(() => {
        if (syncModal) rebuildMappingUI(syncForm, editingMappingId ? columnMapping : null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncModal, syncForm.tableName, syncForm.connectionId, syncForm.sheetTab, syncForm.direction]);

    function onConnectionChange(id) {
        const conn = connections.find((c) => c.id === Number(id));
        setSyncForm({ ...syncForm, connectionId: Number(id), sheetTab: conn?.tabs[0] || '' });
    }

    async function saveMapping() {
        setSyncBusy(true);
        try {
            await apiClient.post('/google-sync/mappings', {
                id: editingMappingId || undefined,
                connectionId: syncForm.connectionId,
                tableName: syncForm.tableName,
                sheetTab: syncForm.sheetTab,
                direction: syncForm.direction,
                columnMapping,
            });
            setSyncModal(false);
            load();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to save sync');
        } finally {
            setSyncBusy(false);
        }
    }

    async function deleteMapping(id) {
        if (!confirm('Remove this sync?')) return;
        setBusyId('map-' + id);
        try { await apiClient.delete(`/google-sync/mappings/${id}`); load(); }
        finally { setBusyId(null); }
    }

    async function runSync(id) {
        setBusyId('run-' + id);
        try {
            const { data } = await apiClient.post(`/google-sync/mappings/${id}/sync`);
            alert(data.queued !== undefined ? `${data.queued} new row(s) sent for review (${data.skipped} skipped/duplicate).` : `Exported ${data.rows} row(s).`);
            load();
        } catch (e) {
            alert('Sync failed: ' + (e.response?.data?.error || e.message));
        } finally {
            setBusyId(null);
        }
    }

    async function approveReview(id) {
        setBusyId('approve-' + id);
        try { await apiClient.post(`/google-sync/review-queue/${id}/approve`); load(); }
        catch (e) { alert(e.response?.data?.error || 'Approval failed'); }
        finally { setBusyId(null); }
    }

    async function rejectReview(id) {
        setBusyId('reject-' + id);
        try { await apiClient.post(`/google-sync/review-queue/${id}/reject`); load(); }
        finally { setBusyId(null); }
    }

    const currentConn = connections.find((c) => c.id === Number(syncForm.connectionId));
    const currentCfg = syncableTables.find((t) => t.table === syncForm.tableName);

    return (
        <DialogWindow title="Google Sheet Sync" icon="fa-table">
            <p className="text-muted" style={{ marginTop: 0 }}>
                Connect a Google Sheet using a small script that runs under your own Google account — no Google
                sign-in inside MpxHR, nothing to install. Paste it into Extensions &rsaquo; Apps Script on the Sheet,
                deploy it as a web app, and paste the URL back here.
            </p>
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

            <div className="groupbox" style={{ marginBottom: 16 }}>
                <div className="groupbox-label">Connected Sheets</div>
                {connections.length === 0 && <div className="text-muted" style={{ fontSize: 13, padding: '6px 0' }}>No sheets connected yet.</div>}
                {connections.map((c) => (
                    <div key={c.id} style={rowStyle}>
                        <div>
                            <div style={{ fontWeight: 600 }}><i className="fas fa-table" style={{ color: '#1a8a5a', marginRight: 6 }}></i>{c.name}</div>
                            <div className="text-muted" style={{ fontSize: 11.5 }}>Tabs: {c.tabs.join(', ') || '—'}</div>
                        </div>
                        <div className="win-btn-bar" style={{ borderTop: 'none', padding: 0 }}>
                            <button className="win-btn small" onClick={() => refreshTabs(c.id)} disabled={busyId === 'refresh-' + c.id} title="Refresh tabs">
                                <i className={`fas fa-sync ${busyId === 'refresh-' + c.id ? 'fa-spin' : ''}`}></i>
                            </button>
                            <button className="win-btn danger small" onClick={() => deleteConnection(c.id)} disabled={busyId === 'conn-' + c.id} title="Disconnect">
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                ))}
                <button className="win-btn" style={{ marginTop: 8 }} onClick={openConnectModal}><i className="fas fa-plus"></i> Connect a Sheet</button>
            </div>

            <div className="groupbox" style={{ marginBottom: 16 }}>
                <div className="groupbox-label">Table Sync</div>
                {mappings.length === 0 && <div className="text-muted" style={{ fontSize: 13, padding: '6px 0' }}>No table syncs set up yet.</div>}
                {mappings.map((m) => (
                    <div key={m.id} style={rowStyle}>
                        <div>
                            <div style={{ fontWeight: 600 }}>
                                {m.tableLabel} <i className={`fas fa-arrow-${m.direction === 'export' ? 'right' : 'left'}`} style={{ color: '#888', fontSize: 11 }}></i> {m.connection_name || '?'} / {m.sheet_tab}
                            </div>
                            <div className="text-muted" style={{ fontSize: 11.5 }}>
                                {m.direction === 'export' ? 'Export (MpxHR → Sheet)' : 'Import (Sheet → Review Queue)'} · Last: {m.last_synced_at ? `${m.last_synced_at} (${m.last_status || ''})` : 'never'}
                            </div>
                        </div>
                        <div className="win-btn-bar" style={{ borderTop: 'none', padding: 0 }}>
                            <button className="win-btn small" onClick={() => runSync(m.id)} disabled={busyId === 'run-' + m.id}>
                                <i className={`fas fa-play ${busyId === 'run-' + m.id ? 'fa-spin' : ''}`}></i> Sync Now
                            </button>
                            <button className="win-btn small" onClick={() => openEditSyncModal(m)}><i className="fas fa-edit"></i></button>
                            <button className="win-btn danger small" onClick={() => deleteMapping(m.id)} disabled={busyId === 'map-' + m.id}><i className="fas fa-trash"></i></button>
                        </div>
                    </div>
                ))}
                <button className="win-btn" style={{ marginTop: 8 }} onClick={openNewSyncModal}><i className="fas fa-plus"></i> New Sync</button>
            </div>

            <div className="groupbox">
                <div className="groupbox-label">Review Queue {reviewQueue.length > 0 && <span className="text-muted" style={{ fontWeight: 'normal' }}>({reviewQueue.length} pending)</span>}</div>
                <p className="text-muted" style={{ fontSize: 11.5, marginTop: 0 }}>Rows pulled in from a Sheet land here first — nothing becomes a real record until you approve it.</p>
                {reviewQueue.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>Nothing waiting for review.</div>}
                {reviewQueue.map((it) => (
                    <div key={it.id} style={{ ...rowStyle, alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{it.tableLabel}</div>
                            <div className="text-muted" style={{ fontSize: 11.5 }}>
                                {Object.entries(it.row_data).filter(([k]) => k !== '__row').map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </div>
                        </div>
                        <div className="win-btn-bar" style={{ borderTop: 'none', padding: 0 }}>
                            <button className="win-btn small" onClick={() => approveReview(it.id)} disabled={busyId === 'approve-' + it.id}><i className="fas fa-check"></i> Approve</button>
                            <button className="win-btn danger small" onClick={() => rejectReview(it.id)} disabled={busyId === 'reject-' + it.id}><i className="fas fa-times"></i> Reject</button>
                        </div>
                    </div>
                ))}
            </div>

            {connectModal && (
                <FormModal title="Connect a Google Sheet" icon="fa-table" onClose={() => setConnectModal(false)} width={620}>
                    <ol style={{ fontSize: 13, paddingLeft: 18, marginTop: 0 }}>
                        <li>Open the Google Sheet you want to connect.</li>
                        <li>Menu: <b>Extensions &rsaquo; Apps Script</b>.</li>
                        <li>Delete anything already there, then paste the code below (already includes a unique code for you — no editing needed).</li>
                        <li><b>Deploy &rsaquo; New deployment &rsaquo; Web app</b>. Execute as: <b>Me</b>. Who has access: <b>Anyone</b>. Click Deploy, then Authorize (it's your own script — this is expected).</li>
                        <li>Copy the resulting Web app URL and paste it below.</li>
                    </ol>
                    <div className="win-field stack" style={{ marginBottom: 8 }}>
                        <label>Apps Script code (paste into the Sheet's script editor)</label>
                        <textarea readOnly value={scriptCode} rows={6} style={{ fontFamily: 'monospace', fontSize: 11, width: '100%' }} />
                    </div>
                    <button className="win-btn small" onClick={copyScript} style={{ marginBottom: 14 }}><i className="fas fa-copy"></i> Copy script</button>

                    <div className="win-row">
                        <div className="win-field stack">
                            <label>Name (optional)</label>
                            <input value={connectForm.name} onChange={(e) => setConnectForm({ ...connectForm, name: e.target.value })} placeholder="e.g. Employee Master Sheet" />
                        </div>
                        <div className="win-field stack">
                            <label>Web app URL</label>
                            <input value={connectForm.url} onChange={(e) => setConnectForm({ ...connectForm, url: e.target.value })} placeholder="https://script.google.com/macros/s/…/exec" />
                        </div>
                    </div>
                    {connectStatus && <p style={{ fontSize: 12.5, color: connectStatus.includes('Testing') ? '#666' : undefined }}>{connectStatus}</p>}
                    <div className="win-btn-bar">
                        <button className="win-btn" onClick={testAndSaveConnection} disabled={connectBusy}>{connectBusy ? 'Testing…' : 'Test & Connect'}</button>
                        <button className="win-btn outline" onClick={() => setConnectModal(false)}>Cancel</button>
                    </div>
                </FormModal>
            )}

            {syncModal && (
                <FormModal title={editingMappingId ? 'Edit Table Sync' : 'New Table Sync'} icon="fa-arrows-rotate" onClose={() => setSyncModal(false)} width={620}>
                    <div className="win-row">
                        <div className="win-field stack">
                            <label>Table</label>
                            <select value={syncForm.tableName} onChange={(e) => setSyncForm({ ...syncForm, tableName: e.target.value })}>
                                {syncableTables.map((t) => <option key={t.table} value={t.table}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="win-field stack">
                            <label>Sheet</label>
                            <select value={syncForm.connectionId} onChange={(e) => onConnectionChange(e.target.value)}>
                                {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="win-field stack">
                            <label>Tab</label>
                            <select value={syncForm.sheetTab} onChange={(e) => setSyncForm({ ...syncForm, sheetTab: e.target.value })}>
                                {(currentConn?.tabs || []).map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="win-radio-group" style={{ margin: '10px 0' }}>
                        <label><input type="radio" checked={syncForm.direction === 'export'} onChange={() => setSyncForm({ ...syncForm, direction: 'export' })} /> Export (MpxHR → Sheet)</label>
                        <label><input type="radio" checked={syncForm.direction === 'import'} onChange={() => setSyncForm({ ...syncForm, direction: 'import' })} /> Import (Sheet → Review Queue)</label>
                    </div>

                    {mappingLoading ? (
                        <p><i className="fas fa-spinner fa-spin"></i> Reading the sheet's columns…</p>
                    ) : currentCfg && (
                        <table className="win-grid" style={{ width: '100%' }}>
                            <thead><tr><th>MpxHR field</th><th>Sheet column</th></tr></thead>
                            <tbody>
                                {currentCfg.columns.map((col) => {
                                    const required = currentCfg.required.includes(col);
                                    return (
                                        <tr key={col}>
                                            <td>{col}{required ? ' *' : ''}</td>
                                            <td>
                                                {syncForm.direction === 'export' ? (
                                                    <input value={columnMapping[col] || col} onChange={(e) => setColumnMapping({ ...columnMapping, [col]: e.target.value })} style={{ fontSize: 12, padding: '3px 6px' }} />
                                                ) : (
                                                    <select value={columnMapping[col] || ''} onChange={(e) => setColumnMapping({ ...columnMapping, [col]: e.target.value })} style={{ fontSize: 12, padding: '3px 6px' }}>
                                                        <option value="">— not mapped —</option>
                                                        {sheetHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    <p className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>* required</p>

                    <div className="win-btn-bar">
                        <button className="win-btn" onClick={saveMapping} disabled={syncBusy}>{syncBusy ? 'Saving…' : (editingMappingId ? 'Save Changes' : 'Save Sync')}</button>
                        <button className="win-btn outline" onClick={() => setSyncModal(false)}>Cancel</button>
                    </div>
                </FormModal>
            )}
        </DialogWindow>
    );
}

const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e5e5', gap: 12 };
