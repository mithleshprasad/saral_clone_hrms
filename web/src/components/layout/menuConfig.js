// Mirrors the real SaralPayPack menu bar structure: File | Initial Settings | Master |
// Attendance | Pre Salary Transactions | Salary Transactions | Import/Export | Report |
// Tools | Utility | Registration | Help — each item routes into the same pages/logic
// already built; only the navigation chrome changes.

// `mnemonic` is the Alt-key access character for each top-level menu (Alt+F opens File,
// etc.) — must be unique across this list. MenuBar underlines the first occurrence of that
// letter in the label (case-insensitive), so pick a letter that actually appears in it.
export const MENUS = [
    {
        label: 'File',
        mnemonic: 'F',
        items: [
            { label: 'Company Details', icon: 'fa-landmark', to: '/companies' },
            { type: 'sep' },
            { label: 'Exit', icon: 'fa-right-from-bracket', action: 'logout' },
        ],
    },
    {
        label: 'Initial Settings',
        mnemonic: 'I',
        items: [
            { label: 'Departments', icon: 'fa-building', to: '/departments' },
            { label: 'Designations', icon: 'fa-id-badge', to: '/positions' },
            { label: 'Branches', icon: 'fa-code-branch', to: '/branches' },
            { label: 'Categories', icon: 'fa-layer-group', to: '/categories' },
            { type: 'sep' },
            { label: 'Salary Heads', icon: 'fa-money-check-alt', to: '/salary-heads' },
            { label: 'Salary Structure', icon: 'fa-sitemap', to: '/salary-structures' },
            { label: 'Loan Setup', icon: 'fa-hand-holding-dollar', to: '/loans' },
            { label: 'User Deductions', icon: 'fa-minus-circle', to: '/user-deductions' },
            { type: 'sep' },
            { label: 'Attendance Configuration', icon: 'fa-sliders-h', to: '/attendance-config' },
            { label: 'Leave Configuration', icon: 'fa-calendar-week', to: '/leave-config' },
            { label: 'Shifts', icon: 'fa-clock', to: '/shifts' },
            { label: 'Holidays', icon: 'fa-umbrella-beach', to: '/holidays' },
            { type: 'sep' },
            { label: 'Statutory Settings', icon: 'fa-cogs', to: '/settings' },
        ],
    },
    {
        label: 'Master',
        mnemonic: 'M',
        items: [
            { label: 'Employee Details', icon: 'fa-users', to: '/employees' },
        ],
    },
    {
        label: 'Attendance',
        mnemonic: 'A',
        items: [
            { label: 'Daily Attendance', icon: 'fa-calendar-day', to: '/attendance' },
            { label: 'Attendance Regularization', icon: 'fa-clock-rotate-left', to: '/attendance-regularization' },
            { label: 'Shift Roster', icon: 'fa-calendar-days', to: '/shift-roster' },
            { label: 'Leave Application', icon: 'fa-paper-plane', to: '/leaves' },
        ],
    },
    {
        label: 'Pre Salary Transactions',
        mnemonic: 'P',
        items: [
            { label: 'Advance', icon: 'fa-hand-holding-usd', to: '/payroll/advances' },
            { label: 'Expense Claims', icon: 'fa-receipt', to: '/expense-claims' },
        ],
    },
    {
        label: 'Salary Transactions',
        mnemonic: 'S',
        items: [
            { label: 'Net Pay (Run Payroll)', icon: 'fa-file-invoice-dollar', to: '/payroll' },
            { label: 'Salary Editor', icon: 'fa-edit', to: '/payroll/editor' },
            { label: 'Pay Slip', icon: 'fa-receipt', to: '/payroll/payslips' },
            { label: 'Pay Periods', icon: 'fa-calendar-check', to: '/payroll/months' },
            { type: 'sep' },
            { label: 'Full & Final Settlement', icon: 'fa-user-slash', to: '/payroll/fnf' },
        ],
    },
    {
        label: 'Import/Export',
        mnemonic: 'E',
        items: [
            { label: 'Import / Export', icon: 'fa-file-export', to: '/import-export' },
        ],
    },
    {
        label: 'Report',
        mnemonic: 'R',
        items: [
            { label: 'Statutory Reports', icon: 'fa-chart-pie', to: '/reports' },
            { label: 'Report Writer', icon: 'fa-table', to: '/report-writer' },
            { label: 'Muster Roll', icon: 'fa-table-cells', to: '/muster-roll' },
            { type: 'sep' },
            { label: 'PF ECR / ESI Return Files', icon: 'fa-file-export', to: '/statutory-files' },
        ],
    },
    {
        label: 'Tools',
        mnemonic: 'T',
        items: [
            { label: 'Tax Declarations (Review)', icon: 'fa-file-invoice', to: '/tax-declarations' },
            { label: 'Letters', icon: 'fa-envelope-open-text', to: '/letters' },
            { type: 'sep' },
            { label: 'Recruitment', icon: 'fa-briefcase', to: '/recruitment' },
            { label: 'Performance Reviews', icon: 'fa-star-half-alt', to: '/performance' },
            { label: 'Helpdesk', icon: 'fa-headset', to: '/helpdesk' },
            { label: 'Assets', icon: 'fa-laptop', to: '/assets' },
        ],
    },
    {
        label: 'Utility',
        mnemonic: 'U',
        items: [
            { label: 'Dashboard', icon: 'fa-gauge-high', to: '/dashboard' },
            { label: 'Email Log', icon: 'fa-envelope', to: '/email-log' },
            { label: 'Audit Log', icon: 'fa-clipboard-list', to: '/audit-log' },
            { label: 'SMS Log', icon: 'fa-comment-sms', to: '/sms-log' },
        ],
    },
    {
        label: 'Registration',
        mnemonic: 'G',
        items: [
            { label: 'Application Control (Subscriptions)', icon: 'fa-crown', to: '/platform/subscriptions', superAdminOnly: true },
        ],
    },
    {
        label: 'Help',
        mnemonic: 'H',
        items: [
            { label: 'About', icon: 'fa-circle-info', action: 'about' },
        ],
    },
];

