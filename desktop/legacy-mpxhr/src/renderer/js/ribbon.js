import { escapeHtml } from './utils.js';

export async function initRibbon() {
    // 0. Module Visibility Logic
    try {
        const settings = await window.electronAPI.getSettings();
        const tabs = document.querySelectorAll('.ribbon-tab');

        // Find first visible tab to activate
        let firstVisibleTab = null;

        tabs.forEach(tab => {
            const tabName = tab.dataset.tab;
            const setting = settings.find(s => s.key === `module_${tabName}`);

            if (setting && setting.value === 'false') {
                tab.style.display = 'none';
            } else {
                tab.style.display = 'block';
                if (!firstVisibleTab) firstVisibleTab = tab;
            }
        });

        // Ensure an active tab exists if the current one is hidden
        const activeTab = document.querySelector('.ribbon-tab.active');
        if (activeTab && activeTab.style.display === 'none' && firstVisibleTab) {
            activeTab.classList.remove('active');
            firstVisibleTab.classList.add('active');
        } else if (!activeTab && firstVisibleTab) {
            firstVisibleTab.classList.add('active');
        }

    } catch (e) {
        console.error("Ribbon Visibility Error:", e);
    }

    // 1. Tab Switching Logic
    const tabs = document.querySelectorAll('.ribbon-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            // Activate clicked
            tab.classList.add('active');
            // Load Content
            const tabName = tab.dataset.tab;
            loadRibbonToolbar(tabName);

            // Default Selection
            if (tabName === 'dashboard') loadPage('dashboard');
            else if (tabName === 'masters') loadPage('employees');
            else if (tabName === 'attendance') loadPage('attendance-monthly');
            else if (tabName === 'payroll') loadPage('payroll');
            else if (tabName === 'reports') loadPage('reports');
            else if (tabName === 'documents') loadPage('letters');
        });
    });

    // 2. Initial Load
    // Force refresh the active tab to load its toolbar
    const currentActive = document.querySelector('.ribbon-tab.active');
    if (currentActive) {
        loadRibbonToolbar(currentActive.dataset.tab);
    }
    loadContextDropdowns();
}

const ribbonConfig = {
    'dashboard': [
        { label: 'Overview', icon: 'fa-gauge-high', action: 'loadPage("dashboard")' },
        { label: 'Analytics', icon: 'fa-chart-line', action: 'loadPage("analytics")' }
    ],
    'masters': [
        { label: 'Employees', icon: 'fa-users', action: 'loadPage("employees")' },
        { label: 'Departments', icon: 'fa-building', action: 'loadPage("departments")' },
        { label: 'Designations', icon: 'fa-id-badge', action: 'loadPage("designations")' },
        { label: 'Branches', icon: 'fa-code-branch', action: 'loadPage("branches")' },
        { label: 'Salary Heads', icon: 'fa-money-check-alt', action: 'loadPage("salary-heads")' },
        { label: 'Categories', icon: 'fa-layer-group', action: 'loadPage("categories")' },
        { label: 'Loan Setup', icon: 'fa-hand-holding-dollar', action: 'loadPage("loans")' },
        { label: 'User Deductions', icon: 'fa-minus-circle', action: 'loadPage("user-deductions")' },
        { label: 'Companies', icon: 'fa-landmark', action: 'loadPage("companies")' },
        { label: 'Data Security', icon: 'fa-shield-alt', action: 'document.getElementById("security-guide-modal").classList.add("active")' },
        { label: 'Settings', icon: 'fa-cogs', action: 'loadPage("settings")' }
    ],
    'attendance': [
        { label: 'Daily Attn.', icon: 'fa-calendar-day', action: 'loadPage("attendance-daily")' },
        { label: 'Monthly Attn.', icon: 'fa-calendar-alt', action: 'loadPage("attendance-monthly")' },
        { label: 'Leave App.', icon: 'fa-paper-plane', action: 'loadPage("leaves")' },
        { label: 'Shifts', icon: 'fa-clock', action: 'loadPage("shifts")' }
    ],
    'payroll': [
        { label: 'Net Pay', icon: 'fa-file-invoice-dollar', action: 'loadPage("payroll")' },
        { label: 'Payslips', icon: 'fa-print', action: 'loadPage("payslips")' },
        { label: 'Loan Setup', icon: 'fa-hand-holding-dollar', action: 'loadPage("loans")' }
    ],
    'reports': [
        { label: 'All Reports', icon: 'fa-chart-pie', action: 'loadPage("reports")' }
    ],
    'documents': [
        { label: 'Letters', icon: 'fa-envelope-open-text', action: 'loadPage("letters")' }
    ]
};

