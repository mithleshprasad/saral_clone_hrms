const { ipcMain, dialog, app } = require('electron');
const dbManager = require('../database/db');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');
const AdmZip = require('adm-zip');
const { hashPassword, verifyPassword } = require('./auth');
const session = require('./session');

// Wraps a handler so it rejects unless the current logged-in session is an admin.
// Guards destructive/system-level channels; the renderer's own role checks remain
// as UX (hiding buttons) but are no longer the only line of defense.
function requireAdmin(handler) {
    return async (event, ...args) => {
        if (!session.isAdmin()) throw new Error("Admin privileges required.");
        return handler(event, ...args);
    };
}

// Exposed payroll generator for tests and other callers
async function generatePayrollInternal(data) {
    // Enforce payroll month locking (if a payroll month exists and is locked, prevent generation)
    const startParts = (data.startDate || '').split('-');
    const year = parseInt(startParts[0]);
    const month = parseInt(startParts[1]);
    if (year && month) {
        const pm = await dbManager.get("SELECT locked FROM payroll_months WHERE year=? AND month=?", [year, month]);
        if (pm && pm.locked) throw new Error('Payroll month is closed for the selected period');
    }

    // If employeeId is null -> process all active employees
    let employeesToProcess = [];
    if (!data.employeeId) {
        employeesToProcess = await dbManager.all("SELECT e.id, e.base_salary as emp_salary, e.is_pt_enabled, p.base_salary as pos_salary FROM employees e LEFT JOIN positions p ON e.position_id = p.id WHERE e.status='Active'");
    } else {
        const emp = await dbManager.get("SELECT e.id, e.base_salary as emp_salary, e.is_pt_enabled, p.base_salary as pos_salary FROM employees e LEFT JOIN positions p ON e.position_id = p.id WHERE e.id=?", [data.employeeId]);
        if (!emp) throw new Error("Employee not found");
        employeesToProcess = [emp];
    }

    // Fetch Settings for Calculation once
    const settingsArr = await dbManager.all("SELECT * FROM settings");
    const getSet = (k, def) => {
        const row = settingsArr.find(s => s.key === k);
        return row ? parseFloat(row.value) : def;
    };

    const pfPercentDefault = getSet('pf_percentage', 12) / 100;
    const ptAmount = getSet('professional_tax', 200);
    const taxSlab1 = getSet('tax_slab_1', 50000);
    const taxSlab2 = getSet('tax_slab_2', 100000);

    const today = new Date().toISOString().split('T')[0];

    const skipped = [];
    let processedCount = 0;

    for (const emp of employeesToProcess) {
        try {
            const empId = emp.id;
            // Check if payroll already exists for this employee & period
            const exists = await dbManager.get("SELECT id FROM payroll WHERE employee_id=? AND pay_period_start=? AND pay_period_end=?", [empId, data.startDate, data.endDate]);
            if (exists) {
                if (data.skip_completed) { skipped.push(empId); continue; }
                // default behavior is to skip silently
                continue;
            }

            const grossCTC = emp.emp_salary > 0 ? emp.emp_salary : (emp.pos_salary || 0);

            // Auto-Calculate LOP for this employee
            const att = await dbManager.get("SELECT count(*) as p FROM attendance WHERE employee_id=? AND status='Present' AND date BETWEEN ? AND ?", [empId, data.startDate, data.endDate]);
            const effDays = (att ? att.p : 0);
            const totalWorkingDays = 30;

            let lop = 0;
            let lopDays = 0;
            if (effDays < totalWorkingDays && effDays > 0) {
                lopDays = totalWorkingDays - effDays;
                lop = Math.round((grossCTC / totalWorkingDays) * lopDays);
            }

            const actualGross = grossCTC - lop;

            // Manual override if provided (manual_basic/manual_hra/manual_special)
            let basic, hra, special;
            if (data.manual_basic && Number(data.manual_basic) > 0) {
                basic = Math.round(Number(data.manual_basic));
                hra = Math.round(Number(data.manual_hra) || 0);
                special = Math.round(Number(data.manual_special) || (actualGross - basic - (Number(data.manual_hra) || 0)));
            } else {
                basic = Math.round(actualGross * 0.5);
                hra = Math.round(basic * 0.4);
                special = actualGross - basic - hra;
            }

            // PF %: prefer employee-level pf_rate if present in DB
            const empRow = await dbManager.get("SELECT pf_rate FROM employees WHERE id=?", [empId]);
            const pfPercent = (empRow && empRow.pf_rate) ? (empRow.pf_rate / 100) : pfPercentDefault;
            const pf = Math.round(basic * pfPercent);
            
            // Professional Tax (respect toggle)
            let pt = 0;
            if (emp.is_pt_enabled !== 0 && emp.is_pt_enabled !== false) {
                pt = ptAmount;
            }

            // Dynamic Tax Calcs
            let tds = 0;
            if (actualGross > taxSlab2) tds = Math.round(actualGross * 0.1);
            else if (actualGross > taxSlab1) tds = Math.round(actualGross * 0.05);

            const bonuses = parseFloat(data.bonuses) || 0;
            const otherDeductions = parseFloat(data.deductions) || 0;

            const grossEarnings = basic + hra + special + bonuses;
            const totalDeductions = pf + pt + tds + otherDeductions;
            const net = grossEarnings - totalDeductions;

            await dbManager.run(
                `INSERT INTO payroll (employee_id, pay_period_start, pay_period_end, base_salary, basic_salary, hra, special_allowance, bonuses, pf, professional_tax, tds, other_deductions, lop_amount, gross_salary, total_deductions, net_salary, payment_date, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'Paid')`,
                [empId, data.startDate, data.endDate, grossCTC, basic, hra, special, bonuses, pf, pt, tds, otherDeductions, lop, grossEarnings, totalDeductions, net, today]
            );
            processedCount++;
        } catch (ex) {
            console.error('Payroll generation error for emp', emp.id, ex.message);
        }
    }

    return { success: true, processed: processedCount, skipped };
}

