-- SaralPayPack Clone — MySQL schema
-- Consolidated from the MpxHR Electron/SQLite app, cleaned up for MySQL (InnoDB, utf8mb4, DECIMAL money fields).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Org structure
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    phone VARCHAR(30),
    phone2 VARCHAR(30),
    email VARCHAR(255),
    website VARCHAR(255),
    address VARCHAR(255),
    address2 VARCHAR(255),
    address3 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    business_type VARCHAR(100),
    est_date DATE,
    logo VARCHAR(500),
    -- Statutory identifiers
    pan VARCHAR(20),
    tan VARCHAR(20),
    gstin VARCHAR(20),
    cin VARCHAR(30),
    pf_code VARCHAR(50),
    pf_est_code VARCHAR(50),
    pf_ext VARCHAR(50),
    pf_signatory VARCHAR(255),
    pf_local_office VARCHAR(255),
    esi_code VARCHAR(50),
    esi_local_office VARCHAR(255),
    esi_signatory VARCHAR(255),
    pt_rc_no VARCHAR(50),
    pt_ec_no VARCHAR(50),
    tax_circle VARCHAR(100),
    tax_cit VARCHAR(100),
    lwf_reg_no VARCHAR(50),
    -- Banking
    bank_name VARCHAR(255),
    bank_branch VARCHAR(255),
    bank_account VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_micr VARCHAR(20),
    bank_cheque_label VARCHAR(255),
    -- Signatories
    signatory_name VARCHAR(255),
    signatory_designation VARCHAR(255),
    signatory_father VARCHAR(255),
    director1_name VARCHAR(255),
    director1_designation VARCHAR(255),
    director1_father VARCHAR(255),
    director2_name VARCHAR(255),
    director2_designation VARCHAR(255),
    director2_father VARCHAR(255),

    -- Subscription / application control (platform-level, managed by Super Admin)
    subscription_plan_id INT,
    subscription_status VARCHAR(20) DEFAULT 'Trial', -- Trial, Active, Expired, Suspended
    trial_ends_at DATE,
    subscription_starts_at DATE,
    subscription_ends_at DATE,
    is_active TINYINT(1) DEFAULT 1, -- kill switch: 0 blocks this tenant app-wide

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    price_per_month DECIMAL(12,2) DEFAULT 0,
    price_per_year DECIMAL(12,2) DEFAULT 0,
    max_employees INT,
    max_companies INT,
    features VARCHAR(1000), -- comma-separated feature/module keys included in this plan
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_department_company_name (company_id, name),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department_id INT,
    base_salary DECIMAL(12,2) DEFAULT 0,
    description VARCHAR(500),
    lwf_category VARCHAR(100),
    deduct_pt TINYINT(1) DEFAULT 1,
    probation_period_days INT DEFAULT 90,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(50),
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    father_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(30),
    company_id INT,
    branch_id INT,
    department_id INT,
    position_id INT,
    category_id INT,
    date_of_joining DATE,
    exit_date DATE,
    status VARCHAR(30) DEFAULT 'Active',
    gender VARCHAR(20),
    dob DATE,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    blood_group VARCHAR(10),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(30),

    -- Bank
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    payment_mode VARCHAR(30) DEFAULT 'Bank',

    -- Statutory identifiers
    pan_number VARCHAR(20),
    aadhaar_number VARCHAR(20),
    pf_number VARCHAR(50),
    esi_number VARCHAR(50),
    uan VARCHAR(50),

    -- Salary structure (monthly, fixed components)
    base_salary DECIMAL(12,2) DEFAULT 0,
    da_rate DECIMAL(12,2) DEFAULT 0,
    hra_rate DECIMAL(12,2) DEFAULT 0,
    conveyance_allowance DECIMAL(12,2) DEFAULT 0,
    medical_allowance DECIMAL(12,2) DEFAULT 0,
    special_allowance_fixed DECIMAL(12,2) DEFAULT 0,
    wage_basis VARCHAR(30) DEFAULT 'Monthly',

    -- Statutory toggles
    is_pf_enabled TINYINT(1) DEFAULT 1,
    pf_rate DECIMAL(5,2) DEFAULT 12,
    pf_limit_enabled TINYINT(1) DEFAULT 1,
    pf_limit DECIMAL(12,2) DEFAULT 15000,
    vpf_percent DECIMAL(5,2) DEFAULT 0,
    is_esi_enabled TINYINT(1) DEFAULT 0,
    esi_rate DECIMAL(5,2) DEFAULT 0,
    is_pt_enabled TINYINT(1) DEFAULT 1,
    tax_regime VARCHAR(10) DEFAULT 'New', -- 'New' or 'Old' income-tax regime for TDS

    -- Lifecycle
    is_confirmed TINYINT(1) DEFAULT 0,
    probation_end_date DATE,
    is_transfer_eligible TINYINT(1) DEFAULT 0,
    transfer_date DATE,
    salary_from DATE,
    photo VARCHAR(500),
    salary_structure_id INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES employee_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    from_company_id INT,
    to_company_id INT,
    from_branch_id INT,
    to_branch_id INT,
    transfer_date DATE,
    reason VARCHAR(500),
    status VARCHAR(30) DEFAULT 'Completed',
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    doc_type VARCHAR(100),
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Auth / users
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) DEFAULT 'Admin',
    employee_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Settings & salary structure config
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(100) PRIMARY KEY,
    value VARCHAR(500),
    description VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    to_address VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template VARCHAR(100), -- e.g. 'payslip_ready' — which notification triggered this
    employee_id INT,
    status VARCHAR(20) NOT NULL, -- 'Sent' (via real SMTP) or 'Logged' (no SMTP configured, dev/demo mode)
    error VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    doc_type VARCHAR(100), -- e.g. 'Aadhaar', 'PAN Card', 'Certificate', 'Other'
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL, -- filename on disk under uploads/employee-docs/
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sms_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    to_number VARCHAR(20) NOT NULL,
    message VARCHAR(500) NOT NULL,
    template VARCHAR(100),
    employee_id INT,
    status VARCHAR(20) NOT NULL, -- 'Sent' (via real gateway) or 'Logged' (no gateway configured, dev/demo mode)
    error VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    user_id INT,
    username VARCHAR(150),
    action VARCHAR(20) NOT NULL, -- Create, Update, Delete
    entity_type VARCHAR(100) NOT NULL, -- 'Employee', 'Payroll', 'Company', 'User', ...
    entity_id INT,
    summary VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS salary_heads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description VARCHAR(500),
    type VARCHAR(20) DEFAULT 'Earning',
    form_16_type VARCHAR(100) DEFAULT 'Salary u/s 17(1)',
    is_proportionate TINYINT(1) DEFAULT 1,
    consider_for_pf TINYINT(1) DEFAULT 0,
    consider_for_esi TINYINT(1) DEFAULT 0,
    consider_for_bonus TINYINT(1) DEFAULT 0,
    consider_for_overtime TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_defined_deductions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    calc_type VARCHAR(20) DEFAULT 'Fixed',
    amount DECIMAL(12,2) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    loan_type VARCHAR(100) DEFAULT 'General',
    principal_amount DECIMAL(12,2) DEFAULT 0,
    monthly_emi DECIMAL(12,2) DEFAULT 0,
    start_date DATE,
    balance DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Attendance & shifts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(100) NOT NULL,
    start_time TIME,
    end_time TIME,
    grace_period_mins INT DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    shift_id INT,
    date DATE,
    UNIQUE KEY uq_employee_shift_date (employee_id, date),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    status VARCHAR(30), -- Present, Absent, Late, Half-Day
    shift_id INT,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    source VARCHAR(30) DEFAULT 'Manual',
    notes VARCHAR(500),
    remarks VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attendance_employee_date (employee_id, date),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(255),
    date DATE,
    type VARCHAR(50),
    UNIQUE KEY uq_holiday_company_date (company_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Leave management
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leave_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(100),
    short_code VARCHAR(10),
    max_days INT,
    color VARCHAR(20),

    -- Allotment basis
    allotment_from_basis VARCHAR(30) DEFAULT 'Joining Date', -- Joining Date, Confirmation Date, Probationary Completion Date
    allotment_after_months INT DEFAULT 0,
    allotment_after_days INT DEFAULT 0,
    avail_from_basis VARCHAR(30) DEFAULT 'Joining Date',
    avail_after_months INT DEFAULT 0,
    avail_after_days INT DEFAULT 0,

    -- Auto allotment
    auto_allotment_enabled TINYINT(1) DEFAULT 1,
    allot_type VARCHAR(20) DEFAULT 'Yearly', -- Monthly, Half Yearly, Yearly
    year_type VARCHAR(20) DEFAULT 'Calendar Year', -- Calendar Year, Financial Year
    allot_round_off VARCHAR(20) DEFAULT 'None',
    allot_as_per VARCHAR(30) DEFAULT 'Current Half-Year',

    -- Carry over
    carry_over_enabled TINYINT(1) DEFAULT 0,
    carry_over_lower_limit DECIMAL(6,2),
    carry_over_upper_limit DECIMAL(6,2),
    lapse_unavailed_on VARCHAR(20), -- e.g. month name / 'March'
    lapse_exceeding DECIMAL(6,2),

    balance_round_off VARCHAR(20) DEFAULT 'None',
    encashment_enabled TINYINT(1) DEFAULT 0,
    encashment_min_balance DECIMAL(6,2) DEFAULT 0,
    priority INT DEFAULT 0,
    remarks VARCHAR(500),

    UNIQUE KEY uq_leave_type_company_name (company_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    leave_type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(500),
    status VARCHAR(30) DEFAULT 'Pending',
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance_regularizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    requested_status VARCHAR(30) NOT NULL, -- Present, Half-Day, On Leave, ... the correction being asked for
    reason VARCHAR(500),
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Approved, Rejected
    remarks VARCHAR(500),
    reviewed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expense_claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    category VARCHAR(30) NOT NULL, -- Travel, Medical, LTA, Telephone, Food, Office Supplies, Other
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    description VARCHAR(500),
    receipt_original_name VARCHAR(255),
    receipt_stored_name VARCHAR(255), -- filename on disk under uploads/expense-receipts/, if a receipt was attached
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Approved, Rejected, Paid
    remarks VARCHAR(500),
    reviewed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Perquisites (non-cash benefits) per employee per financial year, feeding Form 12BA. Real
-- Form 12BA valuation (Income Tax Rule 3 — accommodation, motor car, ESOP, concessional
-- loans, etc.) has wildly different rules per perquisite type and isn't something payroll
-- software auto-computes; HR enters the already-valued amount here, same as real practice.
CREATE TABLE IF NOT EXISTS perquisites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    financial_year VARCHAR(9) NOT NULL, -- e.g. '2025-2026'
    perquisite_type VARCHAR(60) NOT NULL, -- Accommodation, Motor Car, ESOP, Concessional Loan, Club Membership, Gifts/Vouchers, Other
    description VARCHAR(255),
    value DECIMAL(12,2) NOT NULL, -- value of perquisite as per Rule 3
    amount_recovered DECIMAL(12,2) DEFAULT 0, -- amount, if any, recovered from the employee
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_balances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    leave_type VARCHAR(100),
    year INT,
    balance DECIMAL(6,2),
    used DECIMAL(6,2) DEFAULT 0,
    UNIQUE KEY uq_leave_balance (employee_id, leave_type, year),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Payroll
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payroll_months (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    status VARCHAR(20) DEFAULT 'Open', -- Open, Closed
    locked TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_payroll_month (company_id, year, month),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,

    base_salary DECIMAL(12,2) DEFAULT 0,   -- full monthly gross CTC before proration
    basic_salary DECIMAL(12,2) DEFAULT 0,
    da DECIMAL(12,2) DEFAULT 0,
    hra DECIMAL(12,2) DEFAULT 0,
    conveyance DECIMAL(12,2) DEFAULT 0,
    medical DECIMAL(12,2) DEFAULT 0,
    special_allowance DECIMAL(12,2) DEFAULT 0,
    bonuses DECIMAL(12,2) DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    overtime_amount DECIMAL(12,2) DEFAULT 0,

    employee_pf DECIMAL(12,2) DEFAULT 0,
    employer_pf DECIMAL(12,2) DEFAULT 0,
    employer_eps DECIMAL(12,2) DEFAULT 0,
    vpf_percent DECIMAL(5,2) DEFAULT 0,
    vpf_amount DECIMAL(12,2) DEFAULT 0,
    employee_esi DECIMAL(12,2) DEFAULT 0,
    employer_esi DECIMAL(12,2) DEFAULT 0,
    professional_tax DECIMAL(12,2) DEFAULT 0,
    tds DECIMAL(12,2) DEFAULT 0,
    tds_transferred TINYINT(1) DEFAULT 0,
    loan_deduction DECIMAL(12,2) DEFAULT 0,
    user_defined_deduction DECIMAL(12,2) DEFAULT 0,
    other_deductions DECIMAL(12,2) DEFAULT 0,
    lop_amount DECIMAL(12,2) DEFAULT 0,

    gross_salary DECIMAL(12,2) DEFAULT 0,
    total_deductions DECIMAL(12,2) DEFAULT 0,
    net_salary DECIMAL(12,2) NOT NULL,

    payment_date DATE,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Paid
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_payroll_employee_period (employee_id, pay_period_start, pay_period_end),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(255),
    serial_number VARCHAR(100) UNIQUE,
    type VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Available',
    assigned_to INT,
    assigned_date DATE,
    value DECIMAL(12,2),
    FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Recruitment (ATS)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    title VARCHAR(255),
    department_id INT,
    description VARCHAR(1000),
    status VARCHAR(30) DEFAULT 'Open',
    created_at DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(30),
    status VARCHAR(30) DEFAULT 'Applied', -- Applied, Interview, Offer, Hired, Rejected
    notes VARCHAR(1000),
    resume_path VARCHAR(500),
    converted_employee_id INT, -- set once this candidate has been converted to an employee record
    created_at DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (converted_employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    round VARCHAR(100) NOT NULL, -- e.g. 'Screening', 'Technical', 'HR', 'Final'
    scheduled_at DATETIME NOT NULL,
    interviewer_name VARCHAR(255),
    mode VARCHAR(30) DEFAULT 'In-Person', -- In-Person, Phone, Video
    status VARCHAR(20) DEFAULT 'Scheduled', -- Scheduled, Completed, Cancelled, No-Show
    rating TINYINT, -- 1-5, set alongside feedback
    recommendation VARCHAR(20), -- Hire, No Hire, Hold
    feedback VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    task VARCHAR(500),
    is_completed TINYINT(1) DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Performance
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS performance_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    review_period VARCHAR(20), -- e.g. "2024-Q1"
    status VARCHAR(30) DEFAULT 'Draft', -- Draft, Submitted, Reviewed
    self_rating INT,
    self_comments VARCHAR(1000),
    manager_rating INT,
    manager_comments VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Helpdesk
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    category VARCHAR(100),
    priority VARCHAR(20),
    subject VARCHAR(255),
    description VARCHAR(1000),
    status VARCHAR(30) DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Salary structures (templates of salary heads applied to an employee)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS salary_structures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS salary_structure_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    structure_id INT NOT NULL,
    salary_head_id INT NOT NULL,
    print_name VARCHAR(255),
    valid_from DATE,
    valid_to DATE, -- NULL = till date
    calc_basis VARCHAR(20) DEFAULT 'Special', -- Special, Independent
    calc_type VARCHAR(30) DEFAULT 'Lumpsum', -- Lumpsum, Formula, Every Month, % of Basic
    calc_value DECIMAL(12,2) DEFAULT 0, -- fixed amount, or % when calc_type = '% of Basic'
    formula VARCHAR(500),
    consider_for_pf TINYINT(1) DEFAULT 0,
    consider_for_esi TINYINT(1) DEFAULT 0,
    consider_for_pt TINYINT(1) DEFAULT 0,
    round_off VARCHAR(20) DEFAULT 'Nearest Rupee',
    display_order INT DEFAULT 0,
    remarks VARCHAR(500),
    FOREIGN KEY (structure_id) REFERENCES salary_structures(id) ON DELETE CASCADE,
    FOREIGN KEY (salary_head_id) REFERENCES salary_heads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Full & Final Settlement
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fnf_settlements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date_of_leaving DATE,
    reason_for_leaving VARCHAR(255),
    include_last_month_salary TINYINT(1) DEFAULT 1,
    include_pending_advance TINYINT(1) DEFAULT 0,
    include_open_component TINYINT(1) DEFAULT 0,
    include_held_salary TINYINT(1) DEFAULT 0,
    include_pending_loan TINYINT(1) DEFAULT 0,
    gratuity_amount DECIMAL(12,2) DEFAULT 0,
    leave_encashment_amount DECIMAL(12,2) DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    total_deductions DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Draft', -- Draft, Created, Paid
    remarks VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fnf_settlement_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    settlement_id INT NOT NULL,
    type VARCHAR(20) NOT NULL, -- Earning, Deduction
    description VARCHAR(255),
    actual_amount DECIMAL(12,2) DEFAULT 0,
    modified_amount DECIMAL(12,2) DEFAULT 0,
    tds_ref VARCHAR(100),
    FOREIGN KEY (settlement_id) REFERENCES fnf_settlements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Attendance configuration (named policies: NWD basis, OT, register type)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS attendance_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    name VARCHAR(150) NOT NULL,
    salary_calculation VARCHAR(20) DEFAULT 'Dependent', -- Dependent, Independent
    overtime1_enabled TINYINT(1) DEFAULT 0, -- overtime on a working day, beyond standard_hours_per_day
    overtime2_enabled TINYINT(1) DEFAULT 0, -- overtime on a weekly-off/holiday, any hours worked
    standard_hours_per_day DECIMAL(4,2) DEFAULT 8.00,
    overtime_rate_multiplier DECIMAL(4,2) DEFAULT 1.50,
    nwd_type VARCHAR(50) DEFAULT 'Actual Days/Month',
    -- Actual Days/Month, Only Working Days, Only Working Days + Weekly Holiday,
    -- Only Working Days + Holiday, Fixed 30 Days/Month, Allow User to Edit Days in Month
    register_type VARCHAR(20) DEFAULT 'Daily', -- Leave Register, Monthly, Daily, Hourly
    allow_more_than_working_days TINYINT(1) DEFAULT 0,
    remarks VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Tax declarations (employee-submitted investment proofs for TDS computation)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tax_declarations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    financial_year VARCHAR(10) NOT NULL, -- e.g. "2026-2027"
    section_80c DECIMAL(12,2) DEFAULT 0, -- PF/PPF/ELSS/life insurance/tuition etc, capped at 150000 in calc
    section_80ccd DECIMAL(12,2) DEFAULT 0, -- NPS additional
    section_80d DECIMAL(12,2) DEFAULT 0, -- medical insurance premium
    hra_exemption_claimed DECIMAL(12,2) DEFAULT 0,
    home_loan_interest DECIMAL(12,2) DEFAULT 0, -- Section 24
    other_deductions DECIMAL(12,2) DEFAULT 0,
    total_declared DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Draft', -- Draft, Submitted, Approved, Rejected
    remarks VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_declaration_employee_fy (employee_id, financial_year),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Letters (appointment / offer / relieving / increment — generated from templates)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS letters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- Appointment, Offer, Relieving, Increment, Experience
    content TEXT, -- rendered letter body (placeholders already substituted) at time of generation
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by INT,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
