import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import FormModal from '../../components/layout/FormModal';

const EMPTY_FORM = { employee_id: '', review_period: '' };

export default function PerformanceReviews() {
    const { companyId } = useAppState();
    const [employees, setEmployees] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [showInitiate, setShowInitiate] = useState(false);
    const [initiateForm, setInitiateForm] = useState(EMPTY_FORM);
    const [managerForm, setManagerForm] = useState({});

    useEffect(() => {
        apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } }).then((res) => setEmployees(res.data.employees));
    }, [companyId]);

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/performance-reviews', { params: { company_id: companyId || undefined } });
        setReviews(data);
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    async function initiate(e) {
        e.preventDefault();
        if (!initiateForm.employee_id || !initiateForm.review_period) return;
        await apiClient.post('/performance-reviews', initiateForm);
        setInitiateForm(EMPTY_FORM);
        setShowInitiate(false);
        load();
    }

    async function submitManagerReview(review) {
        const f = managerForm[review.id] || {};
        await apiClient.put(`/performance-reviews/${review.id}/manager-review`, {
            manager_rating: f.manager_rating || review.manager_rating,
            manager_comments: f.manager_comments ?? review.manager_comments,
        });
        load();
    }

    const statusBar = <span>Total Reviews: <span className="val">{reviews.length}</span></span>;

    return (
        <DialogWindow title="Performance Reviews" icon="fa-star-half-alt" statusBar={statusBar}>
            <div className="win-btn-bar" style={{ marginBottom: 8 }}>
                <button className="win-btn" onClick={() => setShowInitiate(true)}><i className="fas fa-plus"></i> Initiate Review</button>
            </div>

            {reviews.map((r) => (
                <div className="groupbox" key={r.id}>
                    <div className="flex-gap" style={{ justifyContent: 'space-between' }}>
                        <strong>{r.first_name} {r.last_name} — {r.review_period}</strong>
                        <span className={`win-badge ${r.status === 'Reviewed' ? 'ok' : 'warn'}`}>{r.status}</span>
                    </div>
                    <div className="win-row mt-16">
                        <div><span className="text-muted">Self Rating:</span> {r.self_rating ?? '—'} / 5</div>
                        <div><span className="text-muted">Self Comments:</span> {r.self_comments || '—'}</div>
                    </div>
                    <div className="win-row mt-16">
                        <div className="win-field stack">
                            <label>Manager Rating (1-5)</label>
                            <input type="number" min="1" max="5" defaultValue={r.manager_rating || ''}
                                onChange={(e) => setManagerForm({ ...managerForm, [r.id]: { ...managerForm[r.id], manager_rating: e.target.value } })} style={{ width: 70 }} />
                        </div>
                        <div className="win-field stack" style={{ flex: 1 }}>
                            <label>Manager Comments</label>
                            <input defaultValue={r.manager_comments || ''}
                                onChange={(e) => setManagerForm({ ...managerForm, [r.id]: { ...managerForm[r.id], manager_comments: e.target.value } })} style={{ width: '100%' }} />
                        </div>
                    </div>
                    <button className="win-btn outline small mt-16" onClick={() => submitManagerReview(r)}>Submit Manager Review</button>
                </div>
            ))}
            {reviews.length === 0 && <p className="text-muted">No reviews yet.</p>}

            {showInitiate && (
                <FormModal title="Initiate Review" icon="fa-star-half-alt" onClose={() => setShowInitiate(false)} width={480}>
                    <form onSubmit={initiate}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Employee</label>
                                <select value={initiateForm.employee_id} onChange={(e) => setInitiateForm({ ...initiateForm, employee_id: e.target.value })} required>
                                    <option value="">—</option>
                                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
                                </select>
                            </div>
                            <div className="form-field"><label>Review Period</label><input placeholder="e.g. 2026-Q1" value={initiateForm.review_period} onChange={(e) => setInitiateForm({ ...initiateForm, review_period: e.target.value })} required /></div>
                        </div>
                        <div className="win-btn-bar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                            <button type="button" className="win-btn outline" onClick={() => setShowInitiate(false)}>Cancel</button>
                            <button type="submit" className="win-btn">Initiate</button>
                        </div>
                    </form>
                </FormModal>
            )}
        </DialogWindow>
    );
}