// Standalone links shown at the far right of the menu bar (not dropdowns).
export const TOP_LINKS = [
    { label: 'Contact Us', icon: 'fa-headset', action: 'contact' },
    { label: 'Quick Start', icon: 'fa-rocket', action: 'quickstart' },
];

// Quick-access toolbar shown under the menu bar.
export const TOOLBAR_SHORTCUTS = [
    { label: 'Dashboard', icon: 'fa-gauge-high', to: '/dashboard' },
    { label: 'Employees', icon: 'fa-users', to: '/employees' },
    { label: 'Tracking', icon: 'fa-calendar-day', to: '/attendance' },
    { label: 'Leave Summary', icon: 'fa-paper-plane', to: '/leaves' },
    { label: 'Advance', icon: 'fa-hand-holding-usd', to: '/payroll/advances' },
    { label: 'Salary Editor', icon: 'fa-edit', to: '/payroll/editor' },
    { label: 'Run Payroll', icon: 'fa-file-invoice-dollar', to: '/payroll' },
    { label: 'Pay Slip', icon: 'fa-receipt', to: '/payroll/payslips' },
    { label: 'F&F Settlement', icon: 'fa-user-slash', to: '/payroll/fnf' },
    { label: 'Statu. Reports', icon: 'fa-chart-pie', to: '/reports' },
    { label: 'MIS Data', icon: 'fa-table', to: '/report-writer' },
];

// Finds the menu item (or top-link/toolbar shortcut) registered for a given route path —
// used to look up a sensible title/icon when a window is opened from something other than
// a menu click (e.g. seeding the very first window from the browser's initial URL).
export function findMenuItem(path) {
    for (const menu of MENUS) {
        for (const item of menu.items) {
            if (item.to === path) return item;
        }
    }
    return TOOLBAR_SHORTCUTS.find((t) => t.to === path) || null;
}

function moduleForPath(path) {
    for (const menu of MENUS) {
        if (menu.items.some((i) => i.to === path)) return menu.label;
    }
    return null;
}