let isIPCSetup = false;
function setupIPC() {
    if (isIPCSetup) {
        console.log("⚠️ IPC Routes already initialized. Skipping.");
        return;
    }
    isIPCSetup = true;
    console.log("Initializing IPC Routes...");

    // --- Schema Helper ---
    (async () => {
        await dbManager.ready();
        const run = async (sql) => { try { await dbManager.run(sql); } catch (e) { } };

        // Smart Column Adder to avoid "duplicate column" errors
        const ensureColumn = async (table, colName, colDef) => {
            try {
                const cols = await dbManager.all(`PRAGMA table_info(${table})`);
                const exists = cols.some(c => c.name === colName);
                if (!exists) {
                    await run(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`);
                    console.log(`[Schema] Added column ${colName} to ${table}`);
                }
            } catch (e) {
                console.error(`[Schema] Error adding ${colName} to ${table}:`, e.message);
            }
        };

        // Employee Cols
        await ensureColumn("employees", "gender", "TEXT");
        await ensureColumn("employees", "dob", "DATE");
        await ensureColumn("employees", "address", "TEXT");
        await ensureColumn("employees", "city", "TEXT");
        await ensureColumn("employees", "state", "TEXT");
        await ensureColumn("employees", "zip_code", "TEXT");
        await ensureColumn("employees", "bank_name", "TEXT");
        await ensureColumn("employees", "account_number", "TEXT");
        await ensureColumn("employees", "ifsc_code", "TEXT");
        await ensureColumn("employees", "pan_number", "TEXT");
        await ensureColumn("employees", "base_salary", "REAL DEFAULT 0");
        await ensureColumn("employees", "exit_date", "DATE");
        await ensureColumn("employees", "employee_code", "TEXT");
        await ensureColumn("employees", "is_pf_enabled", "BOOLEAN DEFAULT 1");
        await ensureColumn("employees", "is_esi_enabled", "BOOLEAN DEFAULT 0");
        await ensureColumn("employees", "is_pt_enabled", "BOOLEAN DEFAULT 1");
        await ensureColumn("employees", "is_transfer_eligible", "BOOLEAN DEFAULT 0");
        await ensureColumn("employees", "transfer_date", "DATE");
        await ensureColumn("employees", "salary_from", "DATE");
        await ensureColumn("employees", "pf_limit_enabled", "BOOLEAN DEFAULT 1");
        await ensureColumn("employees", "pf_limit", "REAL DEFAULT 15000");

        // Documents Table
        await run(`CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            doc_type TEXT,
            file_name TEXT,
            file_path TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Transfers Table
        await run(`CREATE TABLE IF NOT EXISTS transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            from_company_id INTEGER,
            to_company_id INTEGER,
            from_branch_id INTEGER,
            to_branch_id INTEGER,
            transfer_date DATE,
            reason TEXT,
            status TEXT DEFAULT 'Completed'
        )`);

        // Assets Table
        await run(`CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            serial_number TEXT UNIQUE,
            type TEXT,
            status TEXT DEFAULT 'Available',
            assigned_to INTEGER,
            assigned_date DATE,
            value REAL,
            FOREIGN KEY(assigned_to) REFERENCES employees(id)
        )`);

        // Payroll Cols
        await ensureColumn("payroll", "da", "REAL DEFAULT 0");
        await ensureColumn("payroll", "base_salary", "REAL DEFAULT 0");
        await ensureColumn("payroll", "employee_pf", "REAL DEFAULT 0");
        await ensureColumn("payroll", "employer_pf", "REAL DEFAULT 0");
        await ensureColumn("payroll", "employer_eps", "REAL DEFAULT 0");
        await ensureColumn("payroll", "employee_esi", "REAL DEFAULT 0");
        await ensureColumn("payroll", "employer_esi", "REAL DEFAULT 0");

        // --- recruitment (ATS) ---
        await run(`CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            department_id INTEGER,
            description TEXT,
            status TEXT DEFAULT 'Open',
            created_at DATE DEFAULT CURRENT_TIMESTAMP
        )`);

        await run(`CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER,
            name TEXT,
            email TEXT,
            phone TEXT,
            status TEXT DEFAULT 'Applied', -- Applied, Interview, Offer, Hired, Rejected
            notes TEXT,
            resume_path TEXT,
            created_at DATE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(job_id) REFERENCES jobs(id)
        )`);

        await run(`CREATE TABLE IF NOT EXISTS onboarding_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            task TEXT,
            is_completed BOOLEAN DEFAULT 0,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        )`);

        // --- Helpdesk Tickets ---
        await run(`CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            category TEXT,
            priority TEXT,
            subject TEXT,
            description TEXT,
            status TEXT DEFAULT 'Open',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        )`);

        // --- Shifts & Roster ---
        await run(`CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, -- General, Morning, Night
            start_time TEXT, -- HH:MM
            end_time TEXT -- HH:MM
        )`);

        await run(`CREATE TABLE IF NOT EXISTS employee_shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            shift_id INTEGER,
            date DATE, -- YYYY-MM-DD
            UNIQUE(employee_id, date),
            FOREIGN KEY(employee_id) REFERENCES employees(id),
            FOREIGN KEY(shift_id) REFERENCES shifts(id)
        )`);

        // --- Performance Reviews ---
        await run(`CREATE TABLE IF NOT EXISTS performance_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            review_period TEXT, -- e.g. "2024-Q1"
            status TEXT DEFAULT 'Draft', -- Draft, Submitted, Reviewed
            self_rating INTEGER, -- 1-5
            self_comments TEXT,
            manager_rating INTEGER, -- 1-5
            manager_comments TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        )`);

        // Companies & Branches (for multi-entity support)
        await run(`CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            logo TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Ensure Extended Company Columns
        const compCols = [
            'code', 'est_date', 'business_type', 'address2', 'address3', 'city', 'state', 'pin',
            'phone2', 'email', 'website',
            'pan', 'tan', 'gst', 'cin', 'pt_reg', 'lwf_reg',
            'pf_code', 'pf_dbfile', 'pf_est', 'pf_ext', 'pf_signatory',
            'esi_code', 'esi_office', 'esi_signatory',
            'tax_circle', 'tax_cit',
            'bank_name', 'bank_branch', 'bank_account', 'bank_ifsc', 'bank_cheque_label',
            'director1_name', 'director1_designation', 'director1_father',
            'director2_name', 'director2_designation', 'director2_father'
        ];
        for (const col of compCols) {
            await ensureColumn("companies", col, "TEXT");
        }

        await run(`CREATE TABLE IF NOT EXISTS branches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER,
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(company_id) REFERENCES companies(id)
        )`);

        await run(`CREATE TABLE IF NOT EXISTS payroll_months (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            status TEXT CHECK(status IN ('Open','Closed')) DEFAULT 'Open',
            locked INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(year, month)
        )`);

        // Shifts & Attendance extras
        await run(`CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            grace_period_mins INTEGER DEFAULT 15,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        await ensureColumn("attendance", "shift_id", "INTEGER");
        await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON attendance(employee_id, date)`);
        await ensureColumn("attendance", "overtime_hours", "REAL DEFAULT 0");

        // --- Settings Table ---
        await run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // Ensure employees table has PF/ESI/UAN/company/branch columns for older DBs
        await ensureColumn("employees", "pf_number", "TEXT");
        await ensureColumn("employees", "esi_number", "TEXT");
        await ensureColumn("employees", "uan", "TEXT");
        await ensureColumn("employees", "company_id", "INTEGER");
        await ensureColumn("employees", "branch_id", "INTEGER");
        await ensureColumn("employees", "pf_rate", "REAL DEFAULT 12");
        await ensureColumn("employees", "esi_rate", "REAL DEFAULT 0");
        await ensureColumn("employees", "payment_mode", "TEXT DEFAULT 'Bank'");

        // Ensure extra columns for migration safety
        await ensureColumn("employees", "blood_group", "TEXT");
        await ensureColumn("employees", "emergency_contact_name", "TEXT");
        await ensureColumn("employees", "emergency_contact_phone", "TEXT");
        await ensureColumn("employees", "da_rate", "REAL DEFAULT 0");
        await ensureColumn("employees", "hra_rate", "REAL DEFAULT 0");
        await ensureColumn("employees", "conveyance_allowance", "REAL DEFAULT 0");
        await ensureColumn("employees", "medical_allowance", "REAL DEFAULT 0");
        await ensureColumn("employees", "special_allowance_fixed", "REAL DEFAULT 0");

        // --- Meta Table for Migrations ---
        await run(`CREATE TABLE IF NOT EXISTS db_meta (
            key TEXT PRIMARY KEY,
            value TEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // --- Migration: Remove Constraints (Email/Phone) ---
        try {
            const migrationKey = 'migration_relax_constraints_v1';
            const applied = await dbManager.get("SELECT key FROM db_meta WHERE key = ?", [migrationKey]);

            if (!applied) {
                console.log("[Migration] Applying strict constraint removal...");
                await run("BEGIN TRANSACTION");

                // 1. Rename Old
                await run("ALTER TABLE employees RENAME TO employees_old");

                // 2. Create New (No UNIQUE/NOT NULL on email/phone)
                await run(`CREATE TABLE employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    first_name TEXT,
                    last_name TEXT,
                    email TEXT,
                    phone TEXT,
                    company_id INTEGER,
                    branch_id INTEGER,
                    department_id INTEGER,
                    position_id INTEGER,
                    date_of_joining DATE,
                    status TEXT DEFAULT 'Active',
                    gender TEXT,
                    dob DATE,
                    address TEXT,
                    city TEXT,
                    state TEXT,
                    zip_code TEXT,
                    bank_name TEXT,
                    account_number TEXT,
                    ifsc_code TEXT,
                    base_salary REAL DEFAULT 0,
                    pf_number TEXT,
                    esi_number TEXT,
                    uan TEXT,
                    pf_rate REAL DEFAULT 12,
                    esi_rate REAL DEFAULT 0,
                    payment_mode TEXT DEFAULT 'Bank',
                    exit_date DATE,
                    father_name TEXT,
                    pan_number TEXT,
                    aadhaar_number TEXT,
                    blood_group TEXT,
                    emergency_contact_name TEXT,
                    emergency_contact_phone TEXT,
                    da_rate REAL DEFAULT 0,
                    hra_rate REAL DEFAULT 0,
                    conveyance_allowance REAL DEFAULT 0,
                    medical_allowance REAL DEFAULT 0,
                    special_allowance_fixed REAL DEFAULT 0,
                    salary_from DATE,
                    pf_limit_enabled BOOLEAN DEFAULT 1,
                    pf_limit REAL DEFAULT 15000,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(department_id) REFERENCES departments(id),
                    FOREIGN KEY(position_id) REFERENCES positions(id),
                    FOREIGN KEY(company_id) REFERENCES companies(id),
                    FOREIGN KEY(branch_id) REFERENCES branches(id)
                )`);

                // 3. Copy Data
                const cols = [
                    'id', 'first_name', 'last_name', 'email', 'phone',
                    'company_id', 'branch_id', 'department_id', 'position_id',
                    'date_of_joining', 'status', 'gender', 'dob', 'address',
                    'city', 'state', 'zip_code', 'bank_name', 'account_number',
                    'ifsc_code', 'base_salary', 'pf_number', 'esi_number', 'uan',
                    'pf_rate', 'esi_rate', 'payment_mode', 'exit_date',
                    'father_name', 'pan_number', 'aadhaar_number', 'blood_group',
                    'emergency_contact_name', 'emergency_contact_phone',
                    'da_rate', 'hra_rate', 'conveyance_allowance', 'medical_allowance',
                    'special_allowance_fixed', 'salary_from', 'pf_limit_enabled', 'pf_limit', 'created_at'
                ];
                // Note: We hope valid columns exist. ensuring previous steps ensured them.
                const colStr = cols.join(', ');
                await run(`INSERT INTO employees (${colStr}) SELECT ${colStr} FROM employees_old`);

                // 4. Cleanup & Mark Done
                await run("DROP TABLE employees_old");
                await run("INSERT INTO db_meta (key, value) VALUES (?, 'applied')", [migrationKey]);
                await run("COMMIT");
                console.log("[Migration] Constraints removed and flagged.");
            }
        } catch (e) {
            console.error("[Migration] Failed:", e);
            await run("ROLLBACK");
        }

        // --- Migration V2: Retry Constraint Removal (Force) ---
        try {
            const migrationKey = 'migration_relax_constraints_v2';
            const applied = await dbManager.get("SELECT key FROM db_meta WHERE key = ?", [migrationKey]);

            if (!applied) {
                console.log("[Migration V2] Forcing constraint removal...");
                await run("BEGIN TRANSACTION");

                // Rename checking if it exists
                // We assume 'employees' exists.
                await run("ALTER TABLE employees RENAME TO employees_v2_temp");

                // Create New (Explicitly TEXT without UNIQUE)
                await run(`CREATE TABLE employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    first_name TEXT,
                    last_name TEXT,
                    email TEXT,
                    phone TEXT,
                    company_id INTEGER,
                    branch_id INTEGER,
                    department_id INTEGER,
                    position_id INTEGER,
                    date_of_joining DATE,
                    status TEXT DEFAULT 'Active',
                    gender TEXT,
                    dob DATE,
                    address TEXT,
                    city TEXT,
                    state TEXT,
                    zip_code TEXT,
                    bank_name TEXT,
                    account_number TEXT,
                    ifsc_code TEXT,
                    base_salary REAL DEFAULT 0,
                    pf_number TEXT,
                    esi_number TEXT,
                    uan TEXT,
                    pf_rate REAL DEFAULT 12,
                    esi_rate REAL DEFAULT 0,
                    is_pf_enabled BOOLEAN DEFAULT 1,
                    is_esi_enabled BOOLEAN DEFAULT 0,
                    payment_mode TEXT DEFAULT 'Bank',
                    exit_date DATE,
                    father_name TEXT,
                    pan_number TEXT,
                    aadhaar_number TEXT,
                    blood_group TEXT,
                    emergency_contact_name TEXT,
                    emergency_contact_phone TEXT,
                    da_rate REAL DEFAULT 0,
                    hra_rate REAL DEFAULT 0,
                    conveyance_allowance REAL DEFAULT 0,
                    medical_allowance REAL DEFAULT 0,
                    special_allowance_fixed REAL DEFAULT 0,
                    salary_from DATE,
                    pf_limit_enabled BOOLEAN DEFAULT 1,
                    pf_limit REAL DEFAULT 15000,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(department_id) REFERENCES departments(id),
                    FOREIGN KEY(position_id) REFERENCES positions(id),
                    FOREIGN KEY(company_id) REFERENCES companies(id),
                    FOREIGN KEY(branch_id) REFERENCES branches(id)
                )`);

                // Copy Data
                const cols = [
                    'id', 'first_name', 'last_name', 'email', 'phone',
                    'company_id', 'branch_id', 'department_id', 'position_id',
                    'date_of_joining', 'status', 'gender', 'dob', 'address',
                    'city', 'state', 'zip_code', 'bank_name', 'account_number',
                    'ifsc_code', 'base_salary', 'pf_number', 'esi_number', 'uan',
                    'pf_rate', 'esi_rate', 'payment_mode', 'exit_date',
                    'father_name', 'pan_number', 'aadhaar_number', 'blood_group',
                    'emergency_contact_name', 'emergency_contact_phone',
                    'da_rate', 'hra_rate', 'conveyance_allowance', 'medical_allowance',
                    'special_allowance_fixed', 'salary_from', 'pf_limit_enabled', 'pf_limit', 'created_at'
                ];
                const colStr = cols.join(', ');
                await run(`INSERT INTO employees (${colStr}) SELECT ${colStr} FROM employees_v2_temp`);

                await run("DROP TABLE employees_v2_temp");
                await run("INSERT INTO db_meta (key, value) VALUES (?, 'applied')", [migrationKey]);
                await run("COMMIT");
                console.log("[Migration V2] Success.");
            } else {
                console.log("[Migration V2] Already applied.");
            }
        } catch (e) {
            console.error("[Migration V2] Failed:", e);
            await run("ROLLBACK");
        }

        // Final Guarantee: Ensure PF/ESI Columns exist (in case migration wiped them)
        await ensureColumn("employees", "is_pf_enabled", "BOOLEAN DEFAULT 1");
        await ensureColumn("employees", "is_esi_enabled", "BOOLEAN DEFAULT 0");
        await ensureColumn("employees", "pf_limit_enabled", "BOOLEAN DEFAULT 1");
        await ensureColumn("employees", "pf_limit", "REAL DEFAULT 15000");

        // --- CompuPay Parity: Employee Category ---
        await run(`CREATE TABLE IF NOT EXISTS employee_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            company_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        await ensureColumn("employees", "category_id", "INTEGER");

        // --- CompuPay Parity: Loan Setup ---
        await run(`CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            loan_type TEXT DEFAULT 'General',
            principal_amount REAL DEFAULT 0,
            monthly_emi REAL DEFAULT 0,
            start_date DATE,
            balance REAL DEFAULT 0,
            status TEXT DEFAULT 'Active',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        )`);

        // --- CompuPay Parity: User Defined Deduction ---
        await run(`CREATE TABLE IF NOT EXISTS user_defined_deductions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT,
            calc_type TEXT DEFAULT 'Fixed',
            amount REAL DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            company_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // --- CompuPay Parity: Designation LWF/PT, Probation ---
        await ensureColumn("positions", "lwf_category", "TEXT");
        await ensureColumn("positions", "deduct_pt", "BOOLEAN DEFAULT 1");
        await ensureColumn("positions", "probation_period_days", "INTEGER DEFAULT 90");

        // --- CompuPay Parity: Employee probation/wage-basis ---
        await ensureColumn("employees", "wage_basis", "TEXT DEFAULT 'Monthly'");
        await ensureColumn("employees", "is_confirmed", "BOOLEAN DEFAULT 0");
        await ensureColumn("employees", "probation_end_date", "DATE");
        await ensureColumn("employees", "vpf_percent", "REAL DEFAULT 0");

        // --- CompuPay Parity: Payroll VPF & Loan deduction ---
        await ensureColumn("payroll", "vpf_percent", "REAL DEFAULT 0");
        await ensureColumn("payroll", "vpf_amount", "REAL DEFAULT 0");
        await ensureColumn("payroll", "loan_deduction", "REAL DEFAULT 0");
        await ensureColumn("payroll", "user_defined_deduction", "REAL DEFAULT 0");
        await ensureColumn("payroll", "tds_transferred", "BOOLEAN DEFAULT 0");

        // --- CompuPay Parity: Attendance source ---
        await ensureColumn("attendance", "source", "TEXT DEFAULT 'Manual'");

        console.log("Schema Extended Successfully");
    })();



    ipcMain.handle('get-jobs', async () => await dbManager.all("SELECT j.*, d.name as department_name FROM jobs j LEFT JOIN departments d ON j.department_id = d.id ORDER BY j.created_at DESC"));
    ipcMain.handle('add-job', async (e, d) => await dbManager.run("INSERT INTO jobs (title, department_id, description) VALUES (?,?,?)", [d.title, d.department_id, d.description]));
    ipcMain.handle('update-job-status', async (e, { id, status }) => await dbManager.run("UPDATE jobs SET status=? WHERE id=?", [status, id]));
    ipcMain.handle('delete-job', requireAdmin(async (e, id) => await dbManager.run("DELETE FROM jobs WHERE id=?", [id])));

    ipcMain.handle('get-candidates', async () => await dbManager.all("SELECT c.*, j.title as job_title FROM candidates c LEFT JOIN jobs j ON c.job_id = j.id ORDER BY c.created_at DESC"));
    ipcMain.handle('add-candidate', async (e, d) => await dbManager.run("INSERT INTO candidates (job_id, name, email, phone, notes, resume_path) VALUES (?,?,?,?,?,?)", [d.job_id, d.name, d.email, d.phone, d.notes, d.resume_path]));
    ipcMain.handle('update-candidate-status', async (e, { id, status }) => await dbManager.run("UPDATE candidates SET status=? WHERE id=?", [status, id]));

    // Onboarding
    ipcMain.handle('get-onboarding-tasks', async (e, empId) => await dbManager.all("SELECT * FROM onboarding_tasks WHERE employee_id=?", [empId]));
    ipcMain.handle('add-onboarding-task', async (e, d) => await dbManager.run("INSERT INTO onboarding_tasks (employee_id, task) VALUES (?,?)", [d.employee_id, d.task]));
    ipcMain.handle('toggle-onboarding-task', async (e, { id, val }) => await dbManager.run("UPDATE onboarding_tasks SET is_completed=? WHERE id=?", [val, id]));

    // --- Auth ---
    ipcMain.handle('login', async (event, { username, password }) => {
        console.log(`[LOGIN ATTEMPT] Username: ${username}`);
        const user = await dbManager.get("SELECT * FROM users WHERE username = ?", [username]);
        if (!user || !verifyPassword(password, user.password)) throw new Error("Invalid credentials");
        session.set(user);
        console.log(`[LOGIN SUCCESS] Username: ${username}, Role: ${user.role}`);
        return { success: true, role: user.role, username: user.username, id: user.id, employee_id: user.employee_id };
    });

    ipcMain.handle('logout', async () => {
        session.clear();
        return { success: true };
    });

    ipcMain.handle('get-session', async () => {
        return session.get();
    });

    // --- Admin & Backup ---
    ipcMain.handle('update-admin-profile', requireAdmin(async (event, { id, username, newPassword }) => {
        if (newPassword) await dbManager.run("UPDATE users SET username = ?, password = ? WHERE id = ?", [username, hashPassword(newPassword), id]);
        else await dbManager.run("UPDATE users SET username = ? WHERE id = ?", [username, id]);
        return { success: true };
    }));
    ipcMain.handle('backup-database', requireAdmin(async (e, { password, full = false } = {}) => {
        const dbPath = path.join(app.getAppPath(), 'database.sqlite');
        const uploadsDir = path.join(app.getAppPath(), 'uploads');
        
        const filters = [
            { name: 'SQLite Database', extensions: ['sqlite'] },
            { name: 'Full Backup (ZIP)', extensions: ['zip'] }
        ];
        if (password) filters.unshift({ name: 'Encrypted Backup', extensions: ['enc'] });

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Backup Data',
            defaultPath: `hrms_backup_${new Date().toISOString().split('T')[0]}.${full ? 'zip' : (password ? 'enc' : 'sqlite')}`,
            filters
        });

        if (canceled) return { success: false };
        try {
            if (full || filePath.endsWith('.zip')) {
                const zip = new AdmZip();
                if (fs.existsSync(dbPath)) zip.addLocalFile(dbPath);
                if (fs.existsSync(uploadsDir)) zip.addLocalFolder(uploadsDir, 'uploads');
                zip.writeZip(filePath);
                return { success: true, path: filePath, full: true };
            } else if (password || filePath.endsWith('.enc')) {
                // simple AES encryption
                const crypto = require('crypto');
                const algorithm = 'aes-256-ctr';
                const key = crypto.createHash('sha256').update(String(password)).digest('base64').substr(0, 32);
                const iv = crypto.randomBytes(16);

                const input = fs.createReadStream(dbPath);
                const output = fs.createWriteStream(filePath);
                const cipher = crypto.createCipheriv(algorithm, key, iv);

                await new Promise((resolve, reject) => {
                    output.on('finish', resolve);
                    output.on('error', reject);
                    input.on('error', reject);
                    cipher.on('error', reject);
                    output.write(iv, (err) => { // Save IV at beginning
                        if (err) return reject(err);
                        input.pipe(cipher).pipe(output);
                    });
                });

                return { success: true, path: filePath, encrypted: true };
            } else {
                fs.copyFileSync(dbPath, filePath);
                return { success: true, path: filePath };
            }
        } catch (e) { throw new Error(e.message); }
    }));
    ipcMain.handle('restore-database', requireAdmin(async (e, password) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({ 
            properties: ['openFile'], 
            filters: [{ name: 'Backup Files', extensions: ['sqlite', 'enc', 'zip'] }] 
        });
        if (canceled) return { success: false };

        try {
            const srcPath = filePaths[0];
            const isEnc = srcPath.endsWith('.enc');
            const isZip = srcPath.endsWith('.zip');

            await dbManager.close();
            await new Promise(r => setTimeout(r, 500));

            const dbDest = path.join(app.getAppPath(), 'database.sqlite');
            const uploadsDest = path.join(app.getAppPath(), 'uploads');

            if (isZip) {
                const zip = new AdmZip(srcPath);
                const entries = zip.getEntries();
                
                // Extract DB
                const dbEntry = entries.find(e => e.entryName === 'database.sqlite');
                if (dbEntry) {
                    fs.writeFileSync(dbDest, dbEntry.getData());
                }

                // Extract Uploads
                const uploadsPrefix = 'uploads/';
                entries.forEach(entry => {
                    if (entry.entryName.startsWith(uploadsPrefix)) {
                        const relativePath = entry.entryName.substring(uploadsPrefix.length);
                        if (relativePath) {
                            const targetPath = path.join(uploadsDest, relativePath);
                            if (entry.isDirectory) {
                                if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
                            } else {
                                const dir = path.dirname(targetPath);
                                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                                fs.writeFileSync(targetPath, entry.getData());
                            }
                        }
                    }
                });
            } else if (isEnc) {
                if (!password) throw new Error("Password required for encrypted backup");

                const crypto = require('crypto');
                const algorithm = 'aes-256-ctr';
                const key = crypto.createHash('sha256').update(String(password)).digest('base64').substr(0, 32);

                const fd = fs.openSync(srcPath, 'r');
                const iv = Buffer.alloc(16);
                fs.readSync(fd, iv, 0, 16, 0); // Read IV
                fs.closeSync(fd);

                const input = fs.createReadStream(srcPath, { start: 16 });
                const output = fs.createWriteStream(dbDest);
                const decipher = crypto.createDecipheriv(algorithm, key, iv);

                await new Promise((resolve, reject) => {
                    input.pipe(decipher).pipe(output).on('finish', resolve).on('error', reject);
                });

            } else {
                fs.copyFileSync(srcPath, dbDest);
            }
            dbManager.connect();
            return { success: true };
        } catch (e) { try { dbManager.connect(); } catch (z) { } throw e; }
    }));

    ipcMain.handle('select-backup-folder', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Backup Location'
        });
        if (canceled) return null;
        return filePaths[0];
    });

    // --- Dashboard Stats (Aggregated) ---
    ipcMain.handle('get-dashboard-stats', async () => {
        const totalEmployees = (await dbManager.get("SELECT count(*) as c FROM employees")).c;
        const departments = (await dbManager.get("SELECT count(*) as c FROM departments")).c;

        // Present Today
        const today = new Date().toISOString().split('T')[0];
        const presentToday = (await dbManager.get("SELECT count(*) as c FROM attendance WHERE date = ? AND status = 'Present'", [today])).c;

        // Dept Distribution
        const deptDist = await dbManager.all(`
            SELECT d.name, count(e.id) as count 
            FROM departments d 
            LEFT JOIN employees e ON d.id = e.department_id 
            GROUP BY d.id
        `);

        // Recent Activity (New Hires)
        const recentHires = await dbManager.all("SELECT first_name, last_name, date_of_joining FROM employees ORDER BY id DESC LIMIT 5");

        // Upcoming Birthdays
        const currentMonth = new Date().getMonth() + 1;
        const upcomingBirthdays = await dbManager.all(`
            SELECT first_name, last_name, dob 
            FROM employees 
            WHERE strftime('%m', dob) = ? OR strftime('%m', dob) = ?
            ORDER BY strftime('%m', dob), strftime('%d', dob) 
            LIMIT 5
        `, [
            String(currentMonth).padStart(2, '0'),
            String(currentMonth + 1).padStart(2, '0')
        ]);

        return {
            totalEmployees,
            departments,
            presentToday,
            deptDist,
            recentHires,
            upcomingBirthdays
        };
    });

    // --- Module Specific Stats ---
    ipcMain.handle('get-employee-stats', async () => {
        const byDept = await dbManager.all("SELECT d.name, count(e.id) as count FROM employees e LEFT JOIN departments d ON e.department_id = d.id GROUP BY d.name");
        const byStatus = await dbManager.all("SELECT status, count(*) as count FROM employees GROUP BY status");
        return { byDept, byStatus };
    });

    ipcMain.handle('get-attendance-stats', async () => {
        // Stats for Current Month
        const total = await dbManager.all("SELECT status, count(*) as count FROM attendance WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now') GROUP BY status");
        const today = await dbManager.all("SELECT status, count(*) as count FROM attendance WHERE date = date('now') GROUP BY status");
        return { monthly: total, daily: today };
    });

    ipcMain.handle('get-leave-stats', async () => {
        const status = await dbManager.all("SELECT status, count(*) as count FROM leaves GROUP BY status");
        const types = await dbManager.all("SELECT leave_type, count(*) as count FROM leaves GROUP BY leave_type");
        return { status, types };
    });

    ipcMain.handle('get-payroll-stats', async () => {
        const trend = await dbManager.all("SELECT strftime('%Y-%m', payment_date) as month, sum(net_salary) as total FROM payroll GROUP BY month ORDER BY month DESC LIMIT 6");
        return { trend };
    });

    // --- Analytics Dashboard ---
    ipcMain.handle('get-analytics-data', async () => {
        // 1. Headcount by Department
        const headcountByDept = await dbManager.all("SELECT d.name, count(e.id) as count FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.status='Active' GROUP BY d.name");

        // 2. Headcount by Gender
        const headcountByGender = await dbManager.all("SELECT gender, count(*) as count FROM employees WHERE status='Active' GROUP BY gender");

        // 3. Attrition (Terminated employees by month)
        const attritionTrend = await dbManager.all(`
            SELECT strftime('%Y-%m', exit_date) as month, count(*) as count 
            FROM employees 
            WHERE status='Terminated' AND exit_date IS NOT NULL 
            GROUP BY month 
            ORDER BY month DESC 
            LIMIT 6
        `);

        // 4. Payroll Cost Trend (Last 6 months)
        const payrollTrend = await dbManager.all(`
            SELECT strftime('%Y-%m', payment_date) as month, sum(net_salary) as total 
            FROM payroll 
            GROUP BY month 
            ORDER BY month ASC 
            LIMIT 6
        `);

        // 5. Attendance Heatmap (Who is frequently absent/late?)
        // Top 5 employees with most 'Absent' or 'Late' status in last 30 days
        const attendanceRisk = await dbManager.all(`
            SELECT e.first_name, e.last_name, 
                   count(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count,
                   count(CASE WHEN a.status = 'Late' THEN 1 END) as late_count
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE a.date >= date('now', '-30 days')
            GROUP BY e.id
            HAVING absent_count > 0 OR late_count > 0
            ORDER BY (absent_count + late_count) DESC
            LIMIT 5
        `);

        return { headcountByDept, headcountByGender, attritionTrend, payrollTrend, attendanceRisk };
    });

    // --- Settings Generic ---
    ipcMain.handle('save-setting', async (e, { key, value }) => {
        await dbManager.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
        return { success: true };
    });

    // --- Salary Heads Configuration ---
    // (Removed duplicate handler: get-salary-heads)


    ipcMain.handle('save-salary-heads', async (event, { updates }) => {
        // updates is array of objects
        let changed = 0;
        for (const item of updates) {
            if (item.id) {
                // Update
                await dbManager.run(
                    `UPDATE salary_heads SET 
                        name=?, code=?, form_16_type=?, is_proportionate=?, 
                        consider_for_pf=?, consider_for_esi=?, consider_for_bonus=?, consider_for_overtime=?, is_active=?
                     WHERE id=?`,
                    [item.name, item.code, item.form_16_type, item.is_proportionate ? 1 : 0,
                    item.consider_for_pf ? 1 : 0, item.consider_for_esi ? 1 : 0, item.consider_for_bonus ? 1 : 0, item.consider_for_overtime ? 1 : 0, item.is_active ? 1 : 0,
                    item.id]
                );
                changed++;
            } else {
                // Insert New (if we allow adding new rows via this API)
                await dbManager.run(
                    `INSERT INTO salary_heads (company_id, name, code, type, form_16_type, is_proportionate, consider_for_pf, consider_for_esi, consider_for_bonus, consider_for_overtime, is_active) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [item.company_id, item.name, item.code, item.type || 'Earning', item.form_16_type,
                    item.is_proportionate ? 1 : 0, item.consider_for_pf ? 1 : 0, item.consider_for_esi ? 1 : 0, item.consider_for_bonus ? 1 : 0, item.consider_for_overtime ? 1 : 0, item.is_active ? 1 : 0]
                );
                changed++;
            }
        }
        return { success: true, changed };
    });

    // --- Standard Handlers (CRUD) ---
    // Generic Schema Fixer (Callable from frontend on error or init)
    ipcMain.handle('fix-db-schema', async () => {
        try {
            const ensure = async (table, col, type) => {
                try {
                    // Check if DB is ready
                    if (!dbManager.db) await new Promise(r => setTimeout(r, 1000)); // Wait a bit
                    const cols = await dbManager.all(`PRAGMA table_info(${table})`);
                    if (!cols.some(c => c.name === col)) {
                        await dbManager.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
                        console.log(`[Fix] Added ${col} to ${table}`);
                    }
                } catch (e) { console.error(e); }
            };
            await ensure("employees", "employee_code", "TEXT");
            await ensure("employees", "exit_date", "DATE");
            await ensure("employees", "is_pf_enabled", "BOOLEAN DEFAULT 1");
            await ensure("employees", "is_esi_enabled", "BOOLEAN DEFAULT 0");
            await ensure("employees", "is_pt_enabled", "BOOLEAN DEFAULT 1");
            await ensure("employees", "is_transfer_eligible", "BOOLEAN DEFAULT 0");
            await ensure("employees", "transfer_date", "DATE");
            await ensure("employees", "photo", "TEXT");
            return { success: true };
        } catch (e) {
            console.error("Schema Fix Failed", e);
            return { success: false, error: e.message };
        }
    });

    // Employees
    ipcMain.handle('get-employees', async (event, { page = 1, limit = 50, search = '', companyId = null, branchId = null } = {}) => {
        const offset = (page - 1) * limit;
        let conditions = [];
        let params = [];

        if (search) {
            conditions.push("(e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ?)");
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (companyId) {
            conditions.push("e.company_id = ?");
            params.push(companyId);
        }
        if (branchId) {
            conditions.push("e.branch_id = ?");
            params.push(branchId);
        }

        const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

        const countResult = await dbManager.get(`SELECT count(*) as count FROM employees e ${where}`, params);
        const total = countResult ? countResult.count : 0;

        const rows = await dbManager.all(
            `SELECT e.*, d.name as department_name, p.title as position_title, c.name as company_name, b.name as branch_name 
             FROM employees e 
             LEFT JOIN departments d ON e.department_id = d.id 
             LEFT JOIN positions p ON e.position_id = p.id 
             LEFT JOIN companies c ON e.company_id = c.id 
             LEFT JOIN branches b ON e.branch_id = b.id 
             ${where} 
             ORDER BY e.first_name ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return {
            employees: rows,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    });
    ipcMain.handle('add-employee', async (event, e) => {
        // Explicit Validation
        if (!e.first_name || e.first_name.trim() === '') throw new Error("First Name is required.");
        if (!e.last_name || e.last_name.trim() === '') throw new Error("Last Name is required.");

        try {
            return await dbManager.run(
                `INSERT INTO employees (
                    first_name, last_name, employee_code, email, phone, company_id, branch_id, department_id, position_id, date_of_joining, status, 
                    gender, dob, address, city, state, zip_code, bank_name, account_number, ifsc_code, base_salary, 
                    pf_number, esi_number, uan, pf_rate, esi_rate, payment_mode, exit_date, is_pf_enabled, is_esi_enabled, is_pt_enabled,
                    father_name, pan_number, aadhaar_number, blood_group, emergency_contact_name, emergency_contact_phone,
                    da_rate, hra_rate, conveyance_allowance, medical_allowance, special_allowance_fixed, photo, salary_from, pf_limit_enabled, pf_limit
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    e.first_name, e.last_name, e.employee_code || null, e.email, e.phone, e.company_id || null, e.branch_id || null, e.department_id || null, e.position_id || null, e.date_of_joining || null,
                    e.gender || null, e.dob || null, e.address || null, e.city || null, e.state || null, e.zip_code || null, e.bank_name || null, e.account_number || null, e.ifsc_code || null, e.base_salary || 0,
                    e.pf_number || null, e.esi_number || null, e.uan || null, e.pf_rate || 12, e.esi_rate || 0, e.payment_mode || 'Bank', null, (e.is_pf_enabled !== false ? 1 : 0), (e.is_esi_enabled ? 1 : 0), (e.is_pt_enabled !== false ? 1 : 0),
                    e.father_name || null, e.pan_number || null, e.aadhaar_number || null, e.blood_group || null, e.emergency_contact_name || null, e.emergency_contact_phone || null,
                    e.da_rate || 0, e.hra_rate || 0, e.conveyance_allowance || 0, e.medical_allowance || 0, e.special_allowance_fixed || 0, e.photo || null, e.salary_from || null,
                    (e.pf_limit_enabled !== false ? 1 : 0), e.pf_limit || 15000
                ]
            );
        } catch (err) {
            console.error(err);
            throw new Error('Failed to add employee: ' + err.message);
        }
    });

    ipcMain.handle('update-employee', async (event, e) => {
        // Explicit Validation
        if (!e.first_name || e.first_name === '') throw new Error("First Name is required.");
        if (!e.last_name || e.last_name === '') throw new Error("Last Name is required.");

        try {
            return await dbManager.run(
                `UPDATE employees SET 
                    first_name=?, last_name=?, employee_code=?, email=?, phone=?, company_id=?, branch_id=?, department_id=?, position_id=?, date_of_joining=?, status=?, 
                    gender=?, dob=?, address=?, city=?, state=?, zip_code=?, bank_name=?, account_number=?, ifsc_code=?, base_salary=?, 
                    pf_number=?, esi_number=?, uan=?, pf_rate=?, esi_rate=?, payment_mode=?, exit_date=?, is_pf_enabled=?, is_esi_enabled=?, is_pt_enabled=?,
                    father_name=?, pan_number=?, aadhaar_number=?, blood_group=?, emergency_contact_name=?, emergency_contact_phone=?,
                    da_rate=?, hra_rate=?, conveyance_allowance=?, medical_allowance=?, special_allowance_fixed=?, photo=?, salary_from=?, pf_limit_enabled=?, pf_limit=?
                WHERE id=?`,
                [
                    e.first_name, e.last_name, e.employee_code || null, e.email, e.phone, e.company_id || null, e.branch_id || null, e.department_id || null, e.position_id || null, e.date_of_joining || null, e.status || 'Active',
                    e.gender || null, e.dob || null, e.address || null, e.city || null, e.state || null, e.zip_code || null, e.bank_name || null, e.account_number || null, e.ifsc_code || null, e.base_salary || 0,
                    e.pf_number || null, e.esi_number || null, e.uan || null, e.pf_rate || 12, e.esi_rate || 0, e.payment_mode || 'Bank', e.exit_date || null, (e.is_pf_enabled !== false ? 1 : 0), (e.is_esi_enabled ? 1 : 0), (e.is_pt_enabled !== false ? 1 : 0),
                    e.father_name || null, e.pan_number || null, e.aadhaar_number || null, e.blood_group || null, e.emergency_contact_name || null, e.emergency_contact_phone || null,
                    e.da_rate || 0, e.hra_rate || 0, e.conveyance_allowance || 0, e.medical_allowance || 0, e.special_allowance_fixed || 0, e.photo || null, e.salary_from || null,
                    (e.pf_limit_enabled !== false ? 1 : 0), e.pf_limit || 15000,
                    e.id
                ]
            );
        } catch (err) {
            console.error(err);
            throw new Error('Failed to update employee: ' + err.message);
        }
    });
    ipcMain.handle('update-employee-bulk', async (event, employees) => {
        const tx = await dbManager.run('BEGIN TRANSACTION');
        try {
            for (const e of employees) {
                const keys = Object.keys(e).filter(k => k !== 'id');
                if (keys.length === 0) continue;

                const setClause = keys.map(k => `${k}=?`).join(', ');
                const values = keys.map(k => e[k]);

                await dbManager.run(`UPDATE employees SET ${setClause} WHERE id=?`, [...values, e.id]);
            }
            await dbManager.run('COMMIT');
            return { success: true };
        } catch (err) {
            await dbManager.run('ROLLBACK');
            console.error(err);
            throw new Error('Bulk update failed: ' + err.message);
        }
    });

    ipcMain.handle('delete-employee', requireAdmin(async (event, id) => {
        const docs = await dbManager.all("SELECT file_path FROM documents WHERE employee_id=?", [id]);

        await dbManager.run('BEGIN TRANSACTION');
        try {
            await dbManager.run("DELETE FROM attendance WHERE employee_id=?", [id]);
            await dbManager.run("DELETE FROM leaves WHERE employee_id=?", [id]);
            await dbManager.run("DELETE FROM leave_balances WHERE employee_id=?", [id]);
            await dbManager.run("DELETE FROM payroll WHERE employee_id=?", [id]);
            await dbManager.run("DELETE FROM documents WHERE employee_id=?", [id]);
            await dbManager.run("DELETE FROM onboarding_tasks WHERE employee_id=?", [id]);
            await dbManager.run("DELETE FROM employee_shifts WHERE employee_id=?", [id]);
            await dbManager.run("DELETE FROM performance_reviews WHERE employee_id=?", [id]);
            await dbManager.run("UPDATE tickets SET employee_id=NULL WHERE employee_id=?", [id]);
            await dbManager.run("UPDATE assets SET assigned_to=NULL, status='Available' WHERE assigned_to=?", [id]);
            await dbManager.run("UPDATE users SET employee_id=NULL WHERE employee_id=?", [id]);
            await dbManager.run("DELETE FROM employees WHERE id=?", [id]);
            await dbManager.run('COMMIT');
        } catch (err) {
            await dbManager.run('ROLLBACK');
            throw new Error('Delete failed: ' + err.message);
        }

        // Best-effort cleanup of uploaded files; DB rows are already gone either way.
        for (const doc of docs) {
            try {
                if (doc.file_path && fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path);
            } catch (e) { console.error('Failed to remove document file', doc.file_path, e.message); }
        }

        return { success: true };
    }));

    // Depts & Pos
    ipcMain.handle('get-departments', async () => await dbManager.all("SELECT * FROM departments"));
    ipcMain.handle('add-department', async (event, d) => await dbManager.run("INSERT INTO departments (name, description) VALUES (?, ?)", [d.name, d.description]));
    ipcMain.handle('delete-department', requireAdmin(async (event, id) => await dbManager.run("DELETE FROM departments WHERE id=?", [id])));

    // --- Employee Categories ---
    ipcMain.handle('get-categories', async () => await dbManager.all("SELECT * FROM employee_categories ORDER BY name"));
    ipcMain.handle('add-category', async (e, d) => await dbManager.run("INSERT INTO employee_categories (name, description, company_id) VALUES (?,?,?)", [d.name, d.description || null, d.company_id || null]));
    ipcMain.handle('update-category', async (e, d) => await dbManager.run("UPDATE employee_categories SET name=?, description=? WHERE id=?", [d.name, d.description || null, d.id]));
    ipcMain.handle('delete-category', requireAdmin(async (e, id) => await dbManager.run("DELETE FROM employee_categories WHERE id=?", [id])));

    // --- Loan Setup ---
    ipcMain.handle('get-loans', async (e, employeeId) => {
        if (employeeId) return await dbManager.all("SELECT l.*, emp.first_name, emp.last_name FROM loans l LEFT JOIN employees emp ON l.employee_id = emp.id WHERE l.employee_id=? ORDER BY l.created_at DESC", [employeeId]);
        return await dbManager.all("SELECT l.*, emp.first_name, emp.last_name FROM loans l LEFT JOIN employees emp ON l.employee_id = emp.id ORDER BY l.created_at DESC");
    });
    ipcMain.handle('add-loan', async (e, d) => await dbManager.run(
        "INSERT INTO loans (employee_id, loan_type, principal_amount, monthly_emi, start_date, balance, status, notes) VALUES (?,?,?,?,?,?,?,?)",
        [d.employee_id, d.loan_type || 'General', d.principal_amount || 0, d.monthly_emi || 0, d.start_date, d.principal_amount || 0, 'Active', d.notes || '']
    ));
    ipcMain.handle('update-loan', async (e, d) => await dbManager.run(
        "UPDATE loans SET loan_type=?, principal_amount=?, monthly_emi=?, start_date=?, balance=?, status=?, notes=? WHERE id=?",
        [d.loan_type, d.principal_amount, d.monthly_emi, d.start_date, d.balance, d.status, d.notes || '', d.id]
    ));
    ipcMain.handle('delete-loan', requireAdmin(async (e, id) => await dbManager.run("DELETE FROM loans WHERE id=?", [id])));
    // Active loan EMI for an employee, used by payroll grid (does not mutate balance; balance is reduced when payroll is saved)
    ipcMain.handle('get-active-loan-emi', async (e, employeeId) => {
        const row = await dbManager.get("SELECT COALESCE(SUM(monthly_emi),0) as emi FROM loans WHERE employee_id=? AND status='Active' AND balance > 0", [employeeId]);
        return row ? row.emi : 0;
    });

    // --- User Defined Deductions ---
    ipcMain.handle('get-user-deductions', async () => await dbManager.all("SELECT * FROM user_defined_deductions ORDER BY name"));
    ipcMain.handle('add-user-deduction', async (e, d) => await dbManager.run(
        "INSERT INTO user_defined_deductions (name, code, calc_type, amount, is_active, company_id) VALUES (?,?,?,?,?,?)",
        [d.name, d.code || '', d.calc_type || 'Fixed', d.amount || 0, d.is_active !== false ? 1 : 0, d.company_id || null]
    ));
    ipcMain.handle('update-user-deduction', async (e, d) => await dbManager.run(
        "UPDATE user_defined_deductions SET name=?, code=?, calc_type=?, amount=?, is_active=? WHERE id=?",
        [d.name, d.code || '', d.calc_type, d.amount, d.is_active !== false ? 1 : 0, d.id]
    ));
    ipcMain.handle('delete-user-deduction', requireAdmin(async (e, id) => await dbManager.run("DELETE FROM user_defined_deductions WHERE id=?", [id])));

    // Positions
    ipcMain.handle('get-positions', async () => await dbManager.all("SELECT * FROM positions"));
    ipcMain.handle('add-position', async (e, d) => await dbManager.run(
        "INSERT INTO positions (title, base_salary, department_id, lwf_category, deduct_pt, probation_period_days) VALUES (?, ?, ?, ?, ?, ?)",
        [d.title, d.base_salary, d.department_id || null, d.lwf_category || null, d.deduct_pt !== false ? 1 : 0, d.probation_period_days || 90]
    ));
    ipcMain.handle('update-position', async (e, d) => await dbManager.run(
        "UPDATE positions SET title=?, base_salary=?, department_id=?, lwf_category=?, deduct_pt=?, probation_period_days=? WHERE id=?",
        [d.title, d.base_salary, d.department_id || null, d.lwf_category || null, d.deduct_pt !== false ? 1 : 0, d.probation_period_days || 90, d.id]
    ));
    ipcMain.handle('delete-position', requireAdmin(async (e, id) => await dbManager.run("DELETE FROM positions WHERE id=?", [id])));

    // Companies & Branches
    // Companies & Branches
    ipcMain.handle('get-companies', async () => await dbManager.all("SELECT * FROM companies ORDER BY name"));

    ipcMain.handle('add-company', async (e, c) => {
        const sql = `INSERT INTO companies (
            code, name, est_date, business_type, 
            address, address2, address3, city, state, pin, 
            phone, phone2, email, website, 
            pan, tan, gst, cin, pt_reg, lwf_reg,
            pf_code, pf_dbfile, pf_est, pf_ext, pf_signatory,
            esi_code, esi_office, esi_signatory,
            tax_circle, tax_cit,
            bank_name, bank_branch, bank_account, bank_ifsc, bank_cheque_label,
            director1_name, director1_designation, director1_father,
            director2_name, director2_designation, director2_father,
            logo
        ) VALUES (${Array(42).fill('?').join(',')})`;

        const params = [
            c.code, c.name, c.est_date, c.business_type,
            c.address, c.address2, c.address3, c.city, c.state, c.pin,
            c.phone, c.phone2, c.email, c.website,
            c.pan, c.tan, c.gst, c.cin, c.pt_reg, c.lwf_reg,
            c.pf_code, c.pf_dbfile, c.pf_est, c.pf_ext, c.pf_signatory,
            c.esi_code, c.esi_office, c.esi_signatory,
            c.tax_circle, c.tax_cit,
            c.bank_name, c.bank_branch, c.bank_account, c.bank_ifsc, c.bank_cheque_label,
            c.director1_name, c.director1_designation, c.director1_father,
            c.director2_name, c.director2_designation, c.director2_father,
            c.logo
        ];
        return await dbManager.run(sql, params);
    });

    ipcMain.handle('update-company', async (e, c) => {
        const sql = `UPDATE companies SET 
            code=?, name=?, est_date=?, business_type=?, 
            address=?, address2=?, address3=?, city=?, state=?, pin=?, 
            phone=?, phone2=?, email=?, website=?, 
            pan=?, tan=?, gst=?, cin=?, pt_reg=?, lwf_reg=?,
            pf_code=?, pf_dbfile=?, pf_est=?, pf_ext=?, pf_signatory=?,
            esi_code=?, esi_office=?, esi_signatory=?,
            tax_circle=?, tax_cit=?,
            bank_name=?, bank_branch=?, bank_account=?, bank_ifsc=?, bank_cheque_label=?,
            director1_name=?, director1_designation=?, director1_father=?,
            director2_name=?, director2_designation=?, director2_father=?,
            logo=?
        WHERE id=?`;

        const params = [
            c.code, c.name, c.est_date, c.business_type,
            c.address, c.address2, c.address3, c.city, c.state, c.pin,
            c.phone, c.phone2, c.email, c.website,
            c.pan, c.tan, c.gst, c.cin, c.pt_reg, c.lwf_reg,
            c.pf_code, c.pf_dbfile, c.pf_est, c.pf_ext, c.pf_signatory,
            c.esi_code, c.esi_office, c.esi_signatory,
            c.tax_circle, c.tax_cit,
            c.bank_name, c.bank_branch, c.bank_account, c.bank_ifsc, c.bank_cheque_label,
            c.director1_name, c.director1_designation, c.director1_father,
            c.director2_name, c.director2_designation, c.director2_father,
            c.logo,
            c.id
        ];
        return await dbManager.run(sql, params);
    });


    ipcMain.handle('delete-company', requireAdmin(async (e, id) => await dbManager.run("DELETE FROM companies WHERE id=?", [id])));

    // Branches
    ipcMain.handle('get-branches', async () => await dbManager.all("SELECT b.*, c.name as company_name FROM branches b LEFT JOIN companies c ON b.company_id = c.id"));
    ipcMain.handle('add-branch', async (e, b) => await dbManager.run("INSERT INTO branches (company_id, name, address) VALUES (?,?,?)", [b.company_id, b.name, b.address]));
    ipcMain.handle('update-branch', async (e, b) => await dbManager.run("UPDATE branches SET company_id=?, name=?, address=? WHERE id=?", [b.company_id, b.name, b.address, b.id]));

    ipcMain.handle('update-branch-bulk', async (event, branches) => {
        const tx = await dbManager.run('BEGIN TRANSACTION');
        try {
            for (const b of branches) {
                await dbManager.run("UPDATE branches SET name=?, company_id=?, address=? WHERE id=?", [b.name, b.company_id || null, b.address || '', b.id]);
            }
            await dbManager.run('COMMIT');
            return { success: true };
        } catch (err) {
            await dbManager.run('ROLLBACK');
            console.error(err);
            throw new Error('Bulk branch update failed');
        }
    });

    ipcMain.handle('delete-branch', requireAdmin(async (e, id) => await dbManager.run("DELETE FROM branches WHERE id=?", [id])));

    // Positions (Bulk handler added here for convenience, though get/add/update is defined earlier, let's consolidate or inject)
    // To avoid scrolling up, I will inject a new handler block for positions bulk here if safe, or find the positions block.
    // The view_file output showed positions block at 927. Let's stick to modifying branches here and then positions separately or risk context errors.
    // Wait, I can't jump around. I will just add update-position-bulk at the end of this block or find the positions block again?
    // Let's add update-position-bulk right here, creating a new block for "Bulk Operations" if needed, or just append it.
    // Actually, IPC handlers can be anywhere.
    ipcMain.handle('update-position-bulk', async (event, positions) => {
        const tx = await dbManager.run('BEGIN TRANSACTION');
        try {
            for (const p of positions) {
                await dbManager.run("UPDATE positions SET title=?, base_salary=? WHERE id=?", [p.title, p.base_salary, p.id]);
            }
            await dbManager.run('COMMIT');
            return { success: true };
        } catch (err) {
            await dbManager.run('ROLLBACK');
            console.error(err);
            throw new Error('Bulk position update failed');
        }
    });



    // Payroll months (open/close)
    ipcMain.handle('get-payroll-months', async () => await dbManager.all("SELECT * FROM payroll_months ORDER BY year DESC, month DESC"));
    ipcMain.handle('create-payroll-month', async (e, { year, month }) => await dbManager.run("INSERT OR IGNORE INTO payroll_months (year, month, status, locked) VALUES (?,?, 'Open', 0)", [year, month]));
    ipcMain.handle('close-payroll-month', async (e, id) => await dbManager.run("UPDATE payroll_months SET status='Closed', locked=1 WHERE id=?", [id]));



    // Attendance CRUD / Import
    ipcMain.handle('get-attendance', async (event, { employeeId = null, companyId = null, page = 1, limit = 50, search = '', date = null, startDate = null, endDate = null } = {}) => {
        const offset = (page - 1) * limit;
        let whereClauses = [];
        let params = [];

        if (employeeId) {
            whereClauses.push("a.employee_id = ?");
            params.push(employeeId);
        }
        if (date) {
            whereClauses.push("a.date = ?");
            params.push(date);
        } else if (startDate && endDate) {
            whereClauses.push("a.date BETWEEN ? AND ?");
            params.push(startDate, endDate);
        }
        if (companyId) {
            whereClauses.push("e.company_id = ?");
            params.push(companyId);
        }
        if (search) {
            whereClauses.push("(e.first_name LIKE ? OR e.last_name LIKE ?)");
            params.push(`% ${search}% `, ` % ${search}% `);
        }

        const whereSQL = whereClauses.length > 0 ? "WHERE " + whereClauses.join(' AND ') : "";

        const countRes = await dbManager.get(`SELECT count(*) as c FROM attendance a LEFT JOIN employees e ON a.employee_id = e.id ${whereSQL} `, params);
        const total = countRes ? countRes.c : 0;

        const rows = await dbManager.all(
            `SELECT a.*, e.first_name, e.last_name 
             FROM attendance a 
             LEFT JOIN employees e ON a.employee_id = e.id 
             ${whereSQL} 
             ORDER BY a.date DESC, e.first_name ASC
    LIMIT ? OFFSET ? `,
            [...params, limit, offset]
        );

        return { data: rows, total, page, totalPages: Math.ceil(total / limit) };
    });
    ipcMain.handle('add-attendance', async (e, d) => await dbManager.run("INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status, shift_id, overtime_hours) VALUES (?,?,?,?,?,?,?)", [d.employee_id, d.date, d.check_in_time || null, d.check_out_time || null, d.status || null, d.shift_id || null, d.overtime_hours || 0]));
    ipcMain.handle('update-attendance', async (e, d) => await dbManager.run("UPDATE attendance SET check_in_time=?, check_out_time=?, status=?, shift_id=?, overtime_hours=? WHERE id=?", [d.check_in_time || null, d.check_out_time || null, d.status || null, d.shift_id || null, d.overtime_hours || 0, d.id]));
    ipcMain.handle('delete-attendance', async (e, id) => await dbManager.run("DELETE FROM attendance WHERE id=?", [id]));
    ipcMain.handle('add-manual-attendance', async (e, d) => {
        const existing = await dbManager.get("SELECT id FROM attendance WHERE employee_id=? AND date=?", [d.employee_id, d.date]);
        if (existing) {
            return await dbManager.run("UPDATE attendance SET check_in_time=?, check_out_time=?, status=?, overtime_hours=? WHERE id=?", [d.check_in_time || null, d.check_out_time || null, d.status, 0, existing.id]);
        } else {
            return await dbManager.run("INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status, overtime_hours) VALUES (?,?,?,?,?,0)", [d.employee_id, d.date, d.check_in_time || null, d.check_out_time || null, d.status]);
        }
    });
    ipcMain.handle('add-attendance-bulk', async (e, rows) => {
        const tx = await dbManager.run('BEGIN TRANSACTION');
        try {
            for (const r of rows) {
                // Safe UPSERT: Updates existing record in place without changing ID or resetting created_at
                await dbManager.run(`
                    INSERT INTO attendance(employee_id, date, check_in_time, check_out_time, status, shift_id, overtime_hours, remarks)
    VALUES(?,?,?,?,?,?,?,?)
                    ON CONFLICT(employee_id, date) DO UPDATE SET
    status = excluded.status,
        check_in_time = COALESCE(excluded.check_in_time, attendance.check_in_time),
        check_out_time = COALESCE(excluded.check_out_time, attendance.check_out_time),
        shift_id = COALESCE(excluded.shift_id, attendance.shift_id),
        overtime_hours = COALESCE(excluded.overtime_hours, attendance.overtime_hours),
        remarks = excluded.remarks
            `, [r.employee_id, r.date, r.check_in_time || null, r.check_out_time || null, r.status || null, r.shift_id || null, r.overtime_hours || 0, r.remarks || null]);
            }
            await dbManager.run('COMMIT');
            return { success: true, processed: rows.length };
        } catch (err) {
            await dbManager.run('ROLLBACK');
            throw err;
        }
    });
    ipcMain.handle('export-attendance', async (e, { year, month }) => {
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const end = `${year}-${String(month).padStart(2, '0')}-31`;
        const rows = await dbManager.all("SELECT a.*, e.first_name || ' ' || e.last_name as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.date BETWEEN ? AND ? ORDER BY a.date, e.first_name", [start, end]);
        return rows;
    });


    ipcMain.handle('check-in', async (event, empId) => {
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString();
        await dbManager.run("INSERT INTO attendance (employee_id, date, check_in_time, status) VALUES (?, ?, ?, 'Present')", [empId, date, time]);
    });
    ipcMain.handle('check-out', async (event, empId) => {
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString();
        await dbManager.run("UPDATE attendance SET check_out_time=? WHERE employee_id=? AND date=?", [time, empId, date]);
    });

    ipcMain.handle('generate-payroll', async (event, data) => {
        // Defer requiring payroll module to avoid pulling `electron` internals in tests
        const { generatePayroll } = require('./payroll');
        return await generatePayroll(data);
    });



    // --- User Management (RBAC) ---
    ipcMain.handle('create-user', requireAdmin(async (event, { username, password, employee_id, role }) => {
        // Check if user exists
        const existing = await dbManager.get("SELECT * FROM users WHERE username = ?", [username]);
        if (existing) throw new Error("Username already taken");

        await dbManager.run(
            "INSERT INTO users (username, password, role, employee_id) VALUES (?, ?, ?, ?)",
            [username, hashPassword(password), role || 'employee', employee_id]
        );
        return { success: true };
    }));

    // Check if employee has login
    ipcMain.handle('check-user-exists', async (event, empId) => {
        const user = await dbManager.get("SELECT username FROM users WHERE employee_id = ?", [empId]);
        return user;
    });

    // --- Detailed Reports Data Fetcher ---
    ipcMain.handle('get-payroll-report', async (event, { type, month, year, companyId }) => {
        let start = `${year}-${String(month).padStart(2, '0')}-01`;
        let end = `${year}-${String(month).padStart(2, '0')}-31`;

        let sql = '';
        let params = [start, end, companyId];

        if (type === 'sal_sheet') {
            sql = `SELECT p.*, e.first_name, e.last_name, d.name as department_name, pos.title as designation_title 
                   FROM payroll p 
                   JOIN employees e ON p.employee_id = e.id 
                   LEFT JOIN departments d ON e.department_id = d.id
                   LEFT JOIN positions pos ON e.position_id = pos.id
    WHERE(p.payment_date BETWEEN ? AND ?) AND e.company_id = ? `;
        }
        else if (type === 'pf_esi') {
            sql = `SELECT p.employee_pf, p.employer_pf, p.employee_esi, p.employer_esi, p.gross_salary, p.basic_salary,
        e.first_name, e.last_name, e.uan, e.esi_number
                   FROM payroll p JOIN employees e ON p.employee_id = e.id
    WHERE(p.payment_date BETWEEN ? AND ?) AND e.company_id = ? `;
        }
        else if (type === 'bank_adv') {
            // bank_name not in schema? using logic or placeholder
            sql = `SELECT p.net_salary, p.payment_date,
        e.first_name, e.last_name, e.account_number, e.ifsc_code, e.bank_name
                   FROM payroll p JOIN employees e ON p.employee_id = e.id
    WHERE(p.payment_date BETWEEN ? AND ?) AND e.company_id = ? `;
        }
        else if (type === 'tax_rep') {
            sql = `SELECT p.gross_salary, p.professional_tax, p.tds, p.net_salary,
        e.first_name, e.last_name, e.pan_number
                   FROM payroll p JOIN employees e ON p.employee_id = e.id
    WHERE(p.payment_date BETWEEN ? AND ?) AND e.company_id = ? `;
        }
        else if (type === 'yearly_salary') {
            // Logic: Year is passed. We need financial year start/end.
            // Assuming 'year' param is the start of FY (e.g., 2025 for 2025-2026)
            start = `${year}-04-01`;
            end = `${parseInt(year) + 1}-03-31`;
            params = [start, end, companyId];

            sql = `SELECT e.id, e.first_name, e.last_name, e.pan_number,
        sum(p.gross_salary) as gross_salary,
        sum(p.basic_salary) as basic_salary,
        sum(p.employee_pf) as employee_pf,
        sum(p.professional_tax) as professional_tax,
        sum(p.tds) as tds,
        sum(p.net_salary) as net_salary
                   FROM payroll p JOIN employees e ON p.employee_id = e.id
    WHERE(p.payment_date BETWEEN ? AND ?) AND e.company_id = ?
        GROUP BY e.id`;
        }
        else if (type === 'dept_summary') {
            sql = `SELECT d.name as department_name, count(DISTINCT p.employee_id) as emp_count,
        sum(p.gross_salary) as gross_salary,
        sum(p.net_salary) as net_salary,
        sum(p.employee_pf) as employee_pf,
        sum(p.employer_pf) as employer_pf,
        sum(p.tds) as tds
                   FROM payroll p 
                   JOIN employees e ON p.employee_id = e.id
                   LEFT JOIN departments d ON e.department_id = d.id
    WHERE(p.payment_date BETWEEN ? AND ?) AND e.company_id = ?
        GROUP BY d.id`;
        }

        if (!sql) return [];
        return await dbManager.all(sql, params);
    });

    // --- Dynamic Report Builder ---
    ipcMain.handle('get-schema-cols', async () => {
        return {
            employees: [
                { id: 'first_name', label: 'First Name' },
                { id: 'last_name', label: 'Last Name' },
                { id: 'email', label: 'Email' },
                { id: 'phone', label: 'Phone' },
                { id: 'department_id', label: 'Department (ID)' }, // Joins are complex for builder v1, stick to IDs or basic joins if easy
                { id: 'date_of_joining', label: 'Joining Date' },
                { id: 'status', label: 'Status' },
                { id: 'base_salary', label: 'Base Salary' },
                { id: 'pan_number', label: 'PAN' },
                { id: 'uan', label: 'UAN' },
                { id: 'bank_name', label: 'Bank Name' },
                { id: 'account_number', label: 'Account No' }
            ],
            payroll: [
                { id: 'payment_date', label: 'Payment Date' },
                { id: 'gross_salary', label: 'Gross Salary' },
                { id: 'basic_salary', label: 'Basic Salary' },
                { id: 'hra', label: 'HRA' },
                { id: 'employee_pf', label: 'PF (Emp)' },
                { id: 'employer_pf', label: 'PF (Emplr)' },
                { id: 'professional_tax', label: 'PT' },
                { id: 'tds', label: 'TDS' },
                { id: 'net_salary', label: 'Net Salary' },
                { id: 'status', label: 'Status' }
            ],
            attendance: [
                { id: 'date', label: 'Date' },
                { id: 'check_in_time', label: 'Check In' },
                { id: 'check_out_time', label: 'Check Out' },
                { id: 'status', label: 'Status' },
                { id: 'overtime_hours', label: 'Overtime (Hrs)' }
            ]
        };
    });

    ipcMain.handle('get-dynamic-report', async (event, { table, columns, year, month, companyId }) => {
        // Safety: Whitelist tables
        const validTables = ['employees', 'payroll', 'attendance'];
        if (!validTables.includes(table)) throw new Error("Invalid table");

        let sql = "";
        let params = [];

        // Helper to pad
        const pad = (n) => String(n).padStart(2, '0');

        if (table === 'employees') {
            const cols = columns.map(c => {
                if (!/^[a-zA-Z0-9_]+$/.test(c)) return 'id';
                return `e.${c}`;
            }).join(', ');

            sql = `SELECT ${cols} FROM employees e WHERE e.company_id = ? `;
            params = [companyId];
        }
        else {
            // Join with Employees
            // Main table aliased as 't', employees as 'e'
            const cols = columns.map(c => {
                if (!/^[a-zA-Z0-9_]+$/.test(c)) return 'id';
                return `t.${c}`;
            }).join(', ');

            // Always select Name for context
            const finalCols = `e.first_name, e.last_name, ${cols}`;

            sql = `SELECT ${finalCols} 
                   FROM ${table} t 
                   JOIN employees e ON t.employee_id = e.id 
                   WHERE e.company_id = ? `;

            params = [companyId];

            if (year && month) {
                // Fix date construction (YYYY-MM-DD)
                // Also handle correct last day of month
                const lastDay = new Date(year, month, 0).getDate(); // month is 1-based, 0th day of next month is last day of current

                const start = `${year}-${pad(month)}-01`;
                const end = `${year}-${pad(month)}-${pad(lastDay)}`;

                if (table === 'attendance') {
                    sql += ` AND (t.date BETWEEN ? AND ?)`;
                    params.push(start, end);
                } else if (table === 'payroll') {
                    // Check payment date or pay_period_start? 
                    // Usually reports filter by pay period but payment_date is simple
                    sql += ` AND (t.payment_date BETWEEN ? AND ?)`;
                    params.push(start, end);
                }
            }
        }

        return await dbManager.all(sql, params);
    });

    // --- Reports (File Generation) ---
    ipcMain.handle('generate-report', async (event, { type, month, year, companyId, format = 'csv' }) => {
        // Define Extensions
        let ext = 'csv';
        let filters = [{ name: 'CSV File', extensions: ['csv'] }];

        if (format === 'excel') { ext = 'xlsx'; filters = [{ name: 'Excel File', extensions: ['xlsx'] }]; }
        else if (format === 'pdf') { ext = 'pdf'; filters = [{ name: 'PDF Document', extensions: ['pdf'] }]; }

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Save Report',
            defaultPath: `report_${type}_${Date.now()}.${ext} `,
            filters
        });
        if (canceled) return { success: false };

        let sql = '';
        let params = [];
        let headers = [];
        let rows = [];

        try {
            if (type === 'employee_master') {
                headers = ['ID', 'First Name', 'Last Name', 'Email', 'Department', 'Position', 'Status', 'Join Date', 'Salary'];
                sql = `SELECT e.id, e.first_name, e.last_name, e.email, d.name as dept, p.title as pos, e.status, e.date_of_joining, e.base_salary 
                       FROM employees e 
                       LEFT JOIN departments d ON e.department_id = d.id 
                       LEFT JOIN positions p ON e.position_id = p.id
                       WHERE e.company_id = ?
        `;
                params = [companyId];
                rows = await dbManager.all(sql, params);
            } else if (type === 'monthly_attendance') {
                const start = `${year}-${month}-01`;
                const end = `${year}-${month}-31`;
                headers = ['Date', 'Employee', 'Check In', 'Check Out', 'Status'];
                sql = `SELECT a.date, e.first_name || ' ' || e.last_name as name, a.check_in_time, a.check_out_time, a.status 
                       FROM attendance a 
                       JOIN employees e ON a.employee_id = e.id
    WHERE(a.date BETWEEN ? AND ?) AND e.company_id = ?
        ORDER BY a.date`;
                params = [start, end, companyId];
                rows = await dbManager.all(sql, params);
            } else if (type === 'salary_statement') {
                const start = `${year}-${month}-01`;
                const end = `${year}-${month}-31`;
                headers = ['Payment Date', 'Employee', 'Basic', 'DA', 'HRA', 'Conveyance', 'Medical', 'Special', 'Bonus', 'PF(Emp)', 'ESI(Emp)', 'PT', 'TDS', 'Total Ded', 'Net Salary'];
                sql = `SELECT p.payment_date, e.first_name || ' ' || e.last_name as name,
        p.basic_salary, p.da, p.hra, p.conveyance, p.medical, p.special_allowance, p.bonuses,
        p.employee_pf, p.employee_esi, p.professional_tax, p.tds,
        p.total_deductions, p.net_salary 
                       FROM payroll p 
                       JOIN employees e ON p.employee_id = e.id
    WHERE(p.payment_date BETWEEN ? AND ?) AND e.company_id = ? `;
                params = [start, end, companyId];
                rows = await dbManager.all(sql, params);
            } else if (type === 'form_16') {
                const yearStart = `${year}-04-01`;
                const yearEnd = `${parseInt(year) + 1}-03-31`;
                headers = ['Emp ID', 'Name', 'Gross Income', 'Basic', 'HRA', 'DA', 'Allowances', 'PF', 'PT', 'TDS', 'Net Annual'];
                sql = `SELECT e.id, e.first_name || ' ' || e.last_name as name,
        sum(p.gross_salary) as gross_income,
        sum(p.basic_salary) as annual_basic,
        sum(p.hra) as annual_hra,
        sum(p.da) as annual_da,
        sum(p.special_allowance + p.bonuses) as annual_allowances,
        sum(p.employee_pf) as annual_pf,
        sum(p.professional_tax) as annual_pt,
        sum(p.tds) as annual_tds,
        sum(p.net_salary) as net_salary
                        FROM payroll p 
                        JOIN employees e ON p.employee_id = e.id
    WHERE(p.payment_date BETWEEN ? AND ?) AND e.company_id = ?
        GROUP BY e.id`;
                params = [yearStart, yearEnd, companyId];
                rows = await dbManager.all(sql, params);
            } else if (type === 'bank_transfer') {
                const start = `${year}-${month}-01`;
                const end = `${year}-${month}-31`;
                headers = ['Beneficiary Name', 'Account Number', 'IFSC Code', 'Amount', 'Payment Date', 'Remarks'];
                sql = `SELECT e.first_name || ' ' || e.last_name as name,
        e.account_number, e.ifsc_code,
        p.net_salary, p.payment_date, 'Salary ${month}/${year}' as remarks
                       FROM payroll p 
                       JOIN employees e ON p.employee_id = e.id
    WHERE(p.payment_date BETWEEN ? AND ?) AND e.company_id = ? `;
                params = [start, end, companyId];
                rows = await dbManager.all(sql, params);
            }

            // Generate Output
            if (format === 'csv') {
                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','))
                ].join('\n');
                fs.writeFileSync(filePath, csvContent);

            } else if (format === 'excel') {
                const wb = XLSX.utils.book_new();
                const data = [headers, ...rows.map(r => Object.values(r))];
                const ws = XLSX.utils.aoa_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, "Report");
                XLSX.writeFile(wb, filePath);

            } else if (format === 'pdf') {
                const doc = new jsPDF();
                doc.setFontSize(14);
                doc.text(`Report: ${type.replace('_', ' ').toUpperCase()} `, 14, 15);
                doc.setFontSize(10);
                if (month && year) doc.text(`Period: ${month}/${year}`, 14, 22);

                autoTable(doc, {
                    startY: 25,
                    head: [headers],
                    body: rows.map(r => Object.values(r)),
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [41, 128, 185] }
                });

                const pdfData = doc.output();
                fs.writeFileSync(filePath, pdfData, 'binary');
            }

            return { success: true, path: filePath };
        } catch (ex) {
            console.error("Report Generation Error:", ex);
            return { success: false, error: ex.message };
        }
    });

    // --- Document Management ---
    ipcMain.handle('upload-document', async (event, { employeeId, docType }) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Documents', extensions: ['pdf', 'jpg', 'png', 'docx'] }]
        });
        if (canceled) return { success: false };

        const srcPath = filePaths[0];
        const fileName = path.basename(srcPath);
        const uploadDir = path.join(app.getAppPath(), 'uploads');

        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

        // Unique Name to prevent overwrite
        const destName = `${employeeId}_${Date.now()}_${fileName}`;
        const destPath = path.join(uploadDir, destName);

        fs.copyFileSync(srcPath, destPath);

        await dbManager.run(
            "INSERT INTO documents (employee_id, doc_type, file_name, file_path) VALUES (?, ?, ?, ?)",
            [employeeId, docType, fileName, destName] // Storing relative name or full path? Relative is safer for portability
        );

        return { success: true };
    });

    ipcMain.handle('get-documents', async (event, empId) => {
        return await dbManager.all("SELECT * FROM documents WHERE employee_id=? ORDER BY uploaded_at DESC", [empId]);
    });

    ipcMain.handle('open-document', async (event, fileName) => {
        const uploadsDir = path.join(app.getAppPath(), 'uploads');
        // Strip any directory component so a crafted fileName (e.g. "../../../Windows/System32/x.exe")
        // can't escape the uploads folder.
        const safeName = path.basename(String(fileName || ''));
        const filePath = path.join(uploadsDir, safeName);
        if (path.dirname(filePath) !== uploadsDir || !fs.existsSync(filePath)) {
            throw new Error("Invalid document.");
        }
        require('electron').shell.openPath(filePath);
        return { success: true };
    });

    ipcMain.handle('open-user-guide', async () => {
        const guidePath = app.isPackaged
            ? path.join(process.resourcesPath, 'docs', 'MpxHR_User_Guide.pdf')
            : path.join(app.getAppPath(), 'docs', 'MpxHR_User_Guide.pdf');
        if (!fs.existsSync(guidePath)) {
            throw new Error("User guide not found.");
        }
        const err = await require('electron').shell.openPath(guidePath);
        if (err) throw new Error(err);
        return { success: true };
    });

    // --- Asset Management ---
    ipcMain.handle('get-assets', async (event, { page = 1, limit = 50, search = '' } = {}) => {
        const offset = (page - 1) * limit;
        let where = "";
        let params = [];
        if (search) {
            where = "WHERE a.name LIKE ? OR a.serial_number LIKE ? OR e.first_name LIKE ?";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const countRes = await dbManager.get(`SELECT count(*) as c FROM assets a LEFT JOIN employees e ON a.assigned_to = e.id ${where}`, params);
        const total = countRes.c;

        const rows = await dbManager.all(`
            SELECT a.*, e.first_name, e.last_name 
            FROM assets a 
            LEFT JOIN employees e ON a.assigned_to = e.id 
            ${where}
            ORDER BY a.id DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return { data: rows, total, page, totalPages: Math.ceil(total / limit) };
    });

    ipcMain.handle('add-asset', async (event, asset) => {
        await dbManager.run(
            "INSERT INTO assets (name, serial_number, type, status, value) VALUES (?, ?, ?, 'Available', ?)",
            [asset.name, asset.serial_number, asset.type, asset.value]
        );
        return { success: true };
    });

    ipcMain.handle('delete-asset', requireAdmin(async (event, id) => {
        await dbManager.run("DELETE FROM assets WHERE id = ?", [id]);
        return { success: true };
    }));

    ipcMain.handle('assign-asset', async (event, { assetId, employeeId }) => {
        await dbManager.run(
            "UPDATE assets SET assigned_to = ?, status = 'Assigned', assigned_date = ? WHERE id = ?",
            [employeeId, new Date().toISOString().split('T')[0], assetId]
        );
        return { success: true };
    });

    ipcMain.handle('return-asset', async (event, assetId) => {
        await dbManager.run(
            "UPDATE assets SET assigned_to = NULL, status = 'Available', assigned_date = NULL WHERE id = ?",
            [assetId]
        );
        return { success: true };
    });

    // --- Settings & Leaves ---
    ipcMain.handle('get-settings', async () => await dbManager.all("SELECT * FROM settings"));

    ipcMain.handle('update-setting', async (event, data) => {
        console.log('[update-setting] Received:', Object.keys(data));
        try {
            for (const [key, value] of Object.entries(data)) {
                // Upsert mechanism
                const existing = await dbManager.get("SELECT * FROM settings WHERE key = ?", [key]);
                if (existing) {
                    await dbManager.run("UPDATE settings SET value = ? WHERE key = ?", [value, key]);
                } else {
                    await dbManager.run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, value]);
                }
            }
            console.log('[update-setting] Success');
            return { success: true };
        } catch (err) {
            console.error('[update-setting] Error:', err);
            throw err;
        }
    });

    ipcMain.handle('get-leaves', async (event, { employeeId = null, page = 1, limit = 50, search = '' } = {}) => {
        const offset = (page - 1) * limit;
        let whereClauses = [];
        let params = [];

        if (employeeId) {
            whereClauses.push("l.employee_id = ?");
            params.push(employeeId);
        }
        if (search) {
            whereClauses.push("(e.first_name LIKE ? OR e.last_name LIKE ? OR l.leave_type LIKE ?)");
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const whereSQL = whereClauses.length > 0 ? "WHERE " + whereClauses.join(' AND ') : "";

        const countRes = await dbManager.get(`SELECT count(*) as c FROM leaves l JOIN employees e ON l.employee_id = e.id ${whereSQL}`, params);
        const total = countRes.c;

        const rows = await dbManager.all(
            `SELECT l.*, e.first_name, e.last_name 
             FROM leaves l 
             JOIN employees e ON l.employee_id = e.id 
             ${whereSQL} 
             ORDER BY l.created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        return { data: rows, total, page, totalPages: Math.ceil(total / limit) };
    });

    ipcMain.handle('request-leave', async (event, d) => await dbManager.run("INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status) VALUES (?,?,?,?,?,'Pending')", [d.employee_id, d.leave_type, d.start_date, d.end_date, d.reason]));
    ipcMain.handle('update-leave-status', async (event, { id, status }) => await dbManager.run("UPDATE leaves SET status=? WHERE id=?", [status, id]));

    // --- Advanced Leave Management (Types, Holidays, Balances) ---
    (async () => {
        await dbManager.ready();
        const run = async (sql) => { try { await dbManager.run(sql); } catch (e) { } };

        // Ensure Tables Exist - Updated Schema
        await run(`CREATE TABLE IF NOT EXISTS leave_types (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, max_days INTEGER, color TEXT, company_id INTEGER, UNIQUE(name, company_id))`);
        await run(`CREATE TABLE IF NOT EXISTS holidays (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, date DATE UNIQUE, type TEXT, company_id INTEGER)`); // Holidays uses DATE UNIQUE globally? Might want to fix this too later.
        await run(`CREATE TABLE IF NOT EXISTS leave_balances (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER, leave_type TEXT, year INTEGER, balance REAL, used REAL DEFAULT 0, UNIQUE(employee_id, leave_type, year))`);
    })();

    // Helper to ensure defaults exist
    const ensureLeaveTypes = async (companyId) => {
        if (!companyId) return [];
        const types = await dbManager.all("SELECT * FROM leave_types WHERE company_id=?", [companyId]);
        if (types.length === 0) {
            const defaults = [
                { name: 'Sick Leave', max: 12, color: '#ef4444' },
                { name: 'Casual Leave', max: 12, color: '#f59e0b' },
                { name: 'Privilege Leave', max: 18, color: '#10b981' }
            ];
            for (const d of defaults) {
                await dbManager.run("INSERT INTO leave_types (name, max_days, color, company_id) VALUES (?,?,?,?)", [d.name, d.max, d.color, companyId]);
            }
            return await dbManager.all("SELECT * FROM leave_types WHERE company_id=?", [companyId]);
        }
        return types;
    };

    ipcMain.handle('get-leave-types', async (e, companyId) => {
        return await ensureLeaveTypes(companyId);
    });

    ipcMain.handle('add-leave-type', async (e, d) => {
        return await dbManager.run("INSERT INTO leave_types (name, max_days, color, company_id) VALUES (?,?,?,?)", [d.name, d.max_days, d.color, d.companyId]);
    });

    ipcMain.handle('delete-leave-type', requireAdmin(async (e, id) => await dbManager.run("DELETE FROM leave_types WHERE id=?", [id])));

    ipcMain.handle('get-holidays', async (e, companyId) => {
        if (!companyId) return [];
        return await dbManager.all("SELECT * FROM holidays WHERE company_id=? ORDER BY date", [companyId]);
    });

    ipcMain.handle('add-holiday', async (e, d) => await dbManager.run("INSERT INTO holidays (name, date, type, company_id) VALUES (?,?,?,?)", [d.name, d.date, d.type, d.companyId]));

    ipcMain.handle('delete-holiday', requireAdmin(async (e, id) => await dbManager.run("DELETE FROM holidays WHERE id=?", [id])));

    // Form 16-style annual salary & TDS certificate data for one employee, one financial year (Apr-Mar)
    ipcMain.handle('get-form16-data', async (e, { employeeId, financialYear }) => {
        const [fyStart] = financialYear.split('-').map(Number);
        const startDate = `${fyStart}-04-01`;
        const endDate = `${fyStart + 1}-03-31`;

        const emp = await dbManager.get(
            `SELECT e.*, c.name as company_name, c.address as company_address, c.pan as company_pan, c.tan as company_tan, p.title as position_title
             FROM employees e
             LEFT JOIN companies c ON e.company_id = c.id
             LEFT JOIN positions p ON e.position_id = p.id
             WHERE e.id = ?`,
            [employeeId]
        );
        if (!emp) throw new Error('Employee not found');

        const rows = await dbManager.all(
            `SELECT * FROM payroll WHERE employee_id = ? AND pay_period_start >= ? AND pay_period_end <= ? ORDER BY pay_period_start`,
            [employeeId, startDate, endDate]
        );

        const totals = rows.reduce((acc, r) => {
            acc.basic += r.basic_salary || 0;
            acc.da += r.da || 0;
            acc.hra += r.hra || 0;
            acc.conveyance += r.conveyance || 0;
            acc.medical += r.medical || 0;
            acc.special += r.special_allowance || 0;
            acc.bonuses += r.bonuses || 0;
            acc.gross += r.gross_salary || 0;
            acc.employeePf += r.employee_pf || 0;
            acc.vpf += r.vpf_amount || 0;
            acc.professionalTax += r.professional_tax || 0;
            acc.tds += r.tds || 0;
            acc.netPaid += r.net_salary || 0;
            return acc;
        }, { basic: 0, da: 0, hra: 0, conveyance: 0, medical: 0, special: 0, bonuses: 0, gross: 0, employeePf: 0, vpf: 0, professionalTax: 0, tds: 0, netPaid: 0 });

        return { employee: emp, financialYear, monthsCovered: rows.length, totals };
    });

    // Aggregate PL/RH balance across active employees, for quick counters on the Attendance screen
    ipcMain.handle('get-leave-quick-counters', async () => {
        const year = new Date().getFullYear();
        const rows = await dbManager.all(
            `SELECT lb.leave_type, COALESCE(SUM(lb.balance),0) as total_balance
             FROM leave_balances lb
             JOIN employees e ON lb.employee_id = e.id
             WHERE e.status='Active' AND lb.year=? AND lb.leave_type IN ('PL','RH','Paid Leave','Restricted')
             GROUP BY lb.leave_type`,
            [year]
        );
        const pl = rows.filter(r => r.leave_type === 'PL' || r.leave_type === 'Paid Leave').reduce((s, r) => s + r.total_balance, 0);
        const rh = rows.filter(r => r.leave_type === 'RH' || r.leave_type === 'Restricted').reduce((s, r) => s + r.total_balance, 0);
        return { pl, rh };
    });

    ipcMain.handle('get-leave-balance', async (e, empId) => {
        if (!empId) return [];
        const year = new Date().getFullYear();

        // Resolve Company from Employee
        const emp = await dbManager.get("SELECT company_id FROM employees WHERE id=?", [empId]);
        if (!emp) return [];

        // Ensure balances exist for this year (based on Company's leave types)
        // FIX: Use shared helper to ensure types exist first!
        const types = await ensureLeaveTypes(emp.company_id);

        for (const t of types) {
            await dbManager.run(
                "INSERT OR IGNORE INTO leave_balances (employee_id, leave_type, year, balance, used) VALUES (?, ?, ?, ?, 0)",
                [empId, t.name, year, t.max_days]
            );
        }
        return await dbManager.all("SELECT lb.*, lt.color FROM leave_balances lb LEFT JOIN leave_types lt ON (lb.leave_type = lt.name AND lt.company_id=?) WHERE lb.employee_id=? AND lb.year=?", [emp.company_id, empId, year]);
    });

    // Update Leave Status Logic to Deduct Balance
    ipcMain.removeHandler('update-leave-status');
    ipcMain.handle('update-leave-status', async (event, { id, status }) => {
        const leave = await dbManager.get("SELECT * FROM leaves WHERE id=?", [id]);
        if (status === 'Approved' && leave && leave.status !== 'Approved') {
            // Calculate Days
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            const days = (end - start) / (1000 * 60 * 60 * 24) + 1;
            const year = start.getFullYear();

            // Check Balance
            const bal = await dbManager.get("SELECT * FROM leave_balances WHERE employee_id=? AND leave_type=? AND year=?", [leave.employee_id, leave.leave_type, year]);

            // If balance tracking applies (it might be a legacy type or untracked)
            if (bal) {
                if ((bal.balance - bal.used) < days) {
                    // For now, we will allow negative/overdraft or just warn? 
                    // Requirement said "auto-reject if insufficient". 
                    // But this is the Approval action by Manager. Manager might override. 
                    // Let's deduct anyway.
                }
                await dbManager.run("UPDATE leave_balances SET used = used + ? WHERE id=?", [days, bal.id]);
            }
        }
        return await dbManager.run("UPDATE leaves SET status=? WHERE id=?", [status, id]);
    });

    // Update Payroll to support filtering (Fixed for Isolation)
    ipcMain.handle('get-payroll', async (event, { employeeId = null, page = 1, limit = 50, search = '', month = null, year = null, companyId = null } = {}) => {
        const offset = (page - 1) * limit;
        let whereClauses = [];
        let params = [];

        // STRICT ISOLATION
        if (companyId) {
            whereClauses.push("e.company_id = ?");
            params.push(companyId);
        }

        if (employeeId) {
            whereClauses.push("p.employee_id = ?");
            params.push(employeeId);
        }
        if (search) {
            whereClauses.push("(e.first_name LIKE ? OR e.last_name LIKE ?)");
            params.push(`%${search}%`, `%${search}%`);
        }
        if (month && year) {
            // Note: DB stores dates as YYYY-MM-DD.
            // Payroll stores `pay_period_start` and `pay_period_end`.
            // We usually query by `pay_period_start` matching the month.
            const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
            // Or use logic that checks overlap, but usually we just check the start date's month
            whereClauses.push("strftime('%Y', p.pay_period_start) = ? AND strftime('%m', p.pay_period_start) = ?");
            params.push(String(year), String(month).padStart(2, '0'));
        }

        const whereSQL = whereClauses.length > 0 ? "WHERE " + whereClauses.join(' AND ') : "";

        const countRes = await dbManager.get(`SELECT count(*) as c FROM payroll p JOIN employees e ON p.employee_id = e.id ${whereSQL}`, params);
        const total = countRes ? countRes.c : 0;

        const rows = await dbManager.all(
            `SELECT p.*, 
                    e.first_name, e.last_name, e.email, 
                    e.pan_number, e.uan, e.pf_number, e.esi_number, 
                    e.bank_name, e.account_number, e.ifsc_code,
                    e.da_rate, e.hra_rate, e.conveyance_allowance, e.medical_allowance, e.special_allowance_fixed,
                    d.name as department_name, 
                    pos.title as position_title,
                    c.name as company_name, c.address as company_address, c.logo as company_logo,
                    b.name as branch_name 
             FROM payroll p 
             JOIN employees e ON p.employee_id = e.id 
             LEFT JOIN departments d ON e.department_id = d.id 
             LEFT JOIN positions pos ON e.position_id = pos.id
             LEFT JOIN companies c ON e.company_id = c.id
             LEFT JOIN branches b ON e.branch_id = b.id
             ${whereSQL} 
             ORDER BY p.payment_date DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return { data: rows, total, page, totalPages: Math.ceil(total / limit) };
    });

    ipcMain.handle('credit-monthly-leaves', async (event, { month, year }) => {
        const now = new Date();
        const m = month || (now.getMonth() + 1);
        const y = year || now.getFullYear();
        const startOfMonth = `${y}-${String(m).padStart(2, '0')}-01`;
        
        const employees = await dbManager.all("SELECT id, date_of_joining, is_transfer_eligible FROM employees WHERE status='Active'");
        let credited = 0;

        for (const emp of employees) {
            // 1. Tenure Check (3 Months)
            if (!emp.date_of_joining) continue;
            const doj = new Date(emp.date_of_joining);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            if (doj > threeMonthsAgo) continue;

            // Fetch accrual settings
            const settingsArr = await dbManager.all("SELECT * FROM settings");
            const getS = (k, def) => {
                const row = settingsArr.find(s => s.key === k);
                return row ? parseFloat(row.value) : def;
            };

            const minDays = getS('leave_accrual_min_days', 20);
            const plCredit = getS('leave_credit_pl', 1.5);
            const clCredit = getS('leave_credit_cl', 1.0);

            const startDay = getS('payroll_month_start_day', 1);
            let startDate, endDate;
            if (startDay === 1) {
                const daysInMonth = new Date(y, m, 0).getDate();
                startDate = `${y}-${String(m).padStart(2, '0')}-01`;
                endDate = `${y}-${String(m).padStart(2, '0')}-${daysInMonth}`;
            } else {
                const prevM = m === 1 ? 12 : m - 1;
                const prevY = m === 1 ? y - 1 : y;
                startDate = `${prevY}-${String(prevM).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
                endDate = `${y}-${String(m).padStart(2, '0')}-${String(startDay - 1).padStart(2, '0')}`;
            }

            // 2. Attendance Check
            const att = await dbManager.get(
                `SELECT count(*) as c FROM attendance WHERE employee_id=? AND date BETWEEN ? AND ? AND status IN ('Present', 'P', 'HD', 'Present (auto)')`,
                [emp.id, startDate, endDate]
            );
            if (!att || att.c < minDays) continue;

            // 3. Credit Leaves
            const leaveTypes = [
                { type: 'PL', amount: plCredit },
                { type: 'CL', amount: clCredit }
            ];

            for (const lt of leaveTypes) {
                const bal = await dbManager.get("SELECT id, balance FROM leave_balances WHERE employee_id=? AND leave_type=? AND year=?", [emp.id, lt.type, y]);
                if (bal) {
                    await dbManager.run("UPDATE leave_balances SET balance = balance + ? WHERE id=?", [lt.amount, bal.id]);
                } else {
                    await dbManager.run("INSERT INTO leave_balances (employee_id, leave_type, year, balance, used) VALUES (?, ?, ?, ?, 0)", [emp.id, lt.type, y, lt.amount]);
                }
            }
            credited++;
        }
        return { success: true, creditedCount: credited };
    });

    ipcMain.handle('manual-leave-adjustment', async (e, { employeeId, leaveType, amount, year }) => {
        const y = year || new Date().getFullYear();
        const bal = await dbManager.get("SELECT id, balance FROM leave_balances WHERE employee_id=? AND leave_type=? AND year=?", [employeeId, leaveType, y]);
        if (bal) {
            await dbManager.run("UPDATE leave_balances SET balance = balance + ? WHERE id=?", [parseFloat(amount), bal.id]);
        } else {
            await dbManager.run("INSERT INTO leave_balances (employee_id, leave_type, year, balance, used) VALUES (?, ?, ?, ?, 0)", [employeeId, leaveType, y, parseFloat(amount)]);
        }
        return { success: true };
    });

    ipcMain.handle('download-multiple-payslips', async (event, { ids, format = 'pdf' }) => {
        try {
            if (!ids || ids.length === 0) throw new Error("No IDs provided");

            const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Save Bundled Payslips',
                defaultPath: `Payslips_Bundle_${Date.now()}.zip`,
                filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
            });

            if (canceled || !filePath) return { canceled: true };

            const zip = new AdmZip();
            
            // Fetch records
            const placeholders = ids.map(() => '?').join(',');
            const rows = await dbManager.all(`
                SELECT p.*, e.first_name, e.last_name, e.department_id, d.name as department_name, 
                       pos.title as position_title,
                       e.da_rate, e.hra_rate, e.conveyance_allowance, e.medical_allowance, e.special_allowance_fixed,
                       c.name as company_name, c.address as company_address, c.logo as company_logo
                FROM payroll p 
                JOIN employees e ON p.employee_id = e.id 
                LEFT JOIN departments d ON e.department_id = d.id
                LEFT JOIN positions pos ON e.position_id = pos.id
                LEFT JOIN companies c ON e.company_id = c.id
                WHERE p.id IN (${placeholders})
            `, ids);

            for (const r of rows) {
                const period = new Date(r.pay_period_start).toLocaleString('default', { month: 'short', year: 'numeric' });
                const fullPeriod = new Date(r.pay_period_start).toLocaleString('default', { month: 'long', year: 'numeric' });
                const fileNameBase = `${r.first_name}_${r.last_name}_Payslip_${period.replace(' ', '_')}`;

                const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                const earnings = [
                    { l: 'BASIC', v: r.basic_salary, r: r.base_salary },
                    { l: 'DA', v: r.da, r: r.da_rate },
                    { l: 'HRA', v: r.hra, r: r.hra_rate },
                    { l: 'CONVEYANCE', v: r.conveyance, r: r.conveyance_allowance },
                    { l: 'MEDICAL', v: r.medical, r: r.medical_allowance },
                    { l: 'SPECIAL', v: r.special_allowance, r: r.special_allowance_fixed },
                    { l: 'BONUS', v: r.bonuses, r: r.bonuses },
                    { l: 'OT AMOUNT', v: r.ot_amount || 0, r: null }
                ].filter(e => e.v > 0 || (e.r > 0 && e.l !== 'OT AMOUNT'));

                const deductions = [
                    { l: 'ADVANCE', v: r.other_deductions || 0 },
                    { l: 'PF', v: r.employee_pf || r.pf || 0 },
                    { l: 'ESI', v: r.employee_esi || r.esi || 0 },
                    { l: 'PT', v: r.professional_tax || r.pt || 0 },
                    { l: 'TDS', v: r.tds || 0 },
                    { l: 'LOP', v: r.lop_amount || 0 }
                ].filter(d => d.v > 0);

                const maxRows = Math.max(earnings.length, deductions.length);

                // --- WORD EXPORT (.doc via HTML) ---
                if (format === 'word' || format === 'both') {
                    let rowsHtml = '';
                    let totalRate = 0;
                    for (let i = 0; i < maxRows; i++) {
                        const e = earnings[i] || { l: '', v: null, r: null };
                        const d = deductions[i] || { l: '', v: null };
                        rowsHtml += `
                            <tr>
                                <td style="border:1px solid #000; padding:4px 8px;">${e.l}</td>
                                <td style="border:1px solid #000; padding:4px 8px; text-align:right;">${e.v ? fmt(e.r || e.v) : ''}</td>
                                <td style="border:1px solid #000; padding:4px 8px; text-align:right;">${e.v ? fmt(e.v) : ''}</td>
                                <td style="border:1px solid #000; padding:4px 8px;">${d.l}</td>
                                <td style="border:1px solid #000; padding:4px 8px; text-align:right;">${d.v ? fmt(d.v) : ''}</td>
                            </tr>
                        `;
                        if (e.r) totalRate += parseFloat(e.r);
                    }

                    const wordHtml = `
                        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                        <head><meta charset='utf-8'></head>
                        <body>
                            <div style="font-family: Arial, sans-serif; padding: 20px;">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <h1 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">${r.company_name || 'COMPANY NAME'}</h1>
                                    <p style="margin: 2px 0; font-size: 12px; font-weight: bold;">${r.company_address || ''}</p>
                                    <h2 style="margin: 10px 0; font-size: 14px; font-weight: bold;">Salary Slip for the month of ${period}</h2>
                                </div>

                                <table style="width:100%; margin-bottom:15px; font-size:11px;">
                                    <tr>
                                        <td>Emp ID: ${r.employee_code || r.employee_id || r.id}</td>
                                        <td>Employee Name: ${r.first_name} ${r.last_name}</td>
                                    </tr>
                                    <tr>
                                        <td>Pay Days: ${r.days_present !== undefined ? r.days_present : '30'}</td>
                                        <td>Present Days: ${r.days_present !== undefined ? r.days_present : '30'}</td>
                                    </tr>
                                    <tr>
                                        <td>DOJ: ${r.date_of_joining || '-'}</td>
                                        <td>Father Name: ${r.father_name || r.father || '-'}</td>
                                    </tr>
                                </table>

                                <table style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #000;">
                                    <thead>
                                        <tr style="background:#f0f0f0;">
                                            <th style="border:1px solid #000; padding:5px;">Earnings</th>
                                            <th style="border:1px solid #000; padding:5px;">Rate</th>
                                            <th style="border:1px solid #000; padding:5px;">Amount</th>
                                            <th style="border:1px solid #000; padding:5px;">Deductions</th>
                                            <th style="border:1px solid #000; padding:5px;">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rowsHtml}
                                    </tbody>
                                    <tr style="font-weight:bold;">
                                        <td style="border:1px solid #000; padding:4px 8px;">Total</td>
                                        <td style="border:1px solid #000; padding:4px 8px; text-align:right;">${fmt(totalRate)}</td>
                                        <td style="border:1px solid #000; padding:4px 8px; text-align:right;">${fmt(r.gross_salary)}</td>
                                        <td style="border:1px solid #000; padding:4px 8px;">Total</td>
                                        <td style="border:1px solid #000; padding:4px 8px; text-align:right;">${fmt(r.total_deductions)}</td>
                                    </tr>
                                </table>

                                <div style="margin-top:10px; font-size:12px;">
                                    <p><strong>Net Pay</strong>: ${fmt(r.net_salary)}</p>
                                    <p><strong>In Words</strong>: ${convertNumberToWords(Math.round(r.net_salary || 0))}</p>
                                </div>

                                <div style="margin-top:50px; display:flex; justify-content:space-between;">
                                    <div style="width:200px; text-align:right; float:right;">
                                        <br/><br/>
                                        <strong>Signature</strong>
                                    </div>
                                    <div style="clear:both;"></div>
                                </div>

                                <p style="text-align:center; font-size:10px; margin-top:30px; font-weight:bold;">This is Computer Generated Statement, Does not Required Signature</p>
                            </div>
                        </body>
                        </html>
                    `;
                    zip.addFile(`${fileNameBase}.doc`, Buffer.from('\ufeff' + wordHtml, 'utf-8'));
                }

                // --- PDF EXPORT ---
                if (format === 'pdf' || format === 'both') {
                    const doc = new jsPDF('p', 'pt', 'a4');
                    const pageWidth = doc.internal.pageSize.getWidth();
                    let y = 50;
                    
                    // Header
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text((r.company_name || 'COMPANY NAME').toUpperCase(), pageWidth / 2, y, { align: 'center' });
                    y += 18;
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.text(r.company_address || '', pageWidth / 2, y, { align: 'center', maxWidth: 450 });
                    y += 25;
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Salary Slip for the month of ${fullPeriod}`, pageWidth / 2, y, { align: 'center' });
                    y += 30;

                    // Details
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    const leftX = 40;
                    const midX = pageWidth / 2;
                    const labelW = 80;

                    const details = [
                        ['Emp ID:', `${r.employee_code || r.employee_id || r.id}`, 'Employee Name:', `${r.first_name} ${r.last_name}`],
                        ['Pay Days:', `${r.days_present !== undefined ? r.days_present : '30'}`, 'Present Days:', `${r.days_present !== undefined ? r.days_present : '30'}`],
                        ['DOJ:', `${r.date_of_joining || '-'}`, 'Father Name:', `${r.father_name || r.father || '-'}`]
                    ];
                    details.forEach(row => {
                        doc.text(row[0], leftX, y);
                        doc.text(row[1], leftX + labelW, y);
                        doc.text(row[2], midX, y);
                        doc.text(row[3], midX + labelW, y);
                        y += 15;
                    });
                    y += 10;

                    // Main Table
                    const tableBody = [];
                    let totalRate = 0;
                    for (let i = 0; i < maxRows; i++) {
                        const e = earnings[i] || { l: '', v: null, r: null };
                        const d = deductions[i] || { l: '', v: null };
                        tableBody.push([e.l, e.v ? fmt(e.r || e.v) : '', e.v ? fmt(e.v) : '', d.l, d.v ? fmt(d.v) : '']);
                        if (e.r) totalRate += parseFloat(e.r);
                    }
                    tableBody.push(['Total', fmt(totalRate), fmt(r.gross_salary), 'Total', fmt(r.total_deductions)]);

                    autoTable.default(doc, {
                        startY: y,
                        margin: { left: 40, right: 40 },
                        head: [['Earnings', 'Rate', 'Amount', 'Deductions', 'Amount']],
                        body: tableBody,
                        theme: 'grid',
                        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 1, lineColor: [0,0,0] },
                        styles: { fontSize: 9, cellPadding: 5, textColor: [0, 0, 0], lineWidth: 1, lineColor: [0,0,0] },
                        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 80, halign: 'right' }, 2: { cellWidth: 80, halign: 'right' }, 3: { cellWidth: 120 }, 4: { cellWidth: 114, halign: 'right' } },
                        didParseCell: function(data) {
                            if (data.row.index === tableBody.length - 1) data.cell.styles.fontStyle = 'bold';
                        }
                    });

                    y = doc.lastAutoTable.finalY + 20;

                    // Summary
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Net Pay: ${fmt(r.net_salary)}`, 40, y);
                    y += 15;
                    doc.text(`In Words: ${convertNumberToWords(Math.round(r.net_salary || 0))}`, 40, y);

                    y += 40;
                    doc.text("Signature", pageWidth - 100, y, { align: 'center' });
                    y += 25;
                    doc.setFontSize(8);
                    doc.text("This is Computer Generated Statement, Does not Required Signature", pageWidth / 2, y, { align: 'center' });
                    
                    const pdfBuffer = doc.output('arraybuffer');
                    zip.addFile(`${fileNameBase}.pdf`, Buffer.from(pdfBuffer));
                }
            }

            zip.writeZip(filePath);
            return { success: true };

        } catch (err) {
            console.error("Bulk Download Error:", err);
            return { success: false, error: err.message };
        }
    });



    // --- Helpdesk Handlers ---
    ipcMain.handle('create-ticket', async (event, data) => {
        return await dbManager.run(
            "INSERT INTO tickets (employee_id, category, priority, subject, description, status) VALUES (?,?,?,?,?, 'Open')",
            [data.employee_id, data.category, data.priority, data.subject, data.description]
        );
    });

    ipcMain.handle('get-tickets', async (event, { employeeId = null, role = 'admin' } = {}) => {
        // If Admin/Manager, show all. If Employee, show only theirs.
        if (role === 'employee' && employeeId) {
            return await dbManager.all(`
                SELECT t.*, e.first_name, e.last_name 
                FROM tickets t 
                LEFT JOIN employees e ON t.employee_id = e.id 
                WHERE t.employee_id = ? 
                ORDER BY t.created_at DESC`, [employeeId]);
        } else {
            return await dbManager.all(`
                SELECT t.*, e.first_name, e.last_name 
                FROM tickets t 
                LEFT JOIN employees e ON t.employee_id = e.id 
                ORDER BY CASE 
                    WHEN status = 'Open' THEN 1 
                    WHEN status = 'In Progress' THEN 2 
                    ELSE 3 
                END, t.created_at DESC`);
        }
    });

    ipcMain.handle('update-ticket-status', async (event, { id, status }) => {
        return await dbManager.run("UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, id]);
    });

    // --- Shift & Roster Handlers ---
    // Generic Run
    ipcMain.handle('run-sql', requireAdmin(async (e, sql, params) => {
        try { return await dbManager.run(sql, params); } catch (err) { return { error: err.message }; }
    }));
    ipcMain.handle('all-sql', requireAdmin(async (e, sql, params) => {
        try { return await dbManager.all(sql, params); } catch (err) { return { error: err.message }; }
    }));



    // Save Payroll (Direct Update/Insert)
    ipcMain.handle('save-payroll', async (e, r) => {
        try {
            await dbManager.run(`INSERT OR REPLACE INTO payroll (
                employee_id, pay_period_start, pay_period_end, 
                base_salary, basic_salary, gross_salary, 
                pf, employee_esi, professional_tax, tds, total_deductions, net_salary, 
                status, payment_date
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
                r.employee_id, r.pay_period_start, r.pay_period_end,
                r.base_salary, r.basic_salary, r.gross_salary,
                r.pf, r.esi, r.professional_tax, r.tds, r.total_deductions, r.net_salary,
                'Paid', r.payment_date
            ]);
            return { success: true };
        } catch (err) {
            console.error('Save Payroll Error:', err);
            return { success: false, error: err.message };
        }
    });
    ipcMain.handle('get-shifts', async () => await dbManager.all("SELECT * FROM shifts ORDER BY name"));
    ipcMain.handle('add-shift', async (event, data) => {
        return await dbManager.run("INSERT INTO shifts (name, start_time, end_time) VALUES (?,?,?)", [data.name, data.start_time, data.end_time]);
    });

    ipcMain.handle('delete-shift', requireAdmin(async (event, id) => {
        return await dbManager.run("DELETE FROM shifts WHERE id = ?", [id]);
    }));

    ipcMain.handle('get-roster', async (event, { startDate, endDate }) => {
        // Returns all assignments in range
        return await dbManager.all(`
            SELECT es.*, e.first_name, e.last_name, s.name as shift_name, s.start_time, s.end_time
            FROM employee_shifts es
            JOIN employees e ON es.employee_id = e.id
            JOIN shifts s ON es.shift_id = s.id
            WHERE es.date BETWEEN ? AND ?
        `, [startDate, endDate]);
    });

    ipcMain.handle('update-roster', async (event, { employeeId, date, shiftId }) => {
        // Upsert logic for SQLite
        return await dbManager.run(`
            INSERT INTO employee_shifts (employee_id, date, shift_id) 
            VALUES (?,?,?)
            ON CONFLICT(employee_id, date) 
            DO UPDATE SET shift_id = excluded.shift_id
        `, [employeeId, date, shiftId]);
    });

    // --- Performance Appraisal Handlers ---
    ipcMain.handle('get-reviews', async (event, { employeeId = null, role = 'admin' } = {}) => {
        if (role === 'employee' && employeeId) {
            return await dbManager.all("SELECT * FROM performance_reviews WHERE employee_id = ? ORDER BY created_at DESC", [employeeId]);
        } else {
            return await dbManager.all(`
                SELECT pr.*, e.first_name, e.last_name 
                FROM performance_reviews pr
                JOIN employees e ON pr.employee_id = e.id
                ORDER BY pr.created_at DESC
            `);
        }
    });

    ipcMain.handle('initiate-review', async (event, data) => {
        // Admin creates a review slot or Employee starts one? Let's say Employee starts explicit self-review for a period
        // Check if exists
        const exists = await dbManager.get("SELECT id FROM performance_reviews WHERE employee_id=? AND review_period=?", [data.employee_id, data.review_period]);
        if (exists) throw new Error("Review already exists for this period");

        return await dbManager.run(
            "INSERT INTO performance_reviews (employee_id, review_period, status, self_rating, self_comments) VALUES (?, ?, 'Submitted', ?, ?)",
            [data.employee_id, data.review_period, data.self_rating, data.self_comments]
        );
    });

    ipcMain.handle('submit-manager-review', async (event, data) => {
        return await dbManager.run(
            "UPDATE performance_reviews SET manager_rating=?, manager_comments=?, status='Reviewed' WHERE id=?",
            [data.manager_rating, data.manager_comments, data.id]
        );
    });

    // --- Analytics & Dashboard ---
    ipcMain.handle('get-analytics-stats', async () => {
        try {
            // 1. Employee Status Distribution (Turnover Proxy)
            const empStatus = await dbManager.all("SELECT status, COUNT(*) as count FROM employees GROUP BY status");

            // 2. Attendance Overview (Current Month) — "today only" is misleading since most days
            // haven't been marked yet when this loads early in the day/period.
            const monthStart = new Date().toISOString().slice(0, 7) + '-01';
            const attendance = await dbManager.all("SELECT status, COUNT(*) as count FROM attendance WHERE date >= ? GROUP BY status", [monthStart]);

            // 3. Salary by Department
            const salaryByDept = await dbManager.all(`
                SELECT d.name as department, SUM(e.base_salary) as total 
                FROM employees e 
                LEFT JOIN departments d ON e.department_id = d.id 
                WHERE e.status = 'Active' 
                GROUP BY d.name
            `);

            // 4. Headcount Growth (Last 6 Months) - Simplified
            // In a real app, this would be complex history tracking. 
            // Here we just use hire_date as a proxy for growth.
            const growth = await dbManager.all(`
                SELECT strftime('%Y-%m', date_of_joining) as month, COUNT(*) as joined 
                FROM employees 
                WHERE date_of_joining >= date('now', '-6 months') 
                GROUP BY month 
                ORDER BY month ASC
            `);

            return { empStatus, attendance, salaryByDept, growth };
        } catch (e) {
            console.error("Analytics Error:", e);
            return { empStatus: [], attendance: [], salaryByDept: [], growth: [] };
        }
    });


    // --- Test Data Generator ---
    ipcMain.handle('generate-test-data', async (e) => {
        const hasData = await dbManager.get("SELECT count(*) as c FROM employees");
        if (hasData.c > 50) return { success: true, message: "Data already exists" };

        await dbManager.run("BEGIN TRANSACTION");
        try {
            // 1. Company
            await dbManager.run("INSERT OR IGNORE INTO companies (id, name, address, phone) VALUES (99, 'Test Corp Ltd.', '123 Tech Park', '9999999999')");

            // 2. Depts & Positions
            const depts = ['IT', 'HR', 'Finance', 'Sales', 'Operations'];
            for (let i = 0; i < depts.length; i++) {
                await dbManager.run("INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)", [100 + i, depts[i]]);
            }
            const roles = ['Manager', 'Developer', 'Analyst', 'Executive', 'Intern'];
            for (let i = 0; i < roles.length; i++) {
                await dbManager.run("INSERT OR IGNORE INTO positions (id, title, department_id, base_salary) VALUES (?, ?, ?, ?)", [100 + i, roles[i], 100 + Math.floor(Math.random() * 5), 15000 + (i * 10000)]);
            }

            // 3. Employees (100)
            const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Diya', 'Saanvi', 'Angel', 'Pari', 'Ananya', 'Myra', 'Riya', 'Aadya'];
            const lastNames = ['Sharma', 'Verma', 'Gupta', 'Malhotra', 'Bhatia', 'Saxena', 'Mehta', 'Chopra', 'Singh', 'Kumar', 'Jain', 'Agarwal'];

            for (let i = 1; i <= 100; i++) {
                const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
                const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
                const deptId = 100 + Math.floor(Math.random() * 5);
                const posId = 100 + Math.floor(Math.random() * 5);
                const salary = 20000 + Math.floor(Math.random() * 80000);
                const status = Math.random() > 0.9 ? 'Exited' : 'Active'; // 10% attrition

                await dbManager.run(`
                    INSERT INTO employees (
                        first_name, last_name, email, phone, company_id, department_id, position_id, 
                        date_of_joining, status, base_salary, payment_mode, 
                        bank_name, account_number, ifsc_code, pan_number, uan, 
                        pf_rate, esi_rate
                    ) VALUES (?,?,?,?,99,?,?,?,?,?, 'Bank', ?, ?, 'HDFC0001234', ?, ?, 12, 0.75)
                 `, [
                    fname, lname, `emp${i}@test.com`, `98765432${i.toString().padStart(2, '0')}`,
                    deptId, posId, '2025-01-01', status, salary,
                    'HDFC Bank', `ACC${10000 + i}`, `PAN${10000 + i}`, `UAN${100000 + i}`
                ]);
            }

            // 4. Attendance (Review Period: Last Month, e.g. May 2026 based on user context, let's do Current Month - 1)
            // Attaching to current context contextYear/Month is hard from here, let's generate for Month 4 and 5 of 2026 as per user '2025-2026' usually means April start? 
            // Let's generate for 2026-05 (May) generic

            const emps = await dbManager.all("SELECT id, base_salary FROM employees WHERE company_id=99 AND status='Active'");
            const year = 2026;
            const month = 5; // May
            const days = 31;

            for (const emp of emps) {
                // Attendance
                let presentDays = 0;
                for (let d = 1; d <= days; d++) {
                    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const rand = Math.random();
                    let status = 'Present';
                    if (d % 7 === 0) status = 'Weekly Off';
                    else if (rand > 0.95) status = 'Absent';
                    else if (rand > 0.90) status = 'Leave';

                    if (status === 'Present' || status === 'Weekly Off' || status === 'Leave') presentDays++;

                    await dbManager.run("INSERT INTO attendance (employee_id, date, status, check_in_time, check_out_time) VALUES (?,?,?,?,?)",
                        [emp.id, date, status, '09:00', '18:00']
                    );
                }

                // Payroll
                // Simple Calc
                const gross = emp.base_salary;
                const basic = Math.round(gross * 0.5);
                const pf = Math.round(basic * 0.12);
                const pt = (emp.is_pt_enabled !== 0 && emp.is_pt_enabled !== false) ? 200 : 0;
                const net = gross - pf - pt;

                await dbManager.run(`
                    INSERT INTO payroll (
                        employee_id, pay_period_start, pay_period_end, 
                        base_salary, basic_salary, gross_salary, 
                        pf, professional_tax, total_deductions, net_salary, 
                        status, payment_date
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,'Paid',?)
                 `, [
                    emp.id, `${year}-05-01`, `${year}-05-31`,
                    gross, basic, gross, pf, pt, pf + pt, net, `${year}-05-31`
                ]);
            }

            await dbManager.run("COMMIT");
            return { success: true, count: emps.length };
        } catch (e) {
            console.error(e);
            await dbManager.run("ROLLBACK");
            return { success: false, error: e.message };
        }
    });


    // --- Salary Head Management ---
    ipcMain.handle('get-salary-heads', async (event, { companyId }) => {
        if (!companyId) return [];
        return await dbManager.all("SELECT * FROM salary_heads WHERE company_id = ? ORDER BY id DESC", [companyId]);
    });

    ipcMain.handle('upsert-salary-head', async (event, head) => {
        try {
            if (head.id) {
                await dbManager.run(
                    `UPDATE salary_heads SET 
                        name=?, code=?, form_16_type=?, 
                        is_proportionate=?, consider_for_pf=?, consider_for_esi=?, consider_for_bonus=?, consider_for_overtime=?, 
                        is_active=? 
                     WHERE id=?`,
                    [
                        head.name, head.code, head.form_16_type,
                        head.is_proportionate ? 1 : 0, head.consider_for_pf ? 1 : 0, head.consider_for_esi ? 1 : 0, head.consider_for_bonus ? 1 : 0, head.consider_for_overtime ? 1 : 0,
                        head.is_active ? 1 : 0,
                        head.id
                    ]
                );
            } else {
                await dbManager.run(
                    `INSERT INTO salary_heads (
                        company_id, name, code, form_16_type, 
                        is_proportionate, consider_for_pf, consider_for_esi, consider_for_bonus, consider_for_overtime, 
                        is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        head.company_id, head.name, head.code, head.form_16_type,
                        head.is_proportionate ? 1 : 0, head.consider_for_pf ? 1 : 0, head.consider_for_esi ? 1 : 0, head.consider_for_bonus ? 1 : 0, head.consider_for_overtime ? 1 : 0,
                        head.is_active ? 1 : 0
                    ]
                );
            }
            return { success: true };
        } catch (e) {
            console.error("Upsert Salary Head Error:", e);
            throw e;
        }
    });

    ipcMain.handle('delete-salary-head', async (event, id) => {
        return await dbManager.run("DELETE FROM salary_heads WHERE id = ?", [id]);
    });

    ipcMain.handle('get-next-letter-ref', async () => {
        try {
            const settings = await dbManager.all("SELECT * FROM settings WHERE key IN ('letter_ref_prefix', 'letter_ref_current_no')");
            let prefix = settings.find(s => s.key === 'letter_ref_prefix')?.value || `REF/${new Date().getFullYear()}/`;
            let currentNo = parseInt(settings.find(s => s.key === 'letter_ref_current_no')?.value || '1');

            const formattedNo = String(currentNo).padStart(3, '0');
            const fullRef = `${prefix}${formattedNo}`;

            // Increment and save
            const nextNo = currentNo + 1;
            await dbManager.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('letter_ref_current_no', ?)", [String(nextNo)]);
            
            // Ensure prefix is stored if it doesn't exist
            if (!settings.find(s => s.key === 'letter_ref_prefix')) {
                await dbManager.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('letter_ref_prefix', ?)", [prefix]);
            }

            return fullRef;
        } catch (e) {
            console.error("Error generating letter ref:", e);
            return "REF/ERR/000";
        }
    });

}



// --- Auto Backup Logic (Exported for Main Process) ---
async function performAutoBackup() {
    try {
        // Check if enabled
        const settings = await dbManager.all("SELECT * FROM settings");
        const getSet = (k) => settings.find(s => s.key === k)?.value;

        const enabled = getSet('auto_backup_enabled');
        if (enabled !== 'true') return;

        const customPath = getSet('auto_backup_path');
        const backupDir = customPath || path.join(app.getPath('userData'), 'backups');

        console.log(`Starting Auto Backup at: ${backupDir}`);
        const dbPath = path.join(app.getAppPath(), 'database.sqlite');
        const uploadsDir = path.join(app.getAppPath(), 'uploads');

        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const isFull = getSet('auto_backup_full') === 'true';

        if (isFull) {
            const backupPath = path.join(backupDir, `auto_full_backup_${timestamp}.zip`);
            const zip = new AdmZip();
            if (fs.existsSync(dbPath)) zip.addLocalFile(dbPath);
            if (fs.existsSync(uploadsDir)) zip.addLocalFolder(uploadsDir, 'uploads');
            zip.writeZip(backupPath);
            console.log(`Auto Full Backup Successful: ${backupPath}`);
        } else {
            const backupPath = path.join(backupDir, `auto_db_backup_${timestamp}.sqlite`);
            fs.copyFileSync(dbPath, backupPath);
            console.log(`Auto DB Backup Successful: ${backupPath}`);
        }

        // Optional: Prune old backups (keep last 10)
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('auto_'))
            .map(f => ({ name: f, path: path.join(backupDir, f), time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 10) {
            for (let i = 10; i < files.length; i++) {
                fs.unlinkSync(files[i].path);
                console.log(`Pruned old backup: ${files[i].name}`);
            }
        }

    } catch (e) {
        console.error("Auto Backup Failed:", e);
    }
}

function convertNumberToWords(amount) {
    if (amount === 0) return "Zero";
    var a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    var b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function inWords(num) {
        if ((num = num.toString()).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return ''; var str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str;
    }
    return (inWords(amount) + "Only").trim();
}

module.exports = { setupIPC, generatePayrollInternal, performAutoBackup, convertNumberToWords };
