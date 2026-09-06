const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');
const { hashPassword } = require('../utils/password');
const { DEFAULT_SETTINGS, DEFAULT_LEAVE_TYPES, ROLES } = require('../constants');

// schema.sql uses CREATE TABLE IF NOT EXISTS, so re-running migrate never alters a table
// that already exists. When a later schema revision adds columns to an existing table,
// list them here — same ensureColumn pattern the original SQLite app used for evolving
// its schema in place, ported to information_schema for MySQL.
const COLUMN_UPGRADES = [
    ['employees', 'salary_structure_id', 'INT'],
    ['companies', 'subscription_plan_id', 'INT'],
    ['companies', 'subscription_status', "VARCHAR(20) DEFAULT 'Trial'"],
    ['companies', 'trial_ends_at', 'DATE'],
    ['companies', 'subscription_starts_at', 'DATE'],
    ['companies', 'subscription_ends_at', 'DATE'],
    ['companies', 'is_active', 'TINYINT(1) DEFAULT 1'],
    ['leave_types', 'short_code', 'VARCHAR(10)'],
    ['leave_types', 'allotment_from_basis', "VARCHAR(30) DEFAULT 'Joining Date'"],
    ['leave_types', 'allotment_after_months', 'INT DEFAULT 0'],
    ['leave_types', 'allotment_after_days', 'INT DEFAULT 0'],
    ['leave_types', 'avail_from_basis', "VARCHAR(30) DEFAULT 'Joining Date'"],
    ['leave_types', 'avail_after_months', 'INT DEFAULT 0'],
    ['leave_types', 'avail_after_days', 'INT DEFAULT 0'],
    ['leave_types', 'auto_allotment_enabled', 'TINYINT(1) DEFAULT 1'],
    ['leave_types', 'allot_type', "VARCHAR(20) DEFAULT 'Yearly'"],
    ['leave_types', 'year_type', "VARCHAR(20) DEFAULT 'Calendar Year'"],
    ['leave_types', 'allot_round_off', "VARCHAR(20) DEFAULT 'None'"],
    ['leave_types', 'allot_as_per', "VARCHAR(30) DEFAULT 'Current Half-Year'"],
    ['leave_types', 'carry_over_enabled', 'TINYINT(1) DEFAULT 0'],
    ['leave_types', 'carry_over_lower_limit', 'DECIMAL(6,2)'],
    ['leave_types', 'carry_over_upper_limit', 'DECIMAL(6,2)'],
    ['leave_types', 'lapse_unavailed_on', 'VARCHAR(20)'],
    ['leave_types', 'lapse_exceeding', 'DECIMAL(6,2)'],
    ['leave_types', 'balance_round_off', "VARCHAR(20) DEFAULT 'None'"],
    ['leave_types', 'encashment_enabled', 'TINYINT(1) DEFAULT 0'],
    ['leave_types', 'encashment_min_balance', 'DECIMAL(6,2) DEFAULT 0'],
    ['leave_types', 'priority', 'INT DEFAULT 0'],
    ['leave_types', 'remarks', 'VARCHAR(500)'],
    ['shifts', 'company_id', 'INT'],
    ['assets', 'company_id', 'INT'],
    ['jobs', 'company_id', 'INT'],
    ['employees', 'tax_regime', "VARCHAR(10) DEFAULT 'New'"],
    ['attendance_configs', 'standard_hours_per_day', 'DECIMAL(4,2) DEFAULT 8.00'],
    ['attendance_configs', 'overtime_rate_multiplier', 'DECIMAL(4,2) DEFAULT 1.50'],
    ['payroll', 'overtime_hours', 'DECIMAL(6,2) DEFAULT 0'],
    ['payroll', 'overtime_amount', 'DECIMAL(12,2) DEFAULT 0'],
    ['candidates', 'converted_employee_id', 'INT'],
];

