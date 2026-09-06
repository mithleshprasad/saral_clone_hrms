// Imports
import { loadEmployees } from './employees.js';
import { loadCompanies } from './companies.js';
import { loadDepartments } from './departments.js';
import { loadSettings } from './settings.js';
import { loadAttendance } from './attendance.js';
import { loadDailyAttendance } from './attendance_daily.js';
import { loadPayroll } from './payroll.js';
import { loadReports } from './reports.js';
import { loadDashboard } from './dashboard.js';
import { loadAnalytics } from './analytics.js';
import { loadRecruitment } from './recruitment.js';
import { loadHelpdesk } from './helpdesk.js';
import { loadShifts } from './shifts.js';
import { loadPerformance } from './performance.js';
import { loadDesignations } from './designations.js';
import { loadBranches } from './branches.js';
import { loadSalaryHeads } from './salary_heads.js';
import { loadCategories } from './categories.js';
import { loadLoans } from './loans.js';
import { loadUserDeductions } from './userDeductions.js';
import { loadLeave } from './leave.js';
import { loadPayslips } from './payslips.js';
import { loadLetters } from './letters.js';
import { initRibbon, setActiveRibbonButton } from './ribbon.js';
import { initGateway } from './gateway.js';
import { initShortcuts } from './shortcuts.js';
import { initToastSystem } from './toast.js';

initToastSystem();

window.initApp = async () => {
    // Start with Gateway
    await initGateway();
    // Ribbon and Page Load will happen AFTER Gateway selection
};

// Init on load
document.addEventListener('DOMContentLoaded', window.initApp);

// Global Loader Controls
window.showLoader = () => {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'flex';
};

window.hideLoader = () => {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'none';
};

// Global Logout Logic
window.logoutApp = async () => {
    if (confirm("Are you sure you want to logout?")) {
        // Optional: Perform Auto-Backup on Logout if configured?
        // For now, simple redirect
        try { await window.electronAPI.logout(); } catch (e) { }
        localStorage.removeItem('currentUser');

        // Check for Auto-Backup setting from renderer side (if needed)
        // const settings = await window.electronAPI.getSettings();
        // if (settings.find(s => s.key === 'auto_backup_enabled')?.value === 'true') {
        //    await window.electronAPI.invoke('perform-auto-backup'); // If exposed
        // }

        window.location.href = 'login.html';
    }
};

// Tracks page visits for the Dashboard's "Recently Viewed Pages" panel
const PAGE_LABELS = {
    employees: 'Employees', departments: 'Departments', designations: 'Designations',
    branches: 'Branches', 'salary-heads': 'Salary Heads', categories: 'Categories',
    loans: 'Loan Setup', 'user-deductions': 'User Deductions', companies: 'Companies',
    settings: 'Settings', attendance: 'Attendance', 'attendance-daily': 'Daily Attendance',
    'attendance-monthly': 'Monthly Attendance', leaves: 'Leave Application', payroll: 'Payroll / Net Pay',
    payslips: 'Payslips', reports: 'Reports', letters: 'Letters', analytics: 'Analytics'
};

function recordRecentPage(pageName) {
    try {
        const label = PAGE_LABELS[pageName] || pageName;
        let history = JSON.parse(localStorage.getItem('recentPages') || '[]');
        history = history.filter(h => h.page !== pageName);
        history.unshift({ page: pageName, label, at: new Date().toISOString() });
        localStorage.setItem('recentPages', JSON.stringify(history.slice(0, 15)));
    } catch (e) { /* non-critical */ }
}

