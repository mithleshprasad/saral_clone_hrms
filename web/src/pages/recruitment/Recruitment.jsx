import { Fragment, useEffect, useState, useCallback } from 'react';
import apiClient, { openFile } from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import DialogWindow from '../../components/layout/DialogWindow';
import FormModal from '../../components/layout/FormModal';

const CANDIDATE_STATUSES = ['Applied', 'Interview', 'Offer', 'Hired', 'Rejected'];
const EMPTY_JOB = { title: '', department_id: '' };
const EMPTY_CANDIDATE = { name: '', email: '', phone: '' };
const INTERVIEW_MODES = ['In-Person', 'Phone', 'Video'];
const RECOMMENDATIONS = ['Hire', 'No Hire', 'Hold'];
const LETTER_TYPES = ['Offer', 'Appointment'];
const EMPTY_INTERVIEW = { round: '', scheduled_at: '', interviewer_name: '', mode: 'In-Person' };

export default function Recruitment() {
    const { companyId } = useAppState();
    const [departments, setDepartments] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [showNewJob, setShowNewJob] = useState(false);
    const [showNewCandidate, setShowNewCandidate] = useState(false);
    const [jobForm, setJobForm] = useState(EMPTY_JOB);
    const [candidateForm, setCandidateForm] = useState(EMPTY_CANDIDATE);

    const [detailCandidate, setDetailCandidate] = useState(null);
    const [interviews, setInterviews] = useState([]);
    const [interviewForm, setInterviewForm] = useState(EMPTY_INTERVIEW);
    const [feedbackOpenId, setFeedbackOpenId] = useState(null);
    const [feedbackDraft, setFeedbackDraft] = useState({ rating: '', recommendation: '', feedback: '' });
    const [letterType, setLetterType] = useState('Offer');
    const [convertResult, setConvertResult] = useState(null);
    const [detailError, setDetailError] = useState('');
    const [converting, setConverting] = useState(false);

    useEffect(() => {
        apiClient.get('/departments', { params: { company_id: companyId || undefined } }).then((res) => setDepartments(res.data));
    }, [companyId]);

    const loadJobs = useCallback(async () => {
        const { data } = await apiClient.get('/jobs', { params: { company_id: companyId || undefined } });
        setJobs(data);
    }, [companyId]);

    useEffect(() => { loadJobs(); }, [loadJobs]);

    async function loadCandidates(job) {
        setSelectedJob(job);
        const { data } = await apiClient.get('/candidates', { params: { job_id: job.id } });
        setCandidates(data);
    }

    async function addJob(e) {
        e.preventDefault();
        if (!jobForm.title.trim()) return;
        // An unselected Department renders as '' — sent as-is, MySQL rejects '' against the
        // department_id foreign key (only NULL or a real id is valid), so this must become
        // undefined (omitted) rather than reach the API as an empty string.
        await apiClient.post('/jobs', { ...jobForm, department_id: jobForm.department_id || undefined, company_id: companyId || undefined });
        setJobForm(EMPTY_JOB);
        setShowNewJob(false);
        loadJobs();
    }

    async function closeJob(job) {
        await apiClient.put(`/jobs/${job.id}`, { status: job.status === 'Open' ? 'Closed' : 'Open' });
        loadJobs();
    }

    async function addCandidate(e) {
        e.preventDefault();
        if (!candidateForm.name.trim()) return;
        await apiClient.post('/candidates', { ...candidateForm, job_id: selectedJob.id });
        setCandidateForm(EMPTY_CANDIDATE);
        setShowNewCandidate(false);
        loadCandidates(selectedJob);
    }

    async function updateCandidateStatus(candidate, status) {
        await apiClient.put(`/candidates/${candidate.id}/status`, { status });
        loadCandidates(selectedJob);
    }

    const loadInterviews = useCallback(async (candidateId) => {
        const { data } = await apiClient.get('/interviews', { params: { candidateId } });
        setInterviews(data);
    }, []);

    function openDetail(candidate) {
        setDetailCandidate(candidate);
        setInterviewForm(EMPTY_INTERVIEW);
        setFeedbackOpenId(null);
        setConvertResult(null);
        setDetailError('');
        setLetterType('Offer');
        loadInterviews(candidate.id);
    }

    function closeDetail() {
        setDetailCandidate(null);
        if (convertResult) loadCandidates(selectedJob);
    }

    async function scheduleInterview(e) {
        e.preventDefault();
        setDetailError('');
        try {
            await apiClient.post('/interviews', { ...interviewForm, candidate_id: detailCandidate.id });
            setInterviewForm(EMPTY_INTERVIEW);
            loadInterviews(detailCandidate.id);
        } catch (err) {
            setDetailError(err.response?.data?.error || 'Failed to schedule interview');
        }
    }

    async function cancelInterview(interview) {
        await apiClient.put(`/interviews/${interview.id}/status`, { status: 'Cancelled' });
        loadInterviews(detailCandidate.id);
    }

    function openFeedback(interview) {
        setFeedbackOpenId(interview.id);
        setFeedbackDraft({ rating: interview.rating || '', recommendation: interview.recommendation || '', feedback: interview.feedback || '' });
    }

    async function saveFeedback(interview) {
        setDetailError('');
        try {
            await apiClient.put(`/interviews/${interview.id}/feedback`, feedbackDraft);
            setFeedbackOpenId(null);
            loadInterviews(detailCandidate.id);
        } catch (err) {
            setDetailError(err.response?.data?.error || 'Failed to save feedback');
        }
    }

    async function convertCandidate() {
        setDetailError('');
        setConverting(true);
        try {
            const { data } = await apiClient.post(`/candidates/${detailCandidate.id}/convert`, { letterType: letterType || undefined });
            setConvertResult(data);
            setDetailCandidate((c) => ({ ...c, status: 'Hired', converted_employee_id: data.employee.id }));
        } catch (err) {
            setDetailError(err.response?.data?.error || 'Failed to convert candidate');
        } finally {
            setConverting(false);
        }
    }

    const statusBar = <span>Open Positions: <span className="val">{jobs.filter((j) => j.status === 'Open').length}</span></span>;

    return (
        <DialogWindow title="Recruitment" icon="fa-briefcase" statusBar={statusBar}>
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
                <div className="groupbox">
                    <div className="groupbox-label">Open Positions</div>
                    <div className="win-btn-bar" style={{ marginBottom: 8 }}>
                        <button className="win-btn small" onClick={() => setShowNewJob(true)}><i className="fas fa-plus"></i> New Job</button>
                    </div>
                    {jobs.map((j) => (
                        <div key={j.id} onClick={() => loadCandidates(j)}
                            style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #ddd8c4', background: selectedJob?.id === j.id ? '#cfe4ff' : 'transparent' }}>
                            <div className="flex-gap" style={{ justifyContent: 'space-between' }}>
                                <strong>{j.title}</strong>
                                <span className={`win-badge ${j.status === 'Open' ? 'ok' : 'neutral'}`}>{j.status}</span>
                            </div>
                            <button className="win-btn outline small mt-16" onClick={(e) => { e.stopPropagation(); closeJob(j); }}>
                                {j.status === 'Open' ? 'Close Job' : 'Reopen'}
                            </button>
                        </div>
                    ))}
                    {jobs.length === 0 && <p className="text-muted">No open positions yet.</p>}
                </div>

                {selectedJob ? (
                    <div className="groupbox">
                        <div className="groupbox-label">Candidates — {selectedJob.title}</div>
                        <div className="win-btn-bar" style={{ marginBottom: 8 }}>
                            <button className="win-btn small" onClick={() => setShowNewCandidate(true)}><i className="fas fa-plus"></i> Add Candidate</button>
                        </div>
                        <table className="win-grid">
                            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th></th></tr></thead>
                            <tbody>
                                {candidates.map((c) => (
                                    <tr key={c.id}>
                                        <td>{c.name}</td>
                                        <td>{c.email}</td>
                                        <td>{c.phone}</td>
                                        <td>
                                            <select value={c.status || 'Applied'} onChange={(e) => updateCandidateStatus(c, e.target.value)}>
                                                {CANDIDATE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                                            </select>
                                            {c.converted_employee_id && <span className="win-badge ok" style={{ marginLeft: 6 }}>Employee</span>}
                                        </td>
                                        <td><button className="win-btn small outline" onClick={() => openDetail(c)}>Interviews / Hire</button></td>
                                    </tr>
                                ))}
                                {candidates.length === 0 && <tr><td colSpan={5} className="text-muted">No candidates yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="groupbox text-muted">Select a job to manage its candidate pipeline.</div>
                )}
            </div>

            {showNewJob && (
                <FormModal title="New Job" icon="fa-briefcase" onClose={() => setShowNewJob(false)} width={480}>
                    <form onSubmit={addJob}>
                        <div className="form-grid">
                            <div className="form-field"><label>Job Title</label><input value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} required /></div>
                            <div className="form-field">
                                <label>Department</label>
                                <select value={jobForm.department_id} onChange={(e) => setJobForm({ ...jobForm, department_id: e.target.value })}>
                                    <option value="">—</option>
                                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="win-btn-bar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                            <button type="button" className="win-btn outline" onClick={() => setShowNewJob(false)}>Cancel</button>
                            <button type="submit" className="win-btn">Add Job</button>
                        </div>
                    </form>
                </FormModal>
            )}

            {showNewCandidate && (
                <FormModal title={`New Candidate — ${selectedJob?.title}`} icon="fa-user-plus" onClose={() => setShowNewCandidate(false)} width={480}>
                    <form onSubmit={addCandidate}>
                        <div className="form-grid">
                            <div className="form-field"><label>Name</label><input value={candidateForm.name} onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })} required /></div>
                            <div className="form-field"><label>Email</label><input value={candidateForm.email} onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })} /></div>
                            <div className="form-field"><label>Phone</label><input value={candidateForm.phone} onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })} /></div>
                        </div>
                        <div className="win-btn-bar" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                            <button type="button" className="win-btn outline" onClick={() => setShowNewCandidate(false)}>Cancel</button>
                            <button type="submit" className="win-btn">Add Candidate</button>
                        </div>
                    </form>
                </FormModal>
            )}

            {detailCandidate && (
                <FormModal title={`${detailCandidate.name} — Interviews & Hiring`} icon="fa-user-clock" onClose={closeDetail} width={760}>
                    {detailError && <p style={{ color: 'var(--danger)' }}>{detailError}</p>}

                    <div className="groupbox">
                        <div className="groupbox-label">Convert to Employee</div>
                        {detailCandidate.converted_employee_id || convertResult ? (
                            <div>
                                <p style={{ color: 'var(--success)', margin: '0 0 8px' }}>
                                    <i className="fas fa-circle-check"></i> Converted to employee record{convertResult?.employee ? ` #${convertResult.employee.id}` : ` #${detailCandidate.converted_employee_id}`}.
                                </p>
                                {convertResult?.letter && (
                                    <button className="win-btn small" onClick={() => openFile(`/letters/${convertResult.letter.id}/download`)}>
                                        <i className="fas fa-file-pdf"></i> Download {convertResult.letter.type} Letter
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="win-row" style={{ alignItems: 'flex-end' }}>
                                <div className="win-field stack">
                                    <label>Generate Letter</label>
                                    <select value={letterType} onChange={(e) => setLetterType(e.target.value)}>
                                        <option value="">None — just convert</option>
                                        {LETTER_TYPES.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <button className="win-btn" onClick={convertCandidate} disabled={converting}>
                                    {converting ? 'Converting…' : 'Convert to Employee'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="groupbox">
                        <div className="groupbox-label">Interviews</div>
                        <table className="win-grid" style={{ marginBottom: 10 }}>
                            <thead><tr><th>Round</th><th>When</th><th>Interviewer</th><th>Mode</th><th>Status</th><th>Rating</th><th>Recommendation</th><th></th></tr></thead>
                            <tbody>
                                {interviews.map((iv) => (
                                    <Fragment key={iv.id}>
                                        <tr>
                                            <td>{iv.round}</td>
                                            <td>{new Date(iv.scheduled_at).toLocaleString('en-IN')}</td>
                                            <td>{iv.interviewer_name || '—'}</td>
                                            <td>{iv.mode}</td>
                                            <td><span className={`win-badge ${iv.status === 'Completed' ? 'ok' : iv.status === 'Cancelled' || iv.status === 'No-Show' ? 'bad' : 'warn'}`}>{iv.status}</span></td>
                                            <td>{iv.rating || '—'}</td>
                                            <td>{iv.recommendation || '—'}</td>
                                            <td>
                                                <div className="flex-gap">
                                                    <button className="win-btn small" onClick={() => openFeedback(iv)}>Feedback</button>
                                                    {iv.status === 'Scheduled' && <button className="win-btn danger small" onClick={() => cancelInterview(iv)}>Cancel</button>}
                                                </div>
                                            </td>
                                        </tr>
                                        {feedbackOpenId === iv.id && (
                                            <tr>
                                                <td colSpan={8}>
                                                    <div className="win-row" style={{ alignItems: 'flex-end' }}>
                                                        <div className="win-field stack">
                                                            <label>Rating (1-5)</label>
                                                            <select value={feedbackDraft.rating} onChange={(e) => setFeedbackDraft({ ...feedbackDraft, rating: e.target.value })}>
                                                                <option value="">—</option>
                                                                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="win-field stack">
                                                            <label>Recommendation</label>
                                                            <select value={feedbackDraft.recommendation} onChange={(e) => setFeedbackDraft({ ...feedbackDraft, recommendation: e.target.value })}>
                                                                <option value="">—</option>
                                                                {RECOMMENDATIONS.map((r) => <option key={r}>{r}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="win-field stack" style={{ flex: 1 }}>
                                                            <label>Feedback</label>
                                                            <input value={feedbackDraft.feedback} onChange={(e) => setFeedbackDraft({ ...feedbackDraft, feedback: e.target.value })} style={{ width: '100%' }} />
                                                        </div>
                                                        <button className="win-btn small" onClick={() => saveFeedback(iv)}>Save</button>
                                                        <button className="win-btn small outline" onClick={() => setFeedbackOpenId(null)}>Close</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                                {interviews.length === 0 && <tr><td colSpan={8} className="text-muted">No interviews scheduled yet.</td></tr>}
                            </tbody>
                        </table>

                        <form onSubmit={scheduleInterview} className="win-row" style={{ alignItems: 'flex-end' }}>
                            <div className="win-field stack"><label>Round</label><input value={interviewForm.round} onChange={(e) => setInterviewForm({ ...interviewForm, round: e.target.value })} placeholder="e.g. Technical" required style={{ width: 140 }} /></div>
                            <div className="win-field stack"><label>Date &amp; Time</label><input type="datetime-local" value={interviewForm.scheduled_at} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })} required /></div>
                            <div className="win-field stack"><label>Interviewer</label><input value={interviewForm.interviewer_name} onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_name: e.target.value })} style={{ width: 140 }} /></div>
                            <div className="win-field stack">
                                <label>Mode</label>
                                <select value={interviewForm.mode} onChange={(e) => setInterviewForm({ ...interviewForm, mode: e.target.value })}>
                                    {INTERVIEW_MODES.map((m) => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="win-btn">Schedule</button>
                        </form>
                    </div>
                </FormModal>
            )}
        </DialogWindow>
    );
}