async function ensureColumn(conn, database, table, column, definition) {
    const [rows] = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [database, table, column]
    );
    if (rows.length > 0) return;
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[migrate] Added column ${table}.${column}`);
}

// payroll_months moved from a global UNIQUE(year, month) to a per-company
// UNIQUE(company_id, year, month) — a column add alone isn't enough here, the unique
// index itself has to change, and it can't hold a NOT NULL company_id on a table that
// may already have unscoped rows from before this fix. Existing rows are left with
// company_id = NULL (unscoped/orphaned) rather than guessed at.
async function migratePayrollMonthsToPerCompany(conn, database) {
    const [cols] = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payroll_months' AND COLUMN_NAME = 'company_id'`,
        [database]
    );
    if (cols.length > 0) return; // already migrated

    await conn.query('ALTER TABLE payroll_months ADD COLUMN company_id INT NULL AFTER id');
    const [indexes] = await conn.query(
        `SELECT DISTINCT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payroll_months' AND INDEX_NAME = 'uq_payroll_month'`,
        [database]
    );
    if (indexes.length > 0) {
        await conn.query('ALTER TABLE payroll_months DROP INDEX uq_payroll_month');
    }
    await conn.query('ALTER TABLE payroll_months ADD UNIQUE KEY uq_payroll_month (company_id, year, month)');
    await conn.query(
        `ALTER TABLE payroll_months ADD CONSTRAINT fk_payroll_months_company
         FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE`
    );
    console.log('[migrate] payroll_months is now scoped per-company (existing rows left unscoped).');
}

// Companies created before DEFAULT_LEAVE_TYPES existed have zero leave_types rows, which
// left the (now-dynamic) leave-request dropdown empty for them. One-time backfill: any
// company with no leave types yet gets the same default set new companies are seeded with.
async function backfillDefaultLeaveTypes(conn) {
    const [companies] = await conn.query('SELECT id FROM companies');
    for (const { id: companyId } of companies) {
        const [[{ count }]] = await conn.query(
            'SELECT COUNT(*) as count FROM leave_types WHERE company_id = ?',
            [companyId]
        );
        if (count > 0) continue;
        for (const lt of DEFAULT_LEAVE_TYPES) {
            await conn.query(
                `INSERT IGNORE INTO leave_types (company_id, name, short_code, max_days, color, priority, auto_allotment_enabled)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [companyId, lt.name, lt.short_code, lt.max_days, lt.color, lt.priority, lt.auto_allotment_enabled ?? 1]
            );
        }
        console.log(`[migrate] Backfilled default leave types for company ${companyId}.`);
    }
}

async function migrate() {
    // Connect without a database first so we can create it if missing.
    const rootConn = await mysql.createConnection({
        host: env.db.host,
        port: env.db.port,
        user: env.db.user,
        password: env.db.password,
        ssl: env.db.ssl,
        multipleStatements: true,
    });

    await rootConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await rootConn.end();

    const conn = await mysql.createConnection({
        host: env.db.host,
        port: env.db.port,
        user: env.db.user,
        password: env.db.password,
        database: env.db.database,
        ssl: env.db.ssl,
        multipleStatements: true,
    });

    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log(`[migrate] Applying schema to database "${env.db.database}"...`);
    await conn.query(schemaSql);
    console.log('[migrate] Schema applied.');

    for (const [table, column, definition] of COLUMN_UPGRADES) {
        await ensureColumn(conn, env.db.database, table, column, definition);
    }
    console.log('[migrate] Column upgrades checked.');

    await migratePayrollMonthsToPerCompany(conn, env.db.database);
    await backfillDefaultLeaveTypes(conn);

    for (const [key, value, description] of DEFAULT_SETTINGS) {
        await conn.query(
            'INSERT IGNORE INTO settings (`key`, value, description) VALUES (?, ?, ?)',
            [key, value, description]
        );
    }
    console.log('[migrate] Default statutory settings seeded.');

    const [existing] = await conn.query('SELECT id, role FROM users WHERE username = ?', ['admin']);
    if (existing.length === 0) {
        await conn.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            ['admin', hashPassword('admin123'), ROLES.SUPER_ADMIN]
        );
        console.log('[migrate] Default Super Admin user created (username: admin / password: admin123 — change this immediately).');
    } else if (existing[0].role !== ROLES.SUPER_ADMIN) {
        await conn.query('UPDATE users SET role = ? WHERE id = ?', [ROLES.SUPER_ADMIN, existing[0].id]);
        console.log('[migrate] Promoted existing "admin" user to Super Admin so it can access subscription/application control.');
    } else {
        console.log('[migrate] Admin user already exists, skipping seed.');
    }

    const [existingPlan] = await conn.query('SELECT id FROM subscription_plans WHERE code = ?', ['free-trial']);
    if (existingPlan.length === 0) {
        await conn.query(
            `INSERT INTO subscription_plans (name, code, price_per_month, price_per_year, max_employees, max_companies, features)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['Free Trial', 'free-trial', 0, 0, 10, 1, 'payroll,attendance,leave,reports']
        );
        console.log('[migrate] Default "Free Trial" subscription plan seeded.');
    }

    await conn.end();
    console.log('[migrate] Done.');
}

migrate().catch((err) => {
    console.error('[migrate] Failed:', err);
    process.exit(1);
});
