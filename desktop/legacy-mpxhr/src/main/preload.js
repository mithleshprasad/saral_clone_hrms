const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    logout: () => ipcRenderer.invoke('logout'),
    getSession: () => ipcRenderer.invoke('get-session'),
    createUser: (d) => ipcRenderer.invoke('create-user', d),
    checkUserExists: (id) => ipcRenderer.invoke('check-user-exists', id),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSetting: (data) => ipcRenderer.invoke('update-setting', data),
    // Documents
    uploadDocument: (data) => ipcRenderer.invoke('upload-document', data),
    getDocuments: (id) => ipcRenderer.invoke('get-documents', id),
    openDocument: (filePath) => ipcRenderer.invoke('open-document', filePath),
    openUserGuide: () => ipcRenderer.invoke('open-user-guide'),
    // Assets
    getAssets: (args) => ipcRenderer.invoke('get-assets', args),
    addAsset: (a) => ipcRenderer.invoke('add-asset', a),
    deleteAsset: (id) => ipcRenderer.invoke('delete-asset', id),
    assignAsset: (d) => ipcRenderer.invoke('assign-asset', d),
    returnAsset: (id) => ipcRenderer.invoke('return-asset', id),

    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
    getEmployees: (args) => ipcRenderer.invoke('get-employees', args),
    addEmployee: (employee) => ipcRenderer.invoke('add-employee', employee),
    updateEmployee: (employee) => ipcRenderer.invoke('update-employee', employee),
    deleteEmployee: (id) => ipcRenderer.invoke('delete-employee', id),
    getDepartments: () => ipcRenderer.invoke('get-departments'),
    addDepartment: (dept) => ipcRenderer.invoke('add-department', dept),
    deleteDepartment: (id) => ipcRenderer.invoke('delete-department', id),
    getPositions: () => ipcRenderer.invoke('get-positions'),
    addPosition: (pos) => ipcRenderer.invoke('add-position', pos),
    deletePosition: (id) => ipcRenderer.invoke('delete-position', id),

    // Employee Categories
    getCategories: () => ipcRenderer.invoke('get-categories'),
    addCategory: (d) => ipcRenderer.invoke('add-category', d),
    updateCategory: (d) => ipcRenderer.invoke('update-category', d),
    deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),

    // Loans
    getLoans: (employeeId) => ipcRenderer.invoke('get-loans', employeeId),
    addLoan: (d) => ipcRenderer.invoke('add-loan', d),
    updateLoan: (d) => ipcRenderer.invoke('update-loan', d),
    deleteLoan: (id) => ipcRenderer.invoke('delete-loan', id),
    getActiveLoanEmi: (employeeId) => ipcRenderer.invoke('get-active-loan-emi', employeeId),

    // User Defined Deductions
    getUserDeductions: () => ipcRenderer.invoke('get-user-deductions'),
    addUserDeduction: (d) => ipcRenderer.invoke('add-user-deduction', d),
    updateUserDeduction: (d) => ipcRenderer.invoke('update-user-deduction', d),
    deleteUserDeduction: (id) => ipcRenderer.invoke('delete-user-deduction', id),

    // Companies & Branches
    getCompanies: () => ipcRenderer.invoke('get-companies'),
    addCompany: (c) => ipcRenderer.invoke('add-company', c),
    deleteCompany: (id) => ipcRenderer.invoke('delete-company', id),
    getBranches: (companyId) => ipcRenderer.invoke('get-branches', companyId),
    addBranch: (b) => ipcRenderer.invoke('add-branch', b),
    deleteBranch: (id) => ipcRenderer.invoke('delete-branch', id),

    // Payroll Months
    getPayrollMonths: () => ipcRenderer.invoke('get-payroll-months'),
    createPayrollMonth: (d) => ipcRenderer.invoke('create-payroll-month', d),
    closePayrollMonth: (id) => ipcRenderer.invoke('close-payroll-month', id),
    getAttendance: (args) => ipcRenderer.invoke('get-attendance', args),
    checkIn: (employeeId) => ipcRenderer.invoke('check-in', employeeId),
    checkOut: (employeeId) => ipcRenderer.invoke('check-out', employeeId),

    // Shifts & Attendance admin
    getShifts: () => ipcRenderer.invoke('get-shifts'),
    addShift: (d) => ipcRenderer.invoke('add-shift', d),
    deleteShift: (id) => ipcRenderer.invoke('delete-shift', id),
    getRoster: (args) => ipcRenderer.invoke('get-roster', args),
    updateRoster: (d) => ipcRenderer.invoke('update-roster', d),

    // Performance
    getReviews: (args) => ipcRenderer.invoke('get-reviews', args),
    initiateReview: (d) => ipcRenderer.invoke('initiate-review', d),
    submitManagerReview: (d) => ipcRenderer.invoke('submit-manager-review', d),

    addAttendance: (d) => ipcRenderer.invoke('add-attendance', d),
    addManualAttendance: (d) => ipcRenderer.invoke('add-manual-attendance', d),
    updateAttendance: (d) => ipcRenderer.invoke('update-attendance', d),
    deleteAttendance: (id) => ipcRenderer.invoke('delete-attendance', id),
    addAttendanceBulk: (rows) => ipcRenderer.invoke('add-attendance-bulk', rows),
    exportAttendance: (q) => ipcRenderer.invoke('export-attendance', q),

    getPayroll: (args) => ipcRenderer.invoke('get-payroll', args),
    getPayrollReport: (args) => ipcRenderer.invoke('get-payroll-report', args), // Dedicated report data fetcher
    savePayroll: (data) => ipcRenderer.invoke('save-payroll', data),
    generatePayroll: (data) => ipcRenderer.invoke('generate-payroll', data),
    requestLeave: (data) => ipcRenderer.invoke('request-leave', data),
    getLeaves: (args) => ipcRenderer.invoke('get-leaves', args),
    updateLeaveStatus: (data) => ipcRenderer.invoke('update-leave-status', data),

    // Stats
    getEmployeeStats: () => ipcRenderer.invoke('get-employee-stats'),
    getAttendanceStats: () => ipcRenderer.invoke('get-attendance-stats'),
    getLeaveStats: () => ipcRenderer.invoke('get-leave-stats'),
    getPayrollStats: () => ipcRenderer.invoke('get-payroll-stats'),

    // Reports
    generateReport: (data) => ipcRenderer.invoke('generate-report', data),

    // Admin & System
    updateAdminProfile: (data) => ipcRenderer.invoke('update-admin-profile', data),
    backupDatabase: (pwd) => ipcRenderer.invoke('backup-database', pwd),
    restoreDatabase: (pwd) => ipcRenderer.invoke('restore-database', pwd),

    // Recruitment
    getJobs: () => ipcRenderer.invoke('get-jobs'),
    addJob: (d) => ipcRenderer.invoke('add-job', d),
    updateJobStatus: (d) => ipcRenderer.invoke('update-job-status', d),
    deleteJob: (id) => ipcRenderer.invoke('delete-job', id),
    getCandidates: () => ipcRenderer.invoke('get-candidates'),
    addCandidate: (d) => ipcRenderer.invoke('add-candidate', d),
    updateCandidateStatus: (d) => ipcRenderer.invoke('update-candidate-status', d),
    getOnboardingTasks: (id) => ipcRenderer.invoke('get-onboarding-tasks', id),
    addOnboardingTask: (d) => ipcRenderer.invoke('add-onboarding-task', d),
    toggleOnboardingTask: (d) => ipcRenderer.invoke('toggle-onboarding-task', d),

    // Advanced Leave Management
    getLeaveTypes: (companyId) => ipcRenderer.invoke('get-leave-types', companyId),
    addLeaveType: (d) => ipcRenderer.invoke('add-leave-type', d),
    deleteLeaveType: (id) => ipcRenderer.invoke('delete-leave-type', id),
    getHolidays: (companyId) => ipcRenderer.invoke('get-holidays', companyId),
    addHoliday: (d) => ipcRenderer.invoke('add-holiday', d),
    deleteHoliday: (id) => ipcRenderer.invoke('delete-holiday', id),

    // Debug
    generateTestData: () => ipcRenderer.invoke('generate-test-data'),
    getLeaveBalance: (empId) => ipcRenderer.invoke('get-leave-balance', empId),
    getLeaveQuickCounters: () => ipcRenderer.invoke('get-leave-quick-counters'),
    getForm16Data: (args) => ipcRenderer.invoke('get-form16-data', args),

    // Helpdesk
    createTicket: (d) => ipcRenderer.invoke('create-ticket', d),
    getTickets: (args) => ipcRenderer.invoke('get-tickets', args),
    updateTicketStatus: (d) => ipcRenderer.invoke('update-ticket-status', d),

    // Window Controls
    minimize: () => ipcRenderer.invoke('minimize-window'),
    maximize: () => ipcRenderer.invoke('maximize-window'),
    close: () => ipcRenderer.invoke('close-window'),

    // Analytics
    getAnalyticsStats: () => ipcRenderer.invoke('get-analytics-stats'), // Fixed name

    // Generic (Safe for internal use if blocked by Context Isolation)
    runSQL: (sql, params) => ipcRenderer.invoke('run-sql', sql, params),
    allSQL: (sql, params) => ipcRenderer.invoke('all-sql', sql, params),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});
