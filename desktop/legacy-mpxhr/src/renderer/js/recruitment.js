import { escapeHtml } from './utils.js';

export async function loadRecruitment() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="header-actions">
            <h1>Recruitment & Onboarding</h1>
            <div id="recruit-actions">
                <button class="erp-btn" onclick="addJobModal()">+ Post Job</button>
                <button class="btn-secondary" onclick="addCandidateModal()">+ Add Candidate</button>
            </div>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchRecTab('jobs')">Job Postings</button>
            <button class="tab-btn" onclick="switchRecTab('candidates')">Candidates</button>
            <button class="tab-btn" onclick="switchRecTab('onboarding')">Onboarding</button>
        </div>

        <div id="tab-jobs" class="tab-content fade-in">
            <table class="data-table">
                <thead><tr><th>Title</th><th>Dept</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody id="job-list"></tbody>
            </table>
        </div>

        <div id="tab-candidates" class="tab-content hidden fade-in">
             <div class="kanban-board" id="candidate-board" style="display:flex; gap:15px; overflow-x:auto; padding-bottom:10px;">
                <!-- Cols generated dynamically -->
             </div>
        </div>

        <div id="tab-onboarding" class="tab-content hidden fade-in">
             <div class="form-row">
                <div class="form-group" style="width:300px;">
                    <label>Select New Hire</label>
                    <select id="onboard-emp-select" onchange="loadOnboardingTasks(this.value)"></select>
                </div>
             </div>
             <div class="card">
                <h3>Checklist</h3>
                <div style="margin-bottom:10px;">
                    <input type="text" id="new-task-input" placeholder="New Task (e.g. Assign Laptop)" style="width:70%;">
                    <button class="erp-btn" onclick="addOnboardTask()">Add</button>
                </div>
                <ul id="onboard-list" class="checklist"></ul>
             </div>
        </div>
    `;

    // Global Tab Switcher
    window.switchRecTab = (tabName) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
        document.querySelectorAll('.tabs .tab-btn').forEach(el => el.classList.remove('active'));
        event.target.classList.add('active');
    };

    refreshJobs();
    refreshCandidates();
    loadOnboardEmployees();

    // Modals
    window.addJobModal = async () => {
        const depts = await window.electronAPI.getDepartments();
        const html = `
            <div id="modal-job" class="modal"><div class="modal-content">
            <h3>Post New Job</h3><span class="close-modal" onclick="document.getElementById('modal-job').remove()">&times;</span>
            <form onsubmit="submitJob(event)">
                <input type="text" name="title" placeholder="Job Title" required>
                <select name="department_id" required>${depts.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')}</select>
                <textarea name="description" placeholder="Job Description"></textarea>
                <button class="erp-btn" style="margin-top:10px;">Post Job</button>
            </form></div></div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    window.submitJob = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        await window.electronAPI.addJob(data);
        document.getElementById('modal-job').remove();
        refreshJobs();
    };

    window.toggleJobStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
        await window.electronAPI.updateJobStatus({ id, status: newStatus });
        refreshJobs();
    };

    window.deleteJob = async (id) => {
        if (confirm("Delete Job?")) { await window.electronAPI.deleteJob(id); refreshJobs(); }
    };

    window.addCandidateModal = async () => {
        const jobs = await window.electronAPI.getJobs();
        const openJobs = jobs.filter(j => j.status = 'Open');
        const html = `
            <div id="modal-cand" class="modal"><div class="modal-content">
            <h3>Add Candidate</h3><span class="close-modal" onclick="document.getElementById('modal-cand').remove()">&times;</span>
            <form onsubmit="submitCandidate(event)">
                <select name="job_id" required>${openJobs.map(j => `<option value="${j.id}">${escapeHtml(j.title)}</option>`).join('')}</select>
                <input type="text" name="name" placeholder="Full Name" required>
                <input type="email" name="email" placeholder="Email">
                <input type="text" name="phone" placeholder="Phone">
                <textarea name="notes" placeholder="Notes (Skills, etc)"></textarea>
                <button class="erp-btn" style="margin-top:10px;">Add Candidate</button>
            </form></div></div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    window.submitCandidate = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        data.resume_path = ''; // Placeholder
        await window.electronAPI.addCandidate(data);
        document.getElementById('modal-cand').remove();
        refreshCandidates();
    };
}

async function refreshJobs() {
    const jobs = await window.electronAPI.getJobs();
    document.getElementById('job-list').innerHTML = jobs.map(j => `
        <tr>
            <td>${escapeHtml(j.title)}</td>
            <td>${escapeHtml(j.department_name)}</td>
            <td>${new Date(j.created_at).toLocaleDateString()}</td>
            <td><span class="status-badge ${j.status.toLowerCase()}">${escapeHtml(j.status)}</span></td>
            <td>
                <button onclick="toggleJobStatus(${j.id}, '${j.status}')" class="btn-sm">${j.status === 'Open' ? 'Close' : 'Reopen'}</button>
                <button onclick="deleteJob(${j.id})" style="color:red;">🗑</button>
            </td>
        </tr>
    `).join('');
}

async function refreshCandidates() {
    const candidates = await window.electronAPI.getCandidates();
    const stages = ['Applied', 'Interview', 'Offer', 'Hired', 'Rejected'];
    const board = document.getElementById('candidate-board');

    board.innerHTML = stages.map(stage => {
        const cands = candidates.filter(c => c.status === stage);
        return `
            <div class="kanban-col" style="min-width:250px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                <h4 style="border-bottom:2px solid var(--primary); padding-bottom:5px;">${stage} (${cands.length})</h4>
                <div style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
                    ${cands.map(c => `
                        <div class="card" style="padding:10px; margin:0; cursor:grab;">
                            <b>${escapeHtml(c.name)}</b><br>
                            <small>${escapeHtml(c.job_title)}</small>
                            <div style="margin-top:5px; font-size:0.8rem;">
                                ${stage !== 'Applied' ? `<button onclick="moveCand(${c.id}, '${prevStage(stage)}')">⬅️</button>` : ''}
                                ${stage !== 'Rejected' && stage !== 'Hired' ? `<button onclick="moveCand(${c.id}, '${nextStage(stage)}')">➡️</button>` : ''}
                                ${stage === 'Interview' ? `<br><button onclick="moveCand(${c.id}, 'Rejected')" style="color:red">Reject</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function nextStage(s) {
    const map = { 'Applied': 'Interview', 'Interview': 'Offer', 'Offer': 'Hired' };
    return map[s];
}
function prevStage(s) {
    const map = { 'Interview': 'Applied', 'Offer': 'Interview', 'Hired': 'Offer', 'Rejected': 'Interview' }; // Rough back logic
    return map[s];
}

window.moveCand = async (id, status) => {
    await window.electronAPI.updateCandidateStatus({ id, status });
    refreshCandidates();
};

// Onboarding
async function loadOnboardEmployees() {
    let emps = [];
    try {
        const res = await window.electronAPI.getEmployees({ limit: 1000 });
        if (res && Array.isArray(res.employees)) {
            emps = res.employees;
        } else if (Array.isArray(res)) {
            // Fallback if API changed
            emps = res;
        } else if (res && Array.isArray(res.data)) {
            // Fallback for data prop
            emps = res.data;
        }
    } catch (e) { console.error("Failed to load employees for onboarding", e); }

    // recently joined or all
    document.getElementById('onboard-emp-select').innerHTML = '<option value="">Select Employee</option>' + emps.map(e => `<option value="${e.id}">${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)}</option>`).join('');
}

window.loadOnboardingTasks = async (empId) => {
    if (!empId) { document.getElementById('onboard-list').innerHTML = ''; return; }
    const tasks = await window.electronAPI.getOnboardingTasks(empId);

    document.getElementById('onboard-list').innerHTML = tasks.length ? tasks.map(t => `
        <li style="display:flex; align-items:center; gap:10px; padding:5px;">
            <input type="checkbox" ${t.is_completed ? 'checked' : ''} onchange="toggleObTask(${t.id}, this.checked)">
            <span style="${t.is_completed ? 'text-decoration:line-through; opacity:0.6' : ''}">${escapeHtml(t.task)}</span>
        </li>
    `).join('') : '<li>No tasks assigned.</li>';
}

window.addOnboardTask = async () => {
    const empId = document.getElementById('onboard-emp-select').value;
    const task = document.getElementById('new-task-input').value;
    if (!empId || !task) return;
    await window.electronAPI.addOnboardingTask({ employee_id: empId, task });
    document.getElementById('new-task-input').value = '';
    loadOnboardingTasks(empId);
}

window.toggleObTask = async (id, val) => {
    await window.electronAPI.toggleOnboardingTask({ id, val });
    // Visual update done by CSS mostly or reload
    const empId = document.getElementById('onboard-emp-select').value;
    loadOnboardingTasks(empId);
}
