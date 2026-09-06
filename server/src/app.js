const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { requireAuth, requireRole } = require('./middleware/auth');
const licenseGate = require('./middleware/licenseGate');
const { ROLES } = require('./constants');

const authRoutes = require('./routes/auth.routes');
const companiesRoutes = require('./routes/companies.routes');
const branchesRoutes = require('./routes/branches.routes');
const departmentsRoutes = require('./routes/departments.routes');
const positionsRoutes = require('./routes/positions.routes');
const employeeCategoriesRoutes = require('./routes/employeeCategories.routes');
const employeesRoutes = require('./routes/employees.routes');
const salaryHeadsRoutes = require('./routes/salaryHeads.routes');
const salaryStructuresRoutes = require('./routes/salaryStructures.routes');
const subscriptionPlansRoutes = require('./routes/subscriptionPlans.routes');
const shiftsRoutes = require('./routes/shifts.routes');
const holidaysRoutes = require('./routes/holidays.routes');
const leaveTypesRoutes = require('./routes/leaveTypes.routes');
const loansRoutes = require('./routes/loans.routes');
const userDeductionsRoutes = require('./routes/userDeductions.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const attendanceRegularizationsRoutes = require('./routes/attendanceRegularizations.routes');
const leavesRoutes = require('./routes/leaves.routes');
const payrollRoutes = require('./routes/payroll.routes');
const settingsRoutes = require('./routes/settings.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const fnfSettlementsRoutes = require('./routes/fnfSettlements.routes');
const attendanceConfigsRoutes = require('./routes/attendanceConfigs.routes');
const reportWriterRoutes = require('./routes/reportWriter.routes');
const assetsRoutes = require('./routes/assets.routes');
const jobsRoutes = require('./routes/jobs.routes');
const candidatesRoutes = require('./routes/candidates.routes');
const onboardingTasksRoutes = require('./routes/onboardingTasks.routes');
const performanceReviewsRoutes = require('./routes/performanceReviews.routes');
const ticketsRoutes = require('./routes/tickets.routes');
const taxDeclarationsRoutes = require('./routes/taxDeclarations.routes');
const lettersRoutes = require('./routes/letters.routes');
const statutoryFilesRoutes = require('./routes/statutoryFiles.routes');
const emailLogRoutes = require('./routes/emailLog.routes');
const smsLogRoutes = require('./routes/smsLog.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const expenseClaimsRoutes = require('./routes/expenseClaims.routes');
const perquisitesRoutes = require('./routes/perquisites.routes');
const shiftRosterRoutes = require('./routes/shiftRoster.routes');
const interviewsRoutes = require('./routes/interviews.routes');
const essRoutes = require('./routes/ess.routes');

const app = express();

app.use(cors({
    origin(origin, callback) {
        // Non-browser clients (curl, server-to-server) send no Origin header — allow those.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);

// Installation-wide license check — sits above auth so a suspended/revoked/expired
// installation is blocked (or read-only) for every tenant, not just one company. Login
// itself is exempt (mounted above) so an admin can always sign in to see why.
app.use('/api', licenseGate);

// Everything below requires a valid JWT.
app.use('/api', requireAuth);

// ESS is mounted before the tenant-role gate below, so an Employee-role account can reach
// its own scoped self-service endpoints while being blocked from every tenant-admin route.
app.use('/api/ess', essRoutes);

// Employee role stops here: every route mounted after this line is tenant administration
// (org structure, payroll, masters, reports, ...) and requires Admin/HR (Super Admin always
// passes, per requireRole's built-in bypass). Without this gate, any authenticated Employee
// account could call these CRUD endpoints directly — this is the actual authorization
// boundary, not just the odd per-route requireRole(ADMIN) sprinkled on some delete handlers.
app.use('/api', requireRole(ROLES.ADMIN, ROLES.HR));

app.use('/api/companies', companiesRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/employee-categories', employeeCategoriesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/salary-heads', salaryHeadsRoutes);
app.use('/api/salary-structures', salaryStructuresRoutes);
app.use('/api/subscription-plans', subscriptionPlansRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/leave-types', leaveTypesRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/user-deductions', userDeductionsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance-regularizations', attendanceRegularizationsRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fnf-settlements', fnfSettlementsRoutes);
app.use('/api/attendance-configs', attendanceConfigsRoutes);
app.use('/api/report-writer', reportWriterRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/onboarding-tasks', onboardingTasksRoutes);
app.use('/api/performance-reviews', performanceReviewsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/tax-declarations', taxDeclarationsRoutes);
app.use('/api/letters', lettersRoutes);
app.use('/api/statutory-files', statutoryFilesRoutes);
app.use('/api/email-log', emailLogRoutes);
app.use('/api/sms-log', smsLogRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/expense-claims', expenseClaimsRoutes);
app.use('/api/perquisites', perquisitesRoutes);
app.use('/api/shift-roster', shiftRosterRoutes);
app.use('/api/interviews', interviewsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Many resources go through the generic CRUD factory (genericModel/genericService), which
// has no per-field validation — a required-but-omitted column, a duplicate unique value, or
// a bad foreign-key reference all currently reach MySQL and throw. Without this translation
// those surface as an unhelpful 500 with a raw SQL error message leaked to the client
// (column/table names included) instead of a normal 400/409 a caller can act on.
const MYSQL_ERROR_MESSAGES = {
    ER_BAD_NULL_ERROR: (err) => {
        const col = err.sqlMessage?.match(/Column '(\w+)'/)?.[1];
        return { status: 400, message: col ? `${col} is required` : 'A required field is missing' };
    },
    ER_DUP_ENTRY: () => ({ status: 409, message: 'A record with these values already exists' }),
    ER_NO_REFERENCED_ROW_2: () => ({ status: 400, message: 'A referenced record does not exist' }),
    ER_NO_REFERENCED_ROW: () => ({ status: 400, message: 'A referenced record does not exist' }),
    ER_ROW_IS_REFERENCED_2: () => ({ status: 409, message: 'This record is still referenced by other data and cannot be deleted' }),
    ER_ROW_IS_REFERENCED: () => ({ status: 409, message: 'This record is still referenced by other data and cannot be deleted' }),
};

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(err);
    const mapped = MYSQL_ERROR_MESSAGES[err.code]?.(err);
    if (mapped) return res.status(mapped.status).json({ error: mapped.message });
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
