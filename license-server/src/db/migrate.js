const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');
const { hashPassword } = require('../utils/password');

// Priced against real 2026 India market data (Zoho Payroll, greytHR, Keka, RazorpayX
// Payroll) rather than guessed — see the pricing chapter in guide/ for the comparison.
// Two things this deliberately does differently from a naive "match the market" copy:
//   1. Free is *permanent* up to a small headcount, not a time-boxed trial — that's how
//      Zoho/greytHR's actual free tiers work, and it costs us near-nothing since every
//      client installation runs on the client's own server, not ours.
//   2. Effective per-employee price goes DOWN as tiers go up (₹80 → ₹32 → ₹25 → ₹12),
//      the opposite of every competitor above, who all get *more* expensive per head as
//      you grow. That's the intentional edge at the top of the ladder — cheapest low tier
//      roughly matches the market, but Growth and Professional undercut everyone by
//      3-10x at real volume, which is the wedge for multi-company payroll consultancies.
const DEFAULT_PLANS = [
    {
        name: 'Free',
        max_companies: 1, max_employees: 10, monthly_price_inr: 0,
        features: ['payroll', 'attendance', 'leave', 'reports'],
        price_notes: 'Permanent, not a trial — matches Zoho/greytHR\'s actual free tiers. Costs us nothing; the client hosts it.',
    },
    {
        name: 'Starter',
        max_companies: 1, max_employees: 25, monthly_price_inr: 799,
        features: ['payroll', 'attendance', 'leave', 'reports'],
        price_notes: 'Slightly under Zoho\'s ₹1,000 for the same headcount.',
    },
    {
        name: 'Growth',
        max_companies: 3, max_employees: 100, monthly_price_inr: 2499,
        features: ['payroll', 'attendance', 'leave', 'reports', 'statutory_filing', 'recruitment', 'ess'],
        price_notes: 'Where most customers land — roughly 1/3 to 1/6 of Zoho/greytHR/Keka at 100 employees.',
    },
    {
        name: 'Professional',
        max_companies: 10, max_employees: 500, monthly_price_inr: 5999,
        features: ['payroll', 'attendance', 'leave', 'reports', 'statutory_filing', 'recruitment', 'ess', 'letters', 'assets', 'helpdesk', 'performance_reviews'],
        price_notes: 'Multi-branch businesses & payroll consultancies — roughly 1/7th of Keka at 500 employees.',
    },
    {
        name: 'Enterprise',
        max_companies: null, max_employees: null, monthly_price_inr: null,
        features: ['payroll', 'attendance', 'leave', 'reports', 'statutory_filing', 'recruitment', 'ess', 'letters', 'assets', 'helpdesk', 'performance_reviews'],
        price_notes: 'Custom pricing — unlimited companies/employees, negotiated by conversation, not self-serve',
    },
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

async function migrate() {
    const rootConn = await mysql.createConnection({
        host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password,
        ssl: env.db.ssl, multipleStatements: true,
    });
    await rootConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await rootConn.end();

    const conn = await mysql.createConnection({
        host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password,
        database: env.db.database, ssl: env.db.ssl, multipleStatements: true,
    });

    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log(`[migrate] Applying schema to database "${env.db.database}"...`);
    await conn.query(schemaSql);
    console.log('[migrate] Schema applied.');

    await ensureColumn(conn, env.db.database, 'license_plans', 'max_employees', 'INT DEFAULT NULL');
    await ensureColumn(conn, env.db.database, 'license_plans', 'monthly_price_inr', 'INT DEFAULT NULL');
    console.log('[migrate] Column upgrades checked.');

    const [existingAdmin] = await conn.query('SELECT id FROM admin_users WHERE username = ?', ['vendor']);
    if (existingAdmin.length === 0) {
        await conn.query(
            'INSERT INTO admin_users (username, password) VALUES (?, ?)',
            ['vendor', hashPassword('vendor123')]
        );
        console.log('[migrate] Default vendor admin created (username: vendor / password: vendor123 — change this immediately).');
    } else {
        console.log('[migrate] Vendor admin already exists, skipping seed.');
    }

    // One-time rename: the old seed called the free tier "Trial" and time-boxed it in its
    // notes only (never actually enforced as an expiry — the cap was always the real
    // limit). Renaming in place preserves any licenses already issued against it.
    const [oldTrial] = await conn.query('SELECT id FROM license_plans WHERE name = ?', ['Trial']);
    const [newFree] = await conn.query('SELECT id FROM license_plans WHERE name = ?', ['Free']);
    if (oldTrial.length > 0 && newFree.length === 0) {
        await conn.query('UPDATE license_plans SET name = ? WHERE id = ?', ['Free', oldTrial[0].id]);
        console.log('[migrate] Renamed plan "Trial" -> "Free" (now a permanent tier, not time-boxed).');
    }

    for (const plan of DEFAULT_PLANS) {
        const [existing] = await conn.query('SELECT id FROM license_plans WHERE name = ?', [plan.name]);
        if (existing.length > 0) {
            await conn.query(
                'UPDATE license_plans SET max_companies = ?, max_employees = ?, monthly_price_inr = ?, features = ?, price_notes = ? WHERE id = ?',
                [plan.max_companies, plan.max_employees, plan.monthly_price_inr, JSON.stringify(plan.features), plan.price_notes, existing[0].id]
            );
            console.log(`[migrate] Updated plan "${plan.name}" to the latest tier definition.`);
            continue;
        }
        await conn.query(
            'INSERT INTO license_plans (name, max_companies, max_employees, monthly_price_inr, features, price_notes) VALUES (?, ?, ?, ?, ?, ?)',
            [plan.name, plan.max_companies, plan.max_employees, plan.monthly_price_inr, JSON.stringify(plan.features), plan.price_notes]
        );
        console.log(`[migrate] Seeded plan "${plan.name}".`);
    }

    await conn.end();
    console.log('[migrate] Done.');
}

migrate().catch((err) => {
    console.error('[migrate] Failed:', err);
    process.exit(1);
});
