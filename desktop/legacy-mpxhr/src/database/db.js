const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { hashPassword, isHashed } = require('../main/auth');

let DB_PATH;
try {
    const { app } = require('electron');
    // app might be undefined if running via pure node (e.g. scripts)
    if (app && app.isPackaged) {
        DB_PATH = path.join(app.getPath('userData'), 'database.sqlite');
        // If DB doesn't exist in userData yet (first run after build), copy the bundled one
        if (!fs.existsSync(DB_PATH)) {
            const bundledDbPath = path.join(process.resourcesPath, 'database.sqlite');
            if (fs.existsSync(bundledDbPath)) {
                fs.writeFileSync(DB_PATH, fs.readFileSync(bundledDbPath));
            }
        }
    } else {
        DB_PATH = path.join(__dirname, '../../database.sqlite');
    }
} catch (e) {
    // Fallback if electron module is not found (e.g. running script with node)
    DB_PATH = path.join(__dirname, '../../database.sqlite');
}

class DatabaseManager {
    constructor() {
        if (DatabaseManager.instance) {
            return DatabaseManager.instance;
        }
        this.db = null;
        this.isReady = false;
        this._readyPromise = new Promise((resolve) => {
            this._resolveReady = resolve;
        });
        DatabaseManager.instance = this;
    }

    ready() {
        return this._readyPromise;
    }

    connect() {
        if (this.db) return this.db;

        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database ' + DB_PATH, err.message);
            } else {
                console.log('Connected to the SQlite database at ' + DB_PATH);
                this.initDB();
            }
        });
        return this.db;
    }

    initDB() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        try {
            const schema = fs.readFileSync(schemaPath, 'utf-8');
            this.db.exec(schema, (err) => {
                if (err) {
                    console.error("Error executing schema:", err.message);
                    // Resolve anyway to not block app forever, but logs will show error
                    this.isReady = true;
                    this._resolveReady();
                } else {
                    console.log("Database initialized successfully with schema.");
                    this.seedData();
                    this.createIndices();
                    this.migratePasswords();
                    this.isReady = true;
                    this._resolveReady();
                }
            });
        } catch (err) {
            console.error("Error reading schema file:", err);
            this._resolveReady();
        }
    }

    createIndices() {
        // Optimization Indices
        const indices = [
            "CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(department_id)",
            "CREATE INDEX IF NOT EXISTS idx_emp_search_fn ON employees(first_name)",
            "CREATE INDEX IF NOT EXISTS idx_emp_search_ln ON employees(last_name)",
            "CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date)",
            "CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance(employee_id, date)",
            "CREATE INDEX IF NOT EXISTS idx_payroll_emp ON payroll(employee_id)",
            "CREATE INDEX IF NOT EXISTS idx_payroll_date ON payroll(payment_date)",
            "CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(pay_period_start, pay_period_end)",
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_unique ON payroll(employee_id, pay_period_start, pay_period_end)",
            "CREATE INDEX IF NOT EXISTS idx_assets_assigned ON assets(assigned_to)",
            "CREATE INDEX IF NOT EXISTS idx_leaves_emp ON leaves(employee_id)"
        ];

        indices.forEach(sql => {
            this.db.run(sql, (err) => {
                if (err) console.error("Index Error:", err.message);
            });
        });
        console.log("Database indices verified.");
    }

    // One-time migration: hash any legacy plaintext passwords in place.
    migratePasswords() {
        this.all("SELECT id, password FROM users")
            .then(users => {
                users.forEach(u => {
                    if (!isHashed(u.password)) {
                        this.run("UPDATE users SET password = ? WHERE id = ?", [hashPassword(u.password), u.id])
                            .then(() => console.log(`Migrated plaintext password for user id ${u.id} to hashed.`))
                            .catch(e => console.error("Password migration failed for user", u.id, e.message));
                    }
                });
            })
            .catch(() => { });
    }

    seedData() {
        // Seed Settings
        this.get("SELECT count(*) as count FROM settings")
            .then(row => {
                if (row && row.count === 0) {
                    const stmt = this.db.prepare("INSERT INTO settings (key, value, description) VALUES (?, ?, ?)");
                    stmt.run("app_name", "HRMS Desktop", "Application Name");
                    stmt.run("module_masters", "true", "Module: Masters Visibility");
                    stmt.run("module_attendance", "true", "Module: Attendance Visibility");
                    stmt.run("module_payroll", "true", "Module: Payroll Visibility");
                    stmt.run("module_reports", "true", "Module: Reports Visibility");
                    stmt.run("module_documents", "true", "Module: Documents Visibility");
                    stmt.finalize();
                    console.log("Seeded basic settings.");
                }
            })
            .catch(err => { });

        // Seed Admin User
        this.get("SELECT count(*) as count FROM users")
            .then(row => {
                if (row && row.count === 0) {
                    const stmt = this.db.prepare("INSERT INTO users (username, password, role, employee_id) VALUES (?, ?, ?, ?)");
                    stmt.run("admin", hashPassword("admin123"), "admin", null);
                    stmt.finalize();
                    console.log("Seeded default admin user.");
                }
            })
            .catch(err => {
                console.error("Error seeding users:", err);
            });

        // Seed basic Departments and Positions
        this.get("SELECT count(*) as count FROM departments")
            .then(row => {
                if (row && row.count === 0) {
                    const stmt = this.db.prepare("INSERT INTO departments (name, description) VALUES (?, ?)");
                    stmt.run("Engineering", "Software Engineering");
                    stmt.run("HR", "Human Resources");
                    stmt.run("Finance", "Finance & Accounts");
                    stmt.finalize();
                    console.log("Seeded default departments.");
                }
            })
            .catch(err => { });

        this.get("SELECT count(*) as count FROM positions")
            .then(row => {
                if (row && row.count === 0) {
                    const stmt = this.db.prepare("INSERT INTO positions (title, department_id, base_salary) VALUES (?, ?, ?)");
                    stmt.run("Software Engineer", 1, 40000);
                    stmt.run("Senior Engineer", 1, 70000);
                    stmt.run("HR Executive", 2, 30000);
                    stmt.finalize();
                    console.log("Seeded default positions.");
                }
            })
            .catch(err => { });

        // Seed a default company and branch
        this.get("SELECT count(*) as count FROM companies")
            .then(row => {
                if (row && row.count === 0) {
                    const stmt = this.db.prepare("INSERT INTO companies (name, phone, address) VALUES (?, ?, ?)");
                    stmt.run("DefaultCo", "", "Head Office");
                    stmt.finalize();
                    this.get("SELECT id FROM companies LIMIT 1").then(r => {
                        if (r && r.id) {
                            const stmt2 = this.db.prepare("INSERT INTO branches (company_id, name, address, phone) VALUES (?, ?, ?, ?)");
                            stmt2.run(r.id, "Main Branch", "Head Office", "");
                            stmt2.finalize();
                        }
                    }).catch(e => { });

                    console.log("Seeded default company and branch.");
                }
            })
            .catch(err => { });
    }

    // Promise wrappers
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('DB Error [GET]:', err.message, sql);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('DB Error [ALL]:', err.message, sql);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));
            this.db.run(sql, params, function (err) {
                if (err) {
                    console.error('DB Error [RUN]:', err.message, sql);
                    reject(err);
                } else {
                    // Return context 'this' which contains lastID and changes
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }
    close() {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve();
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database', err.message);
                    reject(err);
                } else {
                    console.log('Database connection closed.');
                    this.db = null;
                    resolve();
                }
            });
        });
    }
}

const dbManager = new DatabaseManager();
module.exports = dbManager;