// Contextual toolbar sets per top-level menu module — what "Toolbar that updates per open
// screen" means here: the quick-access row swaps to shortcuts relevant to whichever module
// the focused MDI window belongs to, always led by a Dashboard shortcut back home.
const CONTEXT_TOOLBARS = {
    'Initial Settings': [
        { label: 'Departments', icon: 'fa-building', to: '/departments' },
        { label: 'Designations', icon: 'fa-id-badge', to: '/positions' },
        { label: 'Branches', icon: 'fa-code-branch', to: '/branches' },
        { label: 'Salary Heads', icon: 'fa-money-check-alt', to: '/salary-heads' },
        { label: 'Salary Structure', icon: 'fa-sitemap', to: '/salary-structures' },
        { label: 'Holidays', icon: 'fa-umbrella-beach', to: '/holidays' },
    ],
    Master: [
        { label: 'Employees', icon: 'fa-users', to: '/employees' },
        { label: 'Import/Export', icon: 'fa-file-export', to: '/import-export' },
    ],
    Attendance: [
        { label: 'Daily Attendance', icon: 'fa-calendar-day', to: '/attendance' },
        { label: 'Regularization', icon: 'fa-clock-rotate-left', to: '/attendance-regularization' },
        { label: 'Shift Roster', icon: 'fa-calendar-days', to: '/shift-roster' },
        { label: 'Leave App.', icon: 'fa-paper-plane', to: '/leaves' },
        { label: 'Shifts', icon: 'fa-clock', to: '/shifts' },
    ],
    'Pre Salary Transactions': [
        { label: 'Advance', icon: 'fa-hand-holding-usd', to: '/payroll/advances' },
        { label: 'Expense Claims', icon: 'fa-receipt', to: '/expense-claims' },
    ],
    'Import/Export': [
        { label: 'Import / Export', icon: 'fa-file-export', to: '/import-export' },
        { label: 'Employees', icon: 'fa-users', to: '/employees' },
    ],
    'Salary Transactions': [
        { label: 'Run Payroll', icon: 'fa-file-invoice-dollar', to: '/payroll' },
        { label: 'Salary Editor', icon: 'fa-edit', to: '/payroll/editor' },
        { label: 'Pay Slip', icon: 'fa-receipt', to: '/payroll/payslips' },
        { label: 'Pay Periods', icon: 'fa-calendar-check', to: '/payroll/months' },
        { label: 'F&F Settlement', icon: 'fa-user-slash', to: '/payroll/fnf' },
    ],
    Report: [
        { label: 'Statu. Reports', icon: 'fa-chart-pie', to: '/reports' },
        { label: 'Report Writer', icon: 'fa-table', to: '/report-writer' },
        { label: 'Muster Roll', icon: 'fa-table-cells', to: '/muster-roll' },
        { label: 'PF/ESI Files', icon: 'fa-file-export', to: '/statutory-files' },
    ],
    Tools: [
        { label: 'Tax Decl.', icon: 'fa-file-invoice', to: '/tax-declarations' },
        { label: 'Letters', icon: 'fa-envelope-open-text', to: '/letters' },
        { label: 'Recruitment', icon: 'fa-briefcase', to: '/recruitment' },
        { label: 'Helpdesk', icon: 'fa-headset', to: '/helpdesk' },
        { label: 'Assets', icon: 'fa-laptop', to: '/assets' },
    ],
    Utility: [
        { label: 'Email Log', icon: 'fa-envelope', to: '/email-log' },
        { label: 'Audit Log', icon: 'fa-clipboard-list', to: '/audit-log' },
        { label: 'SMS Log', icon: 'fa-comment-sms', to: '/sms-log' },
    ],
};

export function toolbarForPath(path) {
    const mod = path && moduleForPath(path);
    const contextual = mod && CONTEXT_TOOLBARS[mod];
    if (!contextual) return TOOLBAR_SHORTCUTS;
    return [{ label: 'Dashboard', icon: 'fa-gauge-high', to: '/dashboard' }, ...contextual];
}
