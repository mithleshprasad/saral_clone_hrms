# MpxHR — HR & Payroll (Cloud + Desktop)

A SaralPayPack-style HR/payroll suite: employee master, salary structure, attendance & leave,
payroll processing (PF/ESI/PT/TDS), statutory reports. One frontend serving three audiences by
role, one shared backend, plus a thin-client Electron desktop wrapper.

> The original single-machine Electron/SQLite prototype (**MpxHR**) still lives under
> [desktop/legacy-mpxhr/](desktop/legacy-mpxhr/) for reference — its business logic
> (payroll calc, schema) was ported into `server/`. It's a standalone project (its own
> `package.json`/`node_modules`, unrelated to the current `desktop/` Electron shell) kept
> only for history; run `npm install` inside that folder if you ever want to launch it.

## Architecture

```
server/      Node.js + Express REST API, MySQL (mysql2, raw parameterized SQL)
             layered as constants → models → services → controllers → routes
web/         React (Vite) SPA — one login, one app (port 5173). AuthGate picks the workspace
             purely off the signed-in user's role: Employee -> EssWorkspace (self-service),
             Admin/HR/Super Admin -> the MDI console (Super Admin additionally sees an
             Application Control menu item for managing tenant subscriptions).
desktop/     Electron shell — thin client that opens web/'s URL in a native window
```

`AuthGate` (`web/src/App.jsx`) is the only place that branches on role — everything below it
(EssWorkspace, the MDI console, Application Control) is a normal part of the same app, same
origin, same login, not a separate deployable site.

`web/`'s Admin/HR app is a desktop-style **MDI workspace**, not a single-page router: opening a
screen from the menu bar or toolbar opens a real window — movable, minimizable, maximizable,
closable, several at once, tracked in a taskbar at the bottom (`web/src/context/WindowManagerContext.jsx`,
`web/src/components/layout/MdiDesktop.jsx`/`MdiWindowFrame.jsx`). Each window carries its own
isolated in-memory router (`web/src/components/AppRoutes.jsx`) so in-window navigation (e.g.
Employee List → Employee Detail) works exactly like a normal page, just scoped to that one
window — react-router forbids nesting a router inside another, so the app shell itself is
deliberately router-free, switching between the login screen and the workspace purely off auth
state. Any `DialogWindow`-wrapped page automatically becomes a window's actual chrome (title bar,
drag handle, minimize/maximize/close) via `WindowFrameContext`; a `DialogWindow` nested inside
another (a detail popup, an Add/Edit dialog) never picks up a second set of controls. The menu bar
also responds to keyboard mnemonics — Alt+letter opens any top-level menu, arrows/Enter/Escape/
letter-jump navigate from there — and the quick-access toolbar swaps to a shortcut set relevant to
whichever window is focused.

The desktop app is **online-only**: it has no local database, it simply opens a configured URL
(any of the three) in a native window — see **File → Change Server URL…** inside it.

## Prerequisites

- Node.js 18+
- A running MySQL server (local install, or any managed MySQL — no Docker required)

## 1. Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env      # edit DB_HOST/DB_USER/DB_PASSWORD/JWT_SECRET as needed
npm run migrate           # creates the database, applies schema.sql, seeds default settings
                           # and a default Super Admin user (username: admin / password: admin123)
npm run dev                # starts the API on http://localhost:4000
```

Change the default admin password immediately after first login.

## 2. Frontend (`web/`)

```bash
cd web
npm install
cp .env.example .env       # VITE_API_URL should point at the server above
npm run dev                # http://localhost:5173
```

Every role signs in at the same URL and lands on `/dashboard` — what renders there depends on
the account's role (Employee gets the self-service workspace; Admin/HR/Super Admin get the MDI
console).

For production, `npm run build` outputs static files in `web/dist/` — deploy to any static host
(Netlify, S3+CloudFront, Nginx, etc.) alongside the `server/` API.

## 3. Desktop app (`desktop/`)

```bash
cd desktop
npm install
npm start
```

On first launch it opens `http://localhost:5173` (`web/` in dev). Use **File → Change Server
URL…** to point an installed build at a differently-hosted `web/` deployment — no rebuild
needed.

