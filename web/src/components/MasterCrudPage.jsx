import { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';
import { useAppState } from '../context/AppStateContext';
import DialogWindow from './layout/DialogWindow';

/**
 * Config-driven list + add/edit dialog for simple lookup tables (departments,
 * branches, positions, categories, salary heads, loans, user-defined deductions…).
 *
 * @param {string} title
 * @param {string} apiPath - e.g. '/departments'
 * @param {{key:string,label:string,type?:string,options?:{value,label}[]}[]} fields - form fields
 * @param {{key:string,label:string,render?:(row)=>ReactNode}[]} columns - table columns
 * @param {boolean} [scopedToCompany] - if true, list/create are filtered/tagged with the active company_id
 * @param {string} [icon] - Font Awesome icon class for the dialog title bar
 */
export default function MasterCrudPage({ title, apiPath, fields, columns, scopedToCompany = false, icon = 'fa-table-list' }) {
    const { companyId } = useAppState();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null); // null = closed, {} = new, {...row} = edit
    const [form, setForm] = useState({});

    const singular = title.replace(/s$/, '');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = scopedToCompany && companyId ? { company_id: companyId } : {};
            const { data } = await apiClient.get(apiPath, { params });
            setRows(data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [apiPath, scopedToCompany, companyId]);

    useEffect(() => { load(); }, [load]);

    function openNew() {
        const base = {};
        fields.forEach((f) => { base[f.key] = f.type === 'checkbox' ? false : ''; });
        if (scopedToCompany && companyId) base.company_id = companyId;
        setForm(base);
        setEditing({});
    }

    function openEdit(row) {
        setForm({ ...row });
        setEditing(row);
    }

    // Empty-string values for foreign-key fields (company_id, department_id, ...) or
    // number-type fields must not reach an INT/DECIMAL column — MySQL rejects '' for either,
    // which previously failed silently (error shown, but the cause wasn't obvious):
    // normalize '' -> null for any *_id field or any field explicitly typed 'number'.
    function sanitize(data) {
        const out = { ...data };
        const numberKeys = new Set(fields.filter((f) => f.type === 'number').map((f) => f.key));
        for (const key of Object.keys(out)) {
            if (out[key] === '' && (key.endsWith('_id') || numberKeys.has(key))) out[key] = null;
        }
        return out;
    }

    async function handleSave(e) {
        e.preventDefault();
        try {
            const payload = sanitize(form);
            if (editing && editing.id) {
                await apiClient.put(`${apiPath}/${editing.id}`, payload);
            } else {
                await apiClient.post(apiPath, payload);
            }
            setEditing(null);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Save failed');
        }
    }

    async function handleDelete(row) {
        if (!confirm(`Delete "${row.name || row.title || row.id}"?`)) return;
        try {
            await apiClient.delete(`${apiPath}/${row.id}`);
            load();
        } catch (err) {
            setError(err.response?.data?.error || 'Delete failed');
        }
    }

    const statusBar = <span>Total {title}: <span className="val">{rows.length}</span></span>;

    return (
        <DialogWindow title={title} icon={icon} statusBar={statusBar}>
            <div className="win-btn-bar" style={{ marginBottom: 8 }}>
                <button className="win-btn" onClick={openNew}><i className="fas fa-plus"></i> Add {singular}</button>
            </div>

            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
            {loading ? <p className="text-muted">Loading…</p> : (
                <table className="win-grid">
                    <thead>
                        <tr>
                            {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={columns.length + 1} className="text-muted">No records yet.</td></tr>
                        )}
                        {rows.map((row) => (
                            <tr key={row.id}>
                                {columns.map((c) => (
                                    <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '')}</td>
                                ))}
                                <td>
                                    <div className="flex-gap">
                                        <button className="win-btn small" onClick={() => openEdit(row)}>Edit</button>
                                        <button className="win-btn danger small" onClick={() => handleDelete(row)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {editing !== null && (
                <div className="modal-backdrop" onClick={() => setEditing(null)}>
                    <div className="win-dialog" style={{ width: 'min(640px, 92vw)', maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div className="win-titlebar-bar">
                            <i className="fas fa-window-maximize win-titlebar-icon"></i>
                            <span>{editing.id ? `Edit ${singular}` : `New ${singular}`}</span>
                            <div className="spacer"></div>
                            <div className="win-close" onClick={() => setEditing(null)}>✕</div>
                        </div>
                        <form onSubmit={handleSave} className="win-dialog-body">
                            <div className="form-grid">
                                {fields.map((f) => (
                                    <div className="form-field" key={f.key}>
                                        <label>{f.label}</label>
                                        {f.type === 'select' ? (
                                            <select
                                                value={form[f.key] ?? ''}
                                                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                            >
                                                <option value="">—</option>
                                                {(f.options || []).map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        ) : f.type === 'checkbox' ? (
                                            <input
                                                type="checkbox"
                                                checked={!!form[f.key]}
                                                onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                                                style={{ width: 18, height: 18 }}
                                            />
                                        ) : (
                                            <input
                                                type={f.type || 'text'}
                                                value={form[f.key] ?? ''}
                                                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                                required={f.required}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="win-btn-bar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                                <button type="button" className="win-btn outline" onClick={() => setEditing(null)}>Cancel</button>
                                <button type="submit" className="win-btn">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DialogWindow>
    );
}