function loadRibbonToolbar(tabName) {
    const toolbar = document.getElementById('ribbon-toolbar-content');
    const items = ribbonConfig[tabName] || [];

    toolbar.innerHTML = items.map(item => {
        const iconStyle = item.label === 'Data Security' ? 'style="color: #4f46e5 !important;"' : '';
        return `
            <button class="ribbon-btn" onclick='${item.action}'>
                <i class="fas ${item.icon}" ${iconStyle}></i>
                <span>${item.label}</span>
            </button>
        `;
    }).join('');
}

// Global Context Logic
export async function loadContextDropdowns() {
    try {
        const companies = await window.electronAPI.getCompanies();

        const yearSelect = document.getElementById('ctx-year');
        const monthSelect = document.getElementById('ctx-month');
        const companySelect = document.getElementById('ctx-company');

        // Reload on Year/Month Change
        const reloadData = () => {
            if (window.currentPage && window.loadPage) window.loadPage(window.currentPage);
        };
        if (yearSelect) {
            yearSelect.addEventListener('change', reloadData);

            // AUTO-SELECT CURRENT FY
            const today = new Date();
            const cm = today.getMonth() + 1; // 1-12
            const cy = today.getFullYear();
            let fy = "";
            if (cm >= 4) {
                fy = `${cy}-${cy + 1}`;
            } else {
                fy = `${cy - 1}-${cy}`;
            }
            // Check if option exists, if not, add it or select nearest
            // Assuming options are like "2025-2026", "2024-2025"
            // For now, try to set value directly if it matches
            const opt = Array.from(yearSelect.options).find(o => o.value === fy);
            if (opt) {
                yearSelect.value = fy;
            }
        }
        if (monthSelect) {
            monthSelect.addEventListener('change', reloadData);

            // AUTO-SELECT CURRENT MONTH
            const today = new Date();
            const cm = today.getMonth() + 1;
            monthSelect.value = cm.toString();
        }

        // Populate Companies
        if (companies.length === 0) {
            companySelect.innerHTML = '<option value="">No Companies Found</option>';
        } else {
            companySelect.innerHTML = companies.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
        }

        // Trigger Change on Init to set global state
        companySelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            window.state = window.state || {};
            window.state.companyId = e.target.value;
            window.state.companyName = selectedOption.text;
            
            // Reload Current Page to apply context
            if (window.loadPage) window.loadPage(window.currentPage || 'employees');
        });

        // Set initial state (Respect Gateway Selection)
        if (companies.length > 0) {
            // Check if we already have a selection from Gateway
            const preSelected = window.state?.companyId;
            if (preSelected && companies.find(c => c.id == preSelected)) {
                companySelect.value = preSelected;
            } else {
                // Fallback to first if nothing selected
                window.state = window.state || {};
                window.state.companyId = companies[0].id;
                companySelect.value = companies[0].id;
            }

            // LOCK SELECTION
            companySelect.disabled = true;
            companySelect.title = "Company locked from Gateway. Restart to change.";
            companySelect.style.background = "#eef2ff";
            companySelect.style.color = "#312e81";
            companySelect.style.fontWeight = "bold";
            companySelect.style.border = "1px solid #6366f1";
        }

    } catch (e) { console.error("Ctx Load Error", e); }
}

export function setActiveRibbonButton(pageName) {
    // Optional: Highlight the active button in the toolbar
    const btns = document.querySelectorAll('.ribbon-btn');
    btns.forEach(b => b.classList.remove('active-btn'));

    // Attempt to find button by ID match or similar
    // We didn't set IDs strictly for all, but let's try
    // Just a placeholder for now to prevent crash
}