`npm start` runs `start.js`, not `electron .` directly — if run from a terminal spawned by
an Electron-based parent (e.g. VS Code's integrated terminal), the environment can carry
`ELECTRON_RUN_AS_NODE=1`, which makes `require('electron')` return just a path string
instead of the real API, crashing immediately with `Cannot read properties of undefined
(reading 'getPath')`. `start.js` strips that variable before spawning Electron so this
works regardless of which terminal you launch it from.

To produce an installer: `npm run dist` (electron-builder, Windows NSIS target by default).

## Database schema

`server/src/db/schema.sql` is the single source of truth for the MySQL schema — it covers
companies/branches, departments/positions/employee categories, employees, salary heads, loans
and user-defined deductions, attendance/shifts, leave management, payroll + payroll periods,
plus assets/recruitment/performance/helpdesk tables carried over from the original app.

## What's implemented

Everything below is wired end-to-end (backend route → service → UI) and was verified against a
live MySQL instance:

- **Org structure**: companies (full statutory profile: PAN/TAN/GSTIN/PF/ESI/PT/LWF/bank/directors),
  branches, departments, designations, employee categories.
- **Employee master**: full multi-tab Employee Details screen (Classification, Salary Structure,
  Statutory PF/ESI/PT, Bank & Contact, Address).
- **Salary structures**: define a structure, assign salary heads to it with calc type (Lumpsum /
  % of Basic / Formula / Every Month), apply a structure to an employee to populate their salary
  fields.
- **Payroll**: engine (PF/EPS/ESI/PT/VPF/loan EMI/LOP/overtime, pro-rated by attendance), payslip
  list, a Salary Editor for hand-adjusting a generated payslip's components, pay-period open/close
  locking, Full & Final Settlement (auto-seeds line items from the last payslip + pending loans,
  editable Earnings/Deductions grid, gratuity/leave-encashment, finalize).
- **TDS**: a real progressive slab engine (`server/src/utils/incomeTax.js`) — Old/New regime
  (per-employee choice), Section 87A rebate, 4% Health & Education Cess, surcharge bands.
  Annualizes the period's earnings, taxes it through the applicable regime's marginal slabs,
  divides back to a monthly figure.
- **Advances / loans**: per-employee overview (advance/recovered/EMI/due), EMI auto-deducted each
  payroll run until settled.
- **Attendance**: daily marking, Attendance Configuration (NWD basis, register type), shifts, and
  a biometric-device punch log importer (matches by employee code, pairs IN/OUT punches per
  employee per day — or first/last punch when the device doesn't tag direction). A **Shift
  Roster** screen assigns a shift to an employee across a date range (multiple ranges = a
  rotation). **Overtime** is auto-calculated from check-in/check-out duration: OT1 (working-day
  hours beyond a configurable standard hours/day) and OT2 (any hours on a weekly-off/holiday) are
  each gated by their own Attendance Configuration toggle, computed on punch import and
  self-service check-out, and picked up by payroll as a real earning line (hours × effective
  hourly rate × a configurable OT rate multiplier).
- **Leave**: requests + approval with balance deduction, full Leave Configuration (allotment/avail
  basis, auto-allotment, carry-over, encashment, priority). Every company is seeded with default
  leave types (Casual/Sick/Earned/Unpaid/Comp-Off/On Duty/Permission) — configurable like any other.
- **Attendance regularization**: an employee requests a day's attendance be corrected (with a
  reason); HR approves/rejects; approval applies the correction directly to that day's record.
- **Email + SMS notifications**: a "payslip ready" email and SMS both fire after each payroll run
  for employees with an email/phone on file. Falls back to logging (not sending) when no SMTP
  server / SMS gateway is configured — see the Email Log / SMS Log screens (Utility menu) and
  `SMTP_HOST` / `SMS_API_URL` in `server/.env.example`.
- **Audit trail**: an Audit Log screen (Utility menu) records who created/updated/deleted
  Employees, Payroll, Companies, and ESS logins, with a plain-English summary of the change.
- **Employee documents**: HR uploads ID proofs/certificates on the Employee Details "Documents"
  tab; employees view and download their own via ESS. Stored server-side, never served
  statically — every download is ownership-checked.
- **Expense / reimbursement claims**: employees submit a claim (category, amount, date,
  description, optional receipt image/PDF) via ESS; HR reviews on the new Expense Claims screen
  (Pre Salary Transactions menu) — Approve/Reject, then Mark Paid once an Approved claim is
  reimbursed. Terminal states (Rejected/Paid) can't be changed further. Receipt downloads are
  ownership-checked on the ESS side the same way employee documents are.
- **Reports**: fixed statutory reports (salary sheet, PF/ESI, bank advice, tax, Form 16 feeder,
  yearly summary, department summary) plus a dynamic **Report Writer** — pick employees, pick
  columns from a whitelisted set (classification/additional-info/salary-heads), group by
  employee/department, run. A **Muster Roll** screen renders a day-by-day P/A/HD/L/H/WO grid per
  employee for the month (explicit attendance records win; unmarked days fall back to company
  holidays, then approved leave, then Sunday as weekly off, then Absent — days before joining or
  after exit render blank), with a downloadable CSV register alongside the on-screen grid. A
  **Loan / Advance Ledger** report type lists every loan a company has issued with principal,
  amount recovered, outstanding balance, EMI and status.
- **Recruitment**: jobs, candidate pipeline with status tracking, an Interviews & Hiring view
  per candidate (schedule rounds with date/time/interviewer/mode, capture rating/recommendation/
  feedback per round — scheduling a candidate's first interview auto-advances them from Applied
  to Interview), and a **Convert to Employee** action that creates the employee record from the
  candidate's data and generates the chosen Offer/Appointment letter against it in the same step.
- **Performance reviews**: initiate, self/manager ratings.
- **Helpdesk**: tickets with category/priority/status.
- **Assets**: register, assign/return to employees.
- **Application Control / Subscriptions** (Super Admin only): subscription plan catalog, per-company
  plan/status/expiry, and a hard kill switch — a Suspended/Expired/disabled company's employees
  are blocked from payroll generation immediately.
- **Payslip, Form 16 & Form 12BA PDFs**: real generated PDFs (pdfkit), downloadable from the admin
  payslip list or by the employee themselves. Form 16 is a correctly-computed annual summary
  annexure, not a TRACES-signed official Form 16. Form 12BA (statement of perquisites) reads from
  a new "Perquisites" tab on Employee Details — HR enters each non-cash benefit's already-valued
  amount (Income Tax Rule 3 valuation isn't something payroll software auto-computes; it varies
  wildly per perquisite type) and the annexure totals the taxable value per employee per FY.
- **Tax declarations (ESS)**: employees submit 80C/80CCD/80D/HRA/home-loan-interest/other
  deductions per financial year; HR approves; **approved declarations actually reduce the monthly
  taxable base in the TDS calculation** from the next payroll run.
- **Statutory files**: PF ECR ('#~#'-delimited EPFO text format) and an ESI monthly-contribution
  CSV, generated from real payroll data for a given company/month. Plus PF annual returns —
  **Form 3A** (member-wise annual PF contribution statement, month-wise from real payroll
  records with an annual total per employee), **Form 5** (new PF subscribers whose date of
  joining falls in the period), and **Form 10** (PF exits whose exit date falls in the period).
  **Form 24Q** has two downloads: the original per-quarter CSV data feeder, and an NSDL-structured
  `.txt` file mirroring the real e-TDS record layout (File Header/Batch Header/Challan
  Detail/Deductee Detail) — challan details (BSR code, serial no, deposit date/amount) are entered
  from the bank receipt at generation time, since there's no separate challan-tracking module.
  **Bank payment files** for salary transfer now include SBI/HDFC/ICICI-specific NEFT/RTGS
  bulk-upload layouts alongside the original generic Bank Advice report, auto-picking RTGS above
  ₹2 lakh and NEFT below it.
- **Letters**: Appointment/Offer/Relieving/Increment/Experience letters generated from employee +
  company data and downloadable as PDF.
- **Import / Export**: a dedicated screen (Import/Export menu) — bulk Excel/CSV employee import
  (flexible header matching, per-row skip report) and CSV export of the employee master plus five
  of the statutory reports.
- **Employee Self-Service**: an Employee-role login lands on a locked-down workspace within the
  same app — dashboard, payslips + PDF + Form 16, attendance history, leave balance + request +
  history, tax declaration submission, document downloads, expense claim submission, and their
  generated letters. Every ESS endpoint is scoped server-side to the JWT's `employeeId`, never a
  client-supplied id.
- Dashboard with live stats.

**Roles**: Super Admin (tenant operations plus the Application Control menu for
platform/subscriptions, passes every check everywhere) → Admin/HR (tenant operations, including
reviewing tax declarations) → Employee (self-service workspace only). All three sign into the
same `web/` app; `AuthGate` (`web/src/App.jsx`) routes each to the right workspace off the JWT's
`role`. The default seeded user (`admin` / `admin123`) is Super Admin; change the password
immediately. To give a staff member self-service access, create a user with role `Employee` and
`employee_id` set to their employee record via `POST /api/auth/users` — there's no "create ESS
login" button in the UI yet, so this is currently an API/admin-tool action.

## Known limitations

- **Form 16 / Form 12BA** are correctly-computed data annexures, not TRACES-portal-signed
  official documents (that requires Part A from the government portal + digital signature).
- **PF ECR / ESI return / Form 24Q (NSDL format) / bank NEFT-RTGS files** carry correct computed
  figures in the right general shape, but are not guaranteed byte-for-byte compatible with
  EPFO/ESIC/NSDL/bank-portal live upload validators — treat as a strong starting point, verify
  against the actual portal/bank template before filing or uploading.
- **Biometric device integration** is file-import only (a punch-log export from the device) —
  there's no live/real-time connection to biometric hardware.
- No "create ESS login" button yet (see above) and no self-serve password reset flow.
