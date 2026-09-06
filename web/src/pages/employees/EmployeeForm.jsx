import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import apiClient, { openFile } from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import { todayLocal } from '../../utils/date';

const EMPTY = {
    first_name: '', last_name: '', father_name: '', email: '', phone: '',
    gender: 'Male', dob: '',
    company_id: '', branch_id: '', department_id: '', position_id: '', category_id: '',
    date_of_joining: '', salary_from: '', status: 'Active', exit_date: '',
    bank_name: '', account_number: '', ifsc_code: '', payment_mode: 'Bank',
    pan_number: '', aadhaar_number: '', pf_number: '', esi_number: '', uan: '', tax_regime: 'New',
    is_pf_enabled: true, pf_rate: 12, pf_limit_enabled: true, pf_limit: 15000, vpf_percent: 0,
    is_esi_enabled: false, esi_rate: 0, is_pt_enabled: true,
    base_salary: 0, da_rate: 0, hra_rate: 0, conveyance_allowance: 0, medical_allowance: 0, special_allowance_fixed: 0,
    wage_basis: 'Monthly',
    address: '', city: '', state: '', zip_code: '',
    blood_group: '', emergency_contact_name: '', emergency_contact_phone: '',
};

const TABS = ['Present', 'Contact Info', 'Additional Info', 'Salary Structure', 'Onboarding', 'Attendance', 'Documents', 'Perquisites'];
const ATT_STATUS_CLASS = { Present: 'ok', Absent: 'bad', 'Half-Day': 'warn', Late: 'warn', 'On Leave': 'warn', Holiday: 'neutral' };
function monthStart(dateStr) { return dateStr.slice(0, 8) + '01'; }
const DOC_TYPES = ['Aadhaar', 'PAN Card', 'Certificate', 'Other'];
const PERQUISITE_TYPES = ['Accommodation', 'Motor Car', 'ESOP', 'Concessional Loan', 'Club Membership', 'Gifts/Vouchers', 'Other'];
const EMPTY_PERQUISITE = { perquisite_type: 'Accommodation', description: '', value: '', amount_recovered: '' };

