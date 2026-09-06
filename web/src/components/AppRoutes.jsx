import { Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import Reports from '../pages/Reports';
import MusterRoll from '../pages/MusterRoll';
import ExpenseClaims from '../pages/ExpenseClaims';
import ReportWriter from '../pages/ReportWriter';
import EmailLog from '../pages/EmailLog';
import AuditLog from '../pages/AuditLog';
import SmsLog from '../pages/SmsLog';
import ImportExport from '../pages/ImportExport';

import EmployeeList from '../pages/employees/EmployeeList';
import EmployeeForm from '../pages/employees/EmployeeForm';

import Departments from '../pages/masters/Departments';
import Holidays from '../pages/masters/Holidays';
import Positions from '../pages/masters/Positions';
import Branches from '../pages/masters/Branches';
import Categories from '../pages/masters/Categories';
import SalaryHeads from '../pages/masters/SalaryHeads';
import SalaryStructures from '../pages/masters/SalaryStructures';
import Loans from '../pages/masters/Loans';
import UserDeductions from '../pages/masters/UserDeductions';
import Companies from '../pages/masters/Companies';
import TaxDeclarationsAdmin from '../pages/masters/TaxDeclarationsAdmin';
import Letters from '../pages/masters/Letters';
import StatutoryFiles from '../pages/masters/StatutoryFiles';

import Attendance from '../pages/attendance/Attendance';
import AttendanceConfig from '../pages/attendance/AttendanceConfig';
import AttendanceRegularization from '../pages/attendance/AttendanceRegularization';
import Leaves from '../pages/attendance/Leaves';
import LeaveConfig from '../pages/attendance/LeaveConfig';
import Shifts from '../pages/attendance/Shifts';
import ShiftRoster from '../pages/attendance/ShiftRoster';

import PayrollRun from '../pages/payroll/PayrollRun';
import PayrollList from '../pages/payroll/PayrollList';
import PayrollMonths from '../pages/payroll/PayrollMonths';
import SalaryEditor from '../pages/payroll/SalaryEditor';
import Advances from '../pages/payroll/Advances';
import FnfSettlements from '../pages/payroll/FnfSettlements';

import Recruitment from '../pages/recruitment/Recruitment';
import PerformanceReviews from '../pages/performance/PerformanceReviews';
import Tickets from '../pages/helpdesk/Tickets';
import Assets from '../pages/assets/Assets';

import Subscriptions from '../pages/platform/Subscriptions';

// The full set of tenant-admin screens, shared by every MDI window (each window mounts its
// own copy inside its own MemoryRouter — see MdiWindowFrame) so in-page navigation and
// nested routes (Employee List -> Employee Detail) keep working exactly as before, just
// scoped to that one window instead of the browser's address bar.
export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/employees" element={<EmployeeList />}>
                <Route path="new" element={<EmployeeForm />} />
                <Route path=":id" element={<EmployeeForm />} />
            </Route>

            <Route path="/departments" element={<Departments />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/salary-heads" element={<SalaryHeads />} />
            <Route path="/salary-structures" element={<SalaryStructures />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/user-deductions" element={<UserDeductions />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/tax-declarations" element={<TaxDeclarationsAdmin />} />
            <Route path="/letters" element={<Letters />} />
            <Route path="/statutory-files" element={<StatutoryFiles />} />
            <Route path="/import-export" element={<ImportExport />} />

            <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance-config" element={<AttendanceConfig />} />
            <Route path="/attendance-regularization" element={<AttendanceRegularization />} />
            <Route path="/leaves" element={<Leaves />} />
            <Route path="/leave-config" element={<LeaveConfig />} />
            <Route path="/shifts" element={<Shifts />} />
            <Route path="/shift-roster" element={<ShiftRoster />} />

            <Route path="/payroll" element={<PayrollRun />} />
            <Route path="/payroll/payslips" element={<PayrollList />} />
            <Route path="/payroll/editor" element={<SalaryEditor />} />
            <Route path="/payroll/advances" element={<Advances />} />
            <Route path="/expense-claims" element={<ExpenseClaims />} />
            <Route path="/payroll/fnf" element={<FnfSettlements />} />
            <Route path="/payroll/months" element={<PayrollMonths />} />

            <Route path="/recruitment" element={<Recruitment />} />
            <Route path="/performance" element={<PerformanceReviews />} />
            <Route path="/helpdesk" element={<Tickets />} />
            <Route path="/assets" element={<Assets />} />

            <Route path="/platform/subscriptions" element={<Subscriptions />} />

            <Route path="/reports" element={<Reports />} />
            <Route path="/muster-roll" element={<MusterRoll />} />
            <Route path="/report-writer" element={<ReportWriter />} />
            <Route path="/email-log" element={<EmailLog />} />
            <Route path="/audit-log" element={<AuditLog />} />
            <Route path="/sms-log" element={<SmsLog />} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
