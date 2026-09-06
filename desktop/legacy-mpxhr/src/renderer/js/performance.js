import { escapeHtml } from './utils.js';

export async function loadPerformance() {
    const content = document.getElementById('content-area');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isEmployee = currentUser.role === 'employee';

    content.innerHTML = `
        <div class="header-actions">
            <h1>Performance Appraisal</h1>
            ${isEmployee ? '<button class="erp-btn" onclick="startSelfReview()">+ Start Self-Review</button>' : ''}
        </div>

        <div class="table-container fade-in">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Period</th>
                        <th>Status</th>
                        <th>Self Rating</th>
                        <th>Manager Rating</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="review-list"></tbody>
            </table>
        </div>
    `;

    // Load Reviews
    let cachedReviews = [];
    window.refreshReviews = async () => {
        try {
            const reviews = await window.electronAPI.getReviews({
                employeeId: currentUser.employeeId,
                role: currentUser.role
            });
            cachedReviews = reviews;
            document.getElementById('review-list').innerHTML = reviews.length ? reviews.map(r => `
                <tr>
                    <td>${r.first_name ? escapeHtml(r.first_name) + ' ' + escapeHtml(r.last_name) : 'Me'}</td>
                    <td>${escapeHtml(r.review_period)}</td>
                    <td><span class="status-badge ${getStatusClass(r.status)}">${escapeHtml(r.status)}</span></td>
                    <td>${renderStars(r.self_rating)}</td>
                    <td>${renderStars(r.manager_rating)}</td>
                    <td>${new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="icon-btn" onclick="viewReview(${r.id})" title="View Details">👁️</button>
                        ${!isEmployee && r.status === 'Submitted' ?
                    `<button class="btn-sm success" onclick="evaluateReview(${r.id})">Evaluate</button>` : ''}
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="7" style="text-align:center;">No reviews found.</td></tr>';
        } catch (e) {
            console.error(e);
            document.getElementById('review-list').innerHTML = '<tr><td colspan="7">Error loading reviews.</td></tr>';
        }
    };

    function getStatusClass(s) {
        if (s === 'Draft') return 'pending';
        if (s === 'Submitted') return 'warning';
        if (s === 'Reviewed') return 'success';
        return 'neutral';
    }

    function renderStars(rating) {
        if (!rating) return '-';
        return '⭐'.repeat(rating);
    }

    // --- Employee Actions ---
    window.startSelfReview = () => {
        const html = `
            <div id="modal-review" class="modal">
                <div class="modal-content glass-panel">
                    <div class="modal-header">
                        <h2>Self Performance Review</h2>
                        <span class="close-modal" onclick="document.getElementById('modal-review').remove()">&times;</span>
                    </div>
                    <form onsubmit="submitSelfReview(event)">
                        <div class="form-group">
                            <label>Review Period</label>
                            <select name="review_period" required>
                                <option value="2024-Q1">2024 - Q1 (Jan-Mar)</option>
                                <option value="2024-Q2">2024 - Q2 (Apr-Jun)</option>
                                <option value="2024-Annual">2024 - Annual</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Self Rating (1-5)</label>
                            <select name="self_rating" required>
                                <option value="5">5 - Outstanding</option>
                                <option value="4">4 - Exceeds Expectations</option>
                                <option value="3" selected>3 - Meets Expectations</option>
                                <option value="2">2 - Needs Improvement</option>
                                <option value="1">1 - Unsatisfactory</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Achievements & Comments</label>
                            <textarea name="self_comments" rows="5" placeholder="Highlight your key achievements..." required></textarea>
                        </div>
                        <button class="erp-btn" style="width:100%;">Submit Review</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    window.submitSelfReview = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        data.employee_id = currentUser.employeeId;
        try {
            await window.electronAPI.initiateReview(data);
            document.getElementById('modal-review').remove();
            window.showToast("Self-review submitted successfully!", 'success');
            refreshReviews();
        } catch (err) { alert(err.message); }
    };

    // --- Manager Actions ---
    window.evaluateReview = (id) => {
        const html = `
            <div id="modal-eval" class="modal">
                <div class="modal-content glass-panel">
                    <div class="modal-header">
                        <h2>Manager Evaluation</h2>
                        <span class="close-modal" onclick="document.getElementById('modal-eval').remove()">&times;</span>
                    </div>
                    <form onsubmit="submitManagerEval(event, ${id})">
                        <div class="form-group">
                            <label>Manager Rating</label>
                            <select name="manager_rating" required>
                                <option value="5">5 - Outstanding</option>
                                <option value="4">4 - Exceeds Expectations</option>
                                <option value="3" selected>3 - Meets Expectations</option>
                                <option value="2">2 - Needs Improvement</option>
                                <option value="1">1 - Unsatisfactory</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Feedback</label>
                            <textarea name="manager_comments" rows="5" placeholder="Provide constructive feedback..." required></textarea>
                        </div>
                        <button class="erp-btn" style="width:100%;">Finalize Review</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    window.submitManagerEval = async (e, id) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        data.id = id;
        try {
            await window.electronAPI.submitManagerReview(data);
            document.getElementById('modal-eval').remove();
            window.showToast("Review finalized!", 'success');
            refreshReviews();
        } catch (err) { alert(err.message); }
    };

    window.viewReview = async (id) => {
        const r = cachedReviews.find(x => x.id === id);
        if (!r) { window.showToast('Review not found.', 'error'); return; }

        const html = `
            <div id="modal-view-review" class="erp-modal-overlay active">
                <div class="erp-modal-window" style="width:520px;">
                    <div class="erp-modal-header">
                        <span>Performance Review — ${escapeHtml(r.review_period)}</span>
                        <span class="erp-modal-close" onclick="document.getElementById('modal-view-review').remove()">&times;</span>
                    </div>
                    <div class="erp-modal-body">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                            <div style="font-weight:600; font-size:15px;">${r.first_name ? escapeHtml(r.first_name) + ' ' + escapeHtml(r.last_name) : (currentUser.username || 'Me')}</div>
                            <span class="status-badge ${getStatusClass(r.status)}">${escapeHtml(r.status)}</span>
                        </div>

                        <div style="background:#f8fafc; border:1px solid #f1f5f9; border-radius:8px; padding:14px; margin-bottom:12px;">
                            <div style="font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">
                                Self Rating &nbsp; ${renderStars(r.self_rating)}
                            </div>
                            <div style="font-size:13.5px; color:#334155; white-space:pre-wrap;">${r.self_comments ? escapeHtml(r.self_comments) : '<span style="color:#94a3b8;">No comments submitted.</span>'}</div>
                        </div>

                        <div style="background:#f8fafc; border:1px solid #f1f5f9; border-radius:8px; padding:14px;">
                            <div style="font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">
                                Manager Rating &nbsp; ${renderStars(r.manager_rating)}
                            </div>
                            <div style="font-size:13.5px; color:#334155; white-space:pre-wrap;">${r.manager_comments ? escapeHtml(r.manager_comments) : '<span style="color:#94a3b8;">Not yet evaluated.</span>'}</div>
                        </div>
                    </div>
                    <div class="erp-modal-footer">
                        <button class="erp-btn erp-btn-primary" onclick="document.getElementById('modal-view-review').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    refreshReviews();
}