export default function EmployeeForm() {
    const { id } = useParams();
    const isNew = !id;
    const navigate = useNavigate();
    const { reloadList, total } = useOutletContext();
    const { companyId, companies, financialYear } = useAppState();

    const [form, setForm] = useState({ ...EMPTY, company_id: companyId || '' });
    const [tab, setTab] = useState(TABS[0]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [onboardingTasks, setOnboardingTasks] = useState([]);
    const [newTask, setNewTask] = useState('');

    const set = (key) => (e) => {
        const val = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
        setForm((f) => ({ ...f, [key]: val }));
    };

    const loadLookups = useCallback(async (cid) => {
        const [b, d, c] = await Promise.all([
            apiClient.get('/branches', { params: { company_id: cid || undefined } }),
            apiClient.get('/departments', { params: { company_id: cid || undefined } }),
            apiClient.get('/employee-categories', { params: { company_id: cid || undefined } }),
        ]);
        setBranches(b.data);
        setDepartments(d.data);
        setCategories(c.data);
    }, []);

    useEffect(() => { loadLookups(form.company_id); }, [form.company_id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!form.department_id) { setPositions([]); return; }
        apiClient.get('/positions', { params: { department_id: form.department_id } }).then((res) => setPositions(res.data));
    }, [form.department_id]);

    useEffect(() => {
        if (isNew) {
            setForm({ ...EMPTY, company_id: companyId || '' });
            return;
        }
        apiClient.get(`/employees/${id}`).then((res) => {
            const e = res.data;
            setForm({
                ...EMPTY,
                ...e,
                is_pf_enabled: !!e.is_pf_enabled,
                is_esi_enabled: !!e.is_esi_enabled,
                is_pt_enabled: !!e.is_pt_enabled,
                pf_limit_enabled: !!e.pf_limit_enabled,
            });
        });
    }, [id, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

    async function handleSave(e) {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const payload = { ...form };
            ['company_id', 'branch_id', 'department_id', 'position_id', 'category_id'].forEach((k) => {
                if (payload[k] === '') payload[k] = null;
            });
            if (isNew) {
                const { data } = await apiClient.post('/employees', payload);
                await reloadList();
                navigate(`/employees/${data.id}`);
            } else {
                await apiClient.put(`/employees/${id}`, payload);
                await reloadList();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm(`Delete ${form.first_name} ${form.last_name}? This removes their attendance, leave, and payroll history.`)) return;
        await apiClient.delete(`/employees/${id}`);
        await reloadList();
        navigate('/employees');
    }

    const loadOnboardingTasks = useCallback(async () => {
        if (isNew) { setOnboardingTasks([]); return; }
        const { data } = await apiClient.get('/onboarding-tasks', { params: { employee_id: id } });
        setOnboardingTasks(data);
    }, [id, isNew]);

    useEffect(() => { loadOnboardingTasks(); }, [loadOnboardingTasks]);

    async function addOnboardingTask(e) {
        e.preventDefault();
        if (!newTask.trim()) return;
        await apiClient.post('/onboarding-tasks', { employee_id: id, task: newTask.trim() });
        setNewTask('');
        loadOnboardingTasks();
    }

    async function toggleOnboardingTask(task) {
        await apiClient.post(`/onboarding-tasks/${task.id}/toggle`);
        loadOnboardingTasks();
    }

    async function removeOnboardingTask(taskId) {
        await apiClient.delete(`/onboarding-tasks/${taskId}`);
        loadOnboardingTasks();
    }

    const [documents, setDocuments] = useState([]);
    const [docType, setDocType] = useState('Other');
    const [uploadingDoc, setUploadingDoc] = useState(false);

    const loadDocuments = useCallback(async () => {
        if (isNew) { setDocuments([]); return; }
        const { data } = await apiClient.get(`/employees/${id}/documents`);
        setDocuments(data);
    }, [id, isNew]);

    useEffect(() => { loadDocuments(); }, [loadDocuments]);

    async function handleDocUpload(e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setUploadingDoc(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('doc_type', docType);
            await apiClient.post(`/employees/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            loadDocuments();
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed');
        } finally {
            setUploadingDoc(false);
        }
    }

    async function removeDocument(docId) {
        if (!confirm('Delete this document?')) return;
        await apiClient.delete(`/employees/${id}/documents/${docId}`);
        loadDocuments();
    }

    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [attStart, setAttStart] = useState(() => monthStart(todayLocal()));
    const [attEnd, setAttEnd] = useState(todayLocal);
    const [loadingAtt, setLoadingAtt] = useState(false);

    const loadAttendanceHistory = useCallback(async () => {
        if (isNew) { setAttendanceHistory([]); return; }
        setLoadingAtt(true);
        try {
            const { data } = await apiClient.get('/attendance', { params: { employeeId: id, startDate: attStart, endDate: attEnd, limit: 500 } });
            const rows = (data.data || data).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
            setAttendanceHistory(rows);
        } finally {
            setLoadingAtt(false);
        }
    }, [id, isNew, attStart, attEnd]);

    useEffect(() => { loadAttendanceHistory(); }, [loadAttendanceHistory]);

    const attSummary = attendanceHistory.reduce((acc, r) => {
        const key = r.status || 'Not marked';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const [perquisites, setPerquisites] = useState([]);
    const [perqForm, setPerqForm] = useState(EMPTY_PERQUISITE);
    const [savingPerq, setSavingPerq] = useState(false);

    const loadPerquisites = useCallback(async () => {
        if (isNew) { setPerquisites([]); return; }
        const { data } = await apiClient.get(`/perquisites/employee/${id}`, { params: { financialYear } });
        setPerquisites(data);
    }, [id, isNew, financialYear]);

    useEffect(() => { loadPerquisites(); }, [loadPerquisites]);

    async function addPerquisite(e) {
        e.preventDefault();
        setSavingPerq(true);
        setError('');
        try {
            await apiClient.post('/perquisites', {
                employee_id: id, financial_year: financialYear,
                perquisite_type: perqForm.perquisite_type, description: perqForm.description || undefined,
                value: Number(perqForm.value), amount_recovered: Number(perqForm.amount_recovered) || 0,
            });
            setPerqForm(EMPTY_PERQUISITE);
            loadPerquisites();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add perquisite');
        } finally {
            setSavingPerq(false);
        }
    }

    async function removePerquisite(perqId) {
        if (!confirm('Delete this perquisite entry?')) return;
        await apiClient.delete(`/perquisites/${perqId}`);
        loadPerquisites();
    }

    const statusBar = (
        <>
            <span>Total Employee: <span className="val">{total}</span></span>
            <span>Current: <span className="val">{form.status === 'Active' ? 'Active' : form.status || '—'}</span></span>
            <span>Listed Employee: <span className="val">{total}</span></span>
        </>
    );

    return (
        <DialogWindow title={isNew ? 'Employee Details — New' : `Employee Details — ${form.first_name} ${form.last_name}`} icon="fa-id-card" statusBar={statusBar} onClose={() => navigate('/employees')}>
            {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

            <div className="win-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 320 }}>
                    <div className="win-row">
                        <div className="win-field"><label>Emp ID</label><input value={isNew ? 'NEW' : `#${id}`} disabled style={{ width: 70 }} /></div>
                        <div className="win-field"><label>First Name *</label><input value={form.first_name} onChange={set('first_name')} required style={{ width: 150 }} /></div>
                        <div className="win-field"><label>Last Name *</label><input value={form.last_name} onChange={set('last_name')} required style={{ width: 150 }} /></div>
                    </div>
                    <div className="win-row">
                        <div className="win-field"><label>Father's Name</label><input value={form.father_name || ''} onChange={set('father_name')} style={{ width: 180 }} /></div>
                        <div className="win-field"><label>Date of Birth</label><input type="date" value={form.dob || ''} onChange={set('dob')} /></div>
                        <div className="win-field"><label>Employee Code</label><input value={form.employee_code || ''} onChange={set('employee_code')} style={{ width: 120 }} /></div>
                    </div>
                    <div className="win-row">
                        <div className="win-field">
                            <label>Gender</label>
                            <div className="win-radio-group">
                                {['Male', 'Female', 'Transgender'].map((g) => (
                                    <label key={g}><input type="radio" name="gender" checked={form.gender === g} onChange={() => set('gender')(g)} /> {g}</label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="win-photobox">No Photo</div>
            </div>

            <div className="win-row" style={{ alignItems: 'flex-start' }}>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">Classification</div>
                    <div className="win-row">
                        <div className="win-field">
                            <label>Company</label>
                            <select value={form.company_id || ''} onChange={set('company_id')} style={{ width: 160 }}>
                                <option value="">—</option>
                                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="win-field">
                            <label>Branch</label>
                            <select value={form.branch_id || ''} onChange={set('branch_id')} style={{ width: 140 }}>
                                <option value="">—</option>
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="win-row">
                        <div className="win-field">
                            <label>Department</label>
                            <select value={form.department_id || ''} onChange={set('department_id')} style={{ width: 160 }}>
                                <option value="">—</option>
                                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="win-field">
                            <label>Designation</label>
                            <select value={form.position_id || ''} onChange={set('position_id')} style={{ width: 160 }}>
                                <option value="">—</option>
                                {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="win-row">
                        <div className="win-field">
                            <label>Category</label>
                            <select value={form.category_id || ''} onChange={set('category_id')} style={{ width: 160 }}>
                                <option value="">—</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="win-field">
                            <label>Status</label>
                            <select value={form.status || 'Active'} onChange={set('status')} style={{ width: 120 }}>
                                <option>Active</option><option>Inactive</option><option>Resigned</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="groupbox" style={{ width: 260 }}>
                    <div className="groupbox-label">Dates</div>
                    <div className="win-field stack" style={{ marginBottom: 6 }}><label>Date of Joining</label><input type="date" value={form.date_of_joining || ''} onChange={set('date_of_joining')} style={{ width: '100%' }} /></div>
                    <div className="win-field stack" style={{ marginBottom: 6 }}><label>Salary Calculate From</label><input type="date" value={form.salary_from || ''} onChange={set('salary_from')} style={{ width: '100%' }} /></div>
                    <div className="win-field stack danger" style={{ marginBottom: 6 }}><label>Date of Leaving</label><input type="date" value={form.exit_date || ''} onChange={set('exit_date')} style={{ width: '100%' }} /></div>
                </div>
            </div>

            <div className="win-row" style={{ alignItems: 'flex-start' }}>
                <div className="groupbox" style={{ flex: 1 }}>
                    <div className="groupbox-label">PF / ESI / PT Details</div>
                    <div className="win-row">
                        <div className="win-field"><label><input type="checkbox" checked={form.is_pf_enabled} onChange={set('is_pf_enabled')} /> PF</label><input value={form.pf_number || ''} onChange={set('pf_number')} disabled={!form.is_pf_enabled} placeholder="PF No." style={{ width: 130 }} /></div>
                        <div className="win-field"><label>UAN</label><input value={form.uan || ''} onChange={set('uan')} disabled={!form.is_pf_enabled} style={{ width: 130 }} /></div>
                        <div className="win-field"><label>PF Rate %</label><input type="number" value={form.pf_rate} onChange={set('pf_rate')} disabled={!form.is_pf_enabled} style={{ width: 60 }} /></div>
                    </div>
                    <div className="win-row">
                        <div className="win-field"><label><input type="checkbox" checked={form.pf_limit_enabled} onChange={set('pf_limit_enabled')} /> Cap PF Wage</label><input type="number" value={form.pf_limit} onChange={set('pf_limit')} disabled={!form.pf_limit_enabled} style={{ width: 90 }} /></div>
                        <div className="win-field"><label>VPF %</label><input type="number" value={form.vpf_percent} onChange={set('vpf_percent')} style={{ width: 60 }} /></div>
                    </div>
                    <div className="win-row">
                        <div className="win-field"><label><input type="checkbox" checked={form.is_esi_enabled} onChange={set('is_esi_enabled')} /> ESI</label><input value={form.esi_number || ''} onChange={set('esi_number')} disabled={!form.is_esi_enabled} placeholder="ESI No." style={{ width: 130 }} /></div>
                        <div className="win-field"><label><input type="checkbox" checked={form.is_pt_enabled} onChange={set('is_pt_enabled')} /> Professional Tax</label></div>
                    </div>
                </div>

                <div className="groupbox" style={{ width: 260 }}>
                    <div className="groupbox-label">TDS Details</div>
                    <div className="win-field stack" style={{ marginBottom: 6 }}><label>PAN</label><input value={form.pan_number || ''} onChange={set('pan_number')} style={{ width: '100%' }} /></div>
                    <div className="win-field stack" style={{ marginBottom: 6 }}><label>Aadhaar</label><input value={form.aadhaar_number || ''} onChange={set('aadhaar_number')} style={{ width: '100%' }} /></div>
                    <div className="win-field stack">
                        <label>Tax Regime</label>
                        <select value={form.tax_regime || 'New'} onChange={set('tax_regime')} style={{ width: '100%' }}>
                            <option value="New">New Regime</option>
                            <option value="Old">Old Regime</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="win-tabs">
                {TABS.map((t) => (
                    <div key={t} className={`win-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</div>
                ))}
            </div>
            <div className="win-tab-body">
                {tab === 'Present' && (
                    <div className="win-row">
                        <div className="win-field stack" style={{ flex: 1 }}><label>Address</label><input value={form.address || ''} onChange={set('address')} style={{ width: '100%' }} /></div>
                        <div className="win-field stack"><label>City</label><input value={form.city || ''} onChange={set('city')} /></div>
                        <div className="win-field stack"><label>State</label><input value={form.state || ''} onChange={set('state')} /></div>
                        <div className="win-field stack"><label>Pincode</label><input value={form.zip_code || ''} onChange={set('zip_code')} /></div>
                    </div>
                )}
                {tab === 'Contact Info' && (
                    <div className="win-row">
                        <div className="win-field stack"><label>Email</label><input type="email" value={form.email || ''} onChange={set('email')} /></div>
                        <div className="win-field stack"><label>Phone</label><input value={form.phone || ''} onChange={set('phone')} /></div>
                        <div className="win-field stack"><label>Emergency Contact Name</label><input value={form.emergency_contact_name || ''} onChange={set('emergency_contact_name')} /></div>
                        <div className="win-field stack"><label>Emergency Contact Phone</label><input value={form.emergency_contact_phone || ''} onChange={set('emergency_contact_phone')} /></div>
                    </div>
                )}
                {tab === 'Additional Info' && (
                    <div className="win-row">
                        <div className="win-field stack"><label>Blood Group</label><input value={form.blood_group || ''} onChange={set('blood_group')} /></div>
                        <div className="win-field stack"><label>Payment Mode</label>
                            <select value={form.payment_mode || 'Bank'} onChange={set('payment_mode')}><option>Bank</option><option>Cash</option><option>Cheque</option></select>
                        </div>
                        <div className="win-field stack"><label>Bank Name</label><input value={form.bank_name || ''} onChange={set('bank_name')} /></div>
                        <div className="win-field stack"><label>Account Number</label><input value={form.account_number || ''} onChange={set('account_number')} /></div>
                        <div className="win-field stack"><label>IFSC Code</label><input value={form.ifsc_code || ''} onChange={set('ifsc_code')} /></div>
                    </div>
                )}
                {tab === 'Salary Structure' && (
                    <div className="win-row">
                        <div className="win-field stack"><label>Basic</label><input type="number" value={form.base_salary} onChange={set('base_salary')} /></div>
                        <div className="win-field stack"><label>DA</label><input type="number" value={form.da_rate} onChange={set('da_rate')} /></div>
                        <div className="win-field stack"><label>HRA</label><input type="number" value={form.hra_rate} onChange={set('hra_rate')} /></div>
                        <div className="win-field stack"><label>Conveyance</label><input type="number" value={form.conveyance_allowance} onChange={set('conveyance_allowance')} /></div>
                        <div className="win-field stack"><label>Medical</label><input type="number" value={form.medical_allowance} onChange={set('medical_allowance')} /></div>
                        <div className="win-field stack"><label>Special Allowance</label><input type="number" value={form.special_allowance_fixed} onChange={set('special_allowance_fixed')} /></div>
                    </div>
                )}
                {tab === 'Onboarding' && (
                    isNew ? (
                        <p className="text-muted">Save this employee first to start their onboarding checklist.</p>
                    ) : (
                        <div>
                            <table className="win-grid" style={{ marginBottom: 10 }}>
                                <thead><tr><th style={{ width: 30 }}></th><th>Task</th><th style={{ width: 60 }}></th></tr></thead>
                                <tbody>
                                    {onboardingTasks.map((t) => (
                                        <tr key={t.id}>
                                            <td><input type="checkbox" checked={!!t.is_completed} onChange={() => toggleOnboardingTask(t)} /></td>
                                            <td style={{ textDecoration: t.is_completed ? 'line-through' : 'none', color: t.is_completed ? '#888' : 'inherit' }}>{t.task}</td>
                                            <td><button type="button" className="win-btn danger small" onClick={() => removeOnboardingTask(t.id)}>✕</button></td>
                                        </tr>
                                    ))}
                                    {onboardingTasks.length === 0 && <tr><td colSpan={3} className="text-muted">No onboarding tasks yet.</td></tr>}
                                </tbody>
                            </table>
                            <form onSubmit={addOnboardingTask} className="win-row">
                                <div className="win-field stack" style={{ flex: 1 }}>
                                    <label>New Task</label>
                                    <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="e.g. Collect ID proof" style={{ width: '100%' }} />
                                </div>
                                <button type="submit" className="win-btn" style={{ alignSelf: 'flex-end' }}>Add Task</button>
                            </form>
                        </div>
                    )
                )}
                {tab === 'Attendance' && (
                    isNew ? (
                        <p className="text-muted">Save this employee first to see their attendance history.</p>
                    ) : (
                        <div>
                            <div className="win-row" style={{ alignItems: 'flex-end', marginBottom: 10 }}>
                                <div className="win-field stack"><label>From</label><input type="date" value={attStart} onChange={(e) => setAttStart(e.target.value)} /></div>
                                <div className="win-field stack"><label>To</label><input type="date" value={attEnd} onChange={(e) => setAttEnd(e.target.value)} /></div>
                                <div className="flex-gap" style={{ marginLeft: 'auto' }}>
                                    {Object.entries(attSummary).map(([status, count]) => (
                                        <span key={status} className={`win-badge ${ATT_STATUS_CLASS[status] || 'neutral'}`}>{status}: {count}</span>
                                    ))}
                                </div>
                            </div>
                            {loadingAtt ? <p className="text-muted">Loading…</p> : (
                                <table className="win-grid">
                                    <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>OT Hrs</th></tr></thead>
                                    <tbody>
                                        {attendanceHistory.map((r) => (
                                            <tr key={r.id}>
                                                <td>{r.date}</td>
                                                <td><span className={`win-badge ${ATT_STATUS_CLASS[r.status] || 'neutral'}`}>{r.status}</span></td>
                                                <td>{r.check_in_time || '—'}</td>
                                                <td>{r.check_out_time || '—'}</td>
                                                <td>{Number(r.overtime_hours || 0) > 0 ? Number(r.overtime_hours).toFixed(2) : '—'}</td>
                                            </tr>
                                        ))}
                                        {attendanceHistory.length === 0 && <tr><td colSpan={5} className="text-muted">No attendance records in this date range.</td></tr>}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )
                )}
                {tab === 'Documents' && (
                    isNew ? (
                        <p className="text-muted">Save this employee first to upload documents.</p>
                    ) : (
                        <div>
                            <table className="win-grid" style={{ marginBottom: 10 }}>
                                <thead><tr><th>Type</th><th>File</th><th>Uploaded</th><th style={{ width: 110 }}></th></tr></thead>
                                <tbody>
                                    {documents.map((d) => (
                                        <tr key={d.id}>
                                            <td>{d.doc_type}</td>
                                            <td>{d.original_name}</td>
                                            <td>{new Date(d.created_at).toLocaleDateString('en-IN')}</td>
                                            <td>
                                                <div className="flex-gap">
                                                    <button type="button" className="win-btn small" onClick={() => openFile(`/employees/${id}/documents/${d.id}/download`)}>Download</button>
                                                    <button type="button" className="win-btn danger small" onClick={() => removeDocument(d.id)}>✕</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {documents.length === 0 && <tr><td colSpan={4} className="text-muted">No documents uploaded yet.</td></tr>}
                                </tbody>
                            </table>
                            <div className="win-row" style={{ alignItems: 'flex-end' }}>
                                <div className="win-field stack">
                                    <label>Type</label>
                                    <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                                        {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <label className="win-btn" style={{ cursor: 'pointer' }}>
                                    <i className="fas fa-upload"></i> {uploadingDoc ? 'Uploading…' : 'Upload Document'}
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleDocUpload} disabled={uploadingDoc} style={{ display: 'none' }} />
                                </label>
                            </div>
                            <p className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>PDF, JPG, PNG, DOC or DOCX — up to 10 MB.</p>
                        </div>
                    )
                )}
                {tab === 'Perquisites' && (
                    isNew ? (
                        <p className="text-muted">Save this employee first to record perquisites.</p>
                    ) : (
                        <div>
                            <p className="text-muted" style={{ fontSize: 11 }}>
                                Non-cash benefits for FY <strong>{financialYear}</strong>, valued per Income Tax Rule 3 — feeds Form 12BA.
                            </p>
                            <table className="win-grid" style={{ marginBottom: 10 }}>
                                <thead><tr><th>Type</th><th>Description</th><th>Value</th><th>Recovered</th><th>Taxable</th><th style={{ width: 40 }}></th></tr></thead>
                                <tbody>
                                    {perquisites.map((p) => (
                                        <tr key={p.id}>
                                            <td>{p.perquisite_type}</td>
                                            <td>{p.description}</td>
                                            <td>₹{Number(p.value).toFixed(2)}</td>
                                            <td>₹{Number(p.amount_recovered || 0).toFixed(2)}</td>
                                            <td>₹{Math.max(0, Number(p.value) - Number(p.amount_recovered || 0)).toFixed(2)}</td>
                                            <td><button type="button" className="win-btn danger small" onClick={() => removePerquisite(p.id)}>✕</button></td>
                                        </tr>
                                    ))}
                                    {perquisites.length === 0 && <tr><td colSpan={6} className="text-muted">No perquisites recorded for this financial year.</td></tr>}
                                </tbody>
                            </table>
                            <div className="win-row" style={{ alignItems: 'flex-end' }}>
                                <div className="win-field stack">
                                    <label>Type</label>
                                    <select value={perqForm.perquisite_type} onChange={(e) => setPerqForm({ ...perqForm, perquisite_type: e.target.value })}>
                                        {PERQUISITE_TYPES.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="win-field stack" style={{ flex: 1, minWidth: 160 }}>
                                    <label>Description</label>
                                    <input value={perqForm.description} onChange={(e) => setPerqForm({ ...perqForm, description: e.target.value })} style={{ width: '100%' }} />
                                </div>
                                <div className="win-field stack">
                                    <label>Value (as per Rules)</label>
                                    <input type="number" step="0.01" min="0.01" value={perqForm.value} onChange={(e) => setPerqForm({ ...perqForm, value: e.target.value })} style={{ width: 110 }} />
                                </div>
                                <div className="win-field stack">
                                    <label>Amount Recovered</label>
                                    <input type="number" step="0.01" min="0" value={perqForm.amount_recovered} onChange={(e) => setPerqForm({ ...perqForm, amount_recovered: e.target.value })} style={{ width: 110 }} />
                                </div>
                                <button type="button" className="win-btn" onClick={addPerquisite} disabled={savingPerq || !perqForm.value}>
                                    {savingPerq ? 'Adding…' : 'Add'}
                                </button>
                            </div>
                            {perquisites.length > 0 && (
                                <button type="button" className="win-btn outline" style={{ marginTop: 10 }} onClick={() => openFile(`/perquisites/employee/${id}/form-12ba.pdf`, { params: { financialYear } })}>
                                    <i className="fas fa-file-pdf"></i> Download Form 12BA — FY {financialYear}
                                </button>
                            )}
                        </div>
                    )
                )}
            </div>

            <form onSubmit={handleSave}>
                <div className="win-btn-bar">
                    <button type="button" className="win-btn outline" onClick={() => navigate('/employees/new')}>New</button>
                    <button type="submit" className="win-btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    {!isNew && <button type="button" className="win-btn danger" onClick={handleDelete}>Delete</button>}
                    {!isNew && <button type="button" className="win-btn outline" onClick={() => navigate('/payroll/editor')}>Salary</button>}
                    <button type="button" className="win-btn outline" onClick={() => navigate('/employees')}>Close</button>
                </div>
            </form>
        </DialogWindow>
    );
}
