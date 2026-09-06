CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    department_id INTEGER,
    base_salary REAL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    status TEXT, -- Present, Absent, Late, Half-Day
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, shift_id INTEGER, overtime_hours REAL DEFAULT 0, remarks TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    leave_type TEXT NOT NULL, -- Sick, Casual, Annual, Unpaid
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS payroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    base_salary REAL NOT NULL,
    deductions REAL DEFAULT 0,
    bonuses REAL DEFAULT 0,
    net_salary REAL NOT NULL,
    payment_date DATE,
    status TEXT DEFAULT 'Pending', -- Pending, Paid
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, basic_salary REAL DEFAULT 0, hra REAL DEFAULT 0, special_allowance REAL DEFAULT 0, pf REAL DEFAULT 0, professional_tax REAL DEFAULT 0, tds REAL DEFAULT 0, lop_amount REAL DEFAULT 0, gross_salary REAL DEFAULT 0, total_deductions REAL DEFAULT 0, other_deductions REAL DEFAULT 0, da REAL DEFAULT 0, employer_pf REAL DEFAULT 0, esi REAL DEFAULT 0, employer_esi REAL DEFAULT 0, employee_pf REAL DEFAULT 0, employer_eps REAL DEFAULT 0, employee_esi REAL DEFAULT 0, conveyance REAL DEFAULT 0, medical REAL DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,

    role TEXT DEFAULT 'Admin',
    employee_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            doc_type TEXT,
            file_name TEXT,
            file_path TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            serial_number TEXT UNIQUE,
            type TEXT,
            status TEXT DEFAULT 'Available',
            assigned_to INTEGER,
            assigned_date DATE,
            value REAL,
            FOREIGN KEY(assigned_to) REFERENCES employees(id)
        );

CREATE TABLE IF NOT EXISTS holidays (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, date DATE UNIQUE, type TEXT, company_id INTEGER);

CREATE TABLE IF NOT EXISTS leave_balances (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER, leave_type TEXT, year INTEGER, balance REAL, used REAL DEFAULT 0, UNIQUE(employee_id, leave_type, year));

CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            department_id INTEGER,
            description TEXT,
            status TEXT DEFAULT 'Open',
            created_at DATE DEFAULT CURRENT_TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS candidates (
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
        );

CREATE TABLE IF NOT EXISTS onboarding_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            task TEXT,
            is_completed BOOLEAN DEFAULT 0,
            FOREIGN KEY(employee_id) REFERENCES employees(id)
        );

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    logo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
, code TEXT, est_date DATE, business_type TEXT, address_2 TEXT, address_3 TEXT, city TEXT, state TEXT, zip_code TEXT, phone_2 TEXT, email TEXT, website TEXT, pan TEXT, tan TEXT, gstin TEXT, cin TEXT, pf_code TEXT, esi_code TEXT, pt_rc_no TEXT, pt_ec_no TEXT, pf_est_code TEXT, pf_db_code TEXT, pf_ext TEXT, pf_signatory TEXT, esi_local_office TEXT, esi_signatory TEXT, tax_circle TEXT, tax_cit_loc TEXT, bank_name TEXT, account_no TEXT, bank_branch TEXT, ifsc TEXT, micr TEXT, signatory_name TEXT, signatory_father TEXT, signatory_designation TEXT, address2 TEXT, address3 TEXT, pin TEXT, phone2 TEXT, gst TEXT, pf_dbfile TEXT, pf_est TEXT, esi_office TEXT, tax_cit TEXT, pt_reg TEXT, lwf_reg TEXT, bank_account TEXT, bank_ifsc TEXT, bank_cheque_label TEXT, director1_name TEXT, director1_designation TEXT, director1_father TEXT, director2_name TEXT, director2_designation TEXT, director2_father TEXT);

CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS payroll_months (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    status TEXT CHECK(status IN ('Open','Closed')) DEFAULT 'Open',
    locked INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            start_time TIME,
            end_time TIME,
            grace_period_mins INTEGER DEFAULT 15,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS employee_shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            shift_id INTEGER,
            date DATE, -- YYYY-MM-DD
            UNIQUE(employee_id, date),
            FOREIGN KEY(employee_id) REFERENCES employees(id),
            FOREIGN KEY(shift_id) REFERENCES shifts(id)
        );

CREATE TABLE IF NOT EXISTS performance_reviews (
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
        );

CREATE TABLE IF NOT EXISTS tickets (
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
        );

CREATE TABLE IF NOT EXISTS db_meta (
            key TEXT PRIMARY KEY,
            value TEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

CREATE TABLE IF NOT EXISTS salary_heads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER,
                name TEXT NOT NULL,
                code TEXT,
                description TEXT,
                
                type TEXT CHECK(type IN ('Earning','Deduction')) DEFAULT 'Earning',
                form_16_type TEXT DEFAULT 'Salary u/s 17(1)',
                
                -- Checkbox Configuration
                is_proportionate BOOLEAN DEFAULT 1,
                consider_for_pf BOOLEAN DEFAULT 0,
                consider_for_esi BOOLEAN DEFAULT 0,
                consider_for_bonus BOOLEAN DEFAULT 0,
                consider_for_overtime BOOLEAN DEFAULT 0,
                
                is_active BOOLEAN DEFAULT 1,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(company_id) REFERENCES companies(id)
            );

CREATE TABLE IF NOT EXISTS leave_types (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                name TEXT, 
                max_days INTEGER, 
                color TEXT, 
                company_id INTEGER,
                UNIQUE(name, company_id)
            );

CREATE TABLE IF NOT EXISTS employees (
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
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(department_id) REFERENCES departments(id),
                    FOREIGN KEY(position_id) REFERENCES positions(id),
                    FOREIGN KEY(company_id) REFERENCES companies(id),
                    FOREIGN KEY(branch_id) REFERENCES branches(id)
                );