// Define Global Page Loader
window.loadPage = async function (pageName) {
    console.log("Navigating to:", pageName);
    window.currentPage = pageName;
    if (pageName !== 'dashboard') recordRecentPage(pageName);

    // Show Loader
    window.showLoader();
    const minTime = new Promise(r => setTimeout(r, 1000)); // 1s minimum delay

    const pageTitle = document.getElementById('page-title');
    const contentArea = document.getElementById('content-area');

    // Update Title
    if (pageTitle) pageTitle.textContent = pageName.charAt(0).toUpperCase() + pageName.slice(1);

    // Update Ribbon Active State
    setActiveRibbonButton(pageName);

    try {
        switch (pageName) {
            case 'dashboard': await loadDashboard(); break;
            case 'employees': await loadEmployees(); break;
            case 'companies': await loadCompanies(); break;
            case 'departments': await loadDepartments(); break;
            case 'designations': await loadDesignations(); break;
            case 'branches': await loadBranches(); break;
            case 'salary-heads': await loadSalaryHeads(); break;
            case 'shifts': await loadShifts(); break;
            case 'categories': await loadCategories(); break;
            case 'loans': await loadLoans(); break;
            case 'user-deductions': await loadUserDeductions(); break;
            case 'settings': await loadSettings(); break;
            case 'attendance': await loadAttendance(); break;
            case 'attendance-daily': await loadDailyAttendance(); break;
            case 'attendance-monthly': await loadAttendance('monthly'); break;
            case 'leaves': await loadLeave(); break;
            case 'payroll': await loadPayroll(); break;
            case 'payslips': await loadPayslips(); break;
            case 'reports': await loadReports(); break;
            case 'letters': await loadLetters(); break;
            case 'analytics': await loadAnalytics(); break;
            default:
                contentArea.innerHTML = `<div style="padding:20px;"><h2>${pageName}</h2><p>Module under construction.</p></div>`;
        }
    } catch (e) {
        console.error("Load Page Error:", e);
        contentArea.innerHTML = `<div style="padding:20px; color:red;"><h2>Error Loading ${pageName}</h2><p>${e.message}</p></div>`;
    } finally {
        // Reset scroll position — content-area's scrollTop otherwise carries over
        // from whatever page was open before, so a new page can render pre-scrolled.
        if (contentArea) contentArea.scrollTop = 0;
        // Wait for minimum time then hide
        await minTime;
        window.hideLoader();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // Load Dashboard Style dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/dashboard.css';
    document.head.appendChild(link);

    const sharedLink = document.createElement('link');
    sharedLink.rel = 'stylesheet';
    sharedLink.href = 'css/shared.css';
    document.head.appendChild(sharedLink);

    // --- RBAC Session Check ---
    // localStorage alone isn't trustworthy: the main process session resets on every
    // app restart, so require a live main-process session, not just a stale local flag.
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const liveSession = currentUser ? await window.electronAPI.getSession() : null;
    if (!currentUser || !liveSession) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        return;
    }

    document.querySelector('.user-profile').insertAdjacentHTML('afterbegin', `<span id="net-status" title="Online" style="margin-right:10px; color:#10b981;">●</span>`);

    function updateOnlineStatus() {
        const el = document.getElementById('net-status');
        if (navigator.onLine) {
            el.style.color = '#10b981';
            el.title = "Online";
        } else {
            el.style.color = '#ef4444';
            el.title = "Offline Mode";
        }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // --- Dynamic Branding ---
    try {
        const settings = await window.electronAPI.getSettings();
        const start = settings.find(s => s.key === 'company_name');
        const logo = settings.find(s => s.key === 'company_logo');

        if (start && start.value) {
            const logoTextEl = document.querySelector('.logo-text');
            if (logoTextEl) {
                logoTextEl.textContent = start.value;
                document.title = start.value + " - HRMS";
            }

            const iconDiv = document.querySelector('.logo-icon');
            if (iconDiv) {
                if (logo && logo.value && logo.value.startsWith('data:image')) {
                    iconDiv.style.background = 'transparent';
                    iconDiv.style.boxShadow = 'none';
                    iconDiv.innerHTML = `<img src="${logo.value}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;">`;
                } else {
                    const initials = start.value.substring(0, 2).toUpperCase();
                    iconDiv.textContent = initials;
                    iconDiv.style.background = '';
                }
            }

            // Also Update Global Loader Branding
            const loaderAppName = document.getElementById('loader-app-name');
            const loaderLogoContainer = document.getElementById('loader-logo-container');
            if (loaderAppName) loaderAppName.textContent = start.value;
            if (loaderLogoContainer && logo && logo.value && logo.value.startsWith('data:image')) {
                loaderLogoContainer.innerHTML = `<img src="${logo.value}" class="loader-logo-img">`;
            }
        }
    } catch (e) { console.error("Branding Error", e); }

    // Apply SaralPayPack-like theme by default (can be made optional later)
    try { document.body.classList.add('saral-theme'); } catch (e) { /* ignore */ }

    // --- Advanced Theme Engine ---
    // --- Advanced Theme Engine (Legacy - Disabled for New UI) ---
    // window.applyTheme = async () => { ... } 
    // Logic removed to prevent legacy sidebar/patterns from appearing.
    try {
        document.body.classList.remove('pattern-dots', 'pattern-grid', 'sidebar-light', 'sidebar-brand');
        // also ensure main-content is full width
    } catch (e) { }

    const { role, username } = currentUser;
    // document.querySelector('.user-profile span').textContent = `${username} (${role})`;

    // Initialize Ribbon
    initRibbon();

    // Initialize Shortcuts
    initShortcuts();

    // Hide Ribbon Items for Employees
    if (role === 'employee') {
        const allowedPages = ['attendance', 'leave', 'payroll', 'dashboard'];
        const buttons = document.querySelectorAll('.ribbon-btn');
        buttons.forEach(btn => {
            // ID format: ribbon-btn-pageName
            if (btn.id && btn.id.startsWith('ribbon-btn-')) {
                const page = btn.id.replace('ribbon-btn-', '');
                if (!allowedPages.includes(page)) {
                    btn.style.display = 'none';
                    // Also hide parent group if empty? Too complex for now.
                }
            }
        });

        // Hide entire tabs if necessary (simplification: hide Admin/System tabs)
        // For example, System, Organization tabs should be hidden
        const restrictedTabs = ['org-panel', 'system-panel', 'reports-panel']; // IDs of panels
        document.querySelectorAll('.ribbon-tab').forEach(tab => {
            const target = tab.getAttribute('data-target');
            if (restrictedTabs.includes(target)) {
                tab.style.display = 'none';
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) window.location.href = 'login.html';
        });
    }

    // --- Toast Notification System ---
    const toastStyle = document.createElement('style');
    toastStyle.textContent = `
        .toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .toast {
            min-width: 250px;
            padding: 12px 20px;
            background: white;
            color: #333;
            border-left: 5px solid #2ecc71;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            border-radius: 4px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            font-family: 'Segoe UI', sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .toast.show { opacity: 1; transform: translateX(0); }
        .toast.error { border-left-color: #e74c3c; }
        .toast.info { border-left-color: #3498db; }
    `;
    document.head.appendChild(toastStyle);

    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);

    window.showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span> <span style="cursor:pointer; margin-left:10px;" onclick="this.parentElement.remove()">×</span>`;
        toastContainer.appendChild(toast);

        // Trigger reflow
        void toast.offsetWidth;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Override alert for better UX (optional, but safe for this context)
    window.alert = (msg) => window.showToast(msg, 'info');

    // Global Error Handlers for debugging
    window.addEventListener('unhandledrejection', event => {
        console.error("Unhandled Rejection:", event.reason);
        window.showToast("System Error: " + (event.reason ? event.reason.message : 'Unknown'), 'error');
    });

    window.onerror = function (message, source, lineno, colno, error) {
        console.error("Global Error:", message, error);
        window.showToast("App Error: " + message, 'error');
    };

    // Default load handled by initApp via Gateway
    // window.loadPage('dashboard'); 
});
