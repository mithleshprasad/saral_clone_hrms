const db = require('../config/db');

const Payroll = {
    async findEmployeesForCalculation({ employeeId, companyId }) {
        const select = `
            SELECT e.*, p.base_salary as pos_salary, p.deduct_pt as position_deduct_pt,
                   c.is_active as company_is_active, c.subscription_status as company_subscription_status,
                   c.state as company_state
            FROM employees e
            LEFT JOIN positions p ON e.position_id = p.id
            LEFT JOIN companies c ON e.company_id = c.id
        `;
        if (!employeeId) {
            // "Run payroll for all active employees" must stay within the company selected
            // in the UI — without this, it silently processed every company's employees.
            if (companyId) return db.all(`${select} WHERE e.status = 'Active' AND e.company_id = ?`, [companyId]);
            return db.all(`${select} WHERE e.status = 'Active'`);
        }
        const emp = await db.get(`${select} WHERE e.id = ?`, [employeeId]);
        return emp ? [emp] : [];
    },

    async findExisting(employeeId, startDate, endDate) {
        return db.get(
            'SELECT id FROM payroll WHERE employee_id = ? AND pay_period_start = ? AND pay_period_end = ?',
            [employeeId, startDate, endDate]
        );
    },

    async countPresentDays(employeeId, startDate, endDate) {
        const row = await db.get(
            "SELECT COUNT(*) as p FROM attendance WHERE employee_id = ? AND status = 'Present' AND date BETWEEN ? AND ?",
            [employeeId, startDate, endDate]
        );
        return row ? row.p : 0;
    },

    async sumActiveLoanEmi(employeeId) {
        const row = await db.get(
            "SELECT COALESCE(SUM(monthly_emi),0) as emi FROM loans WHERE employee_id = ? AND status = 'Active' AND balance > 0",
            [employeeId]
        );
        return row ? Number(row.emi) : 0;
    },

    async settleLoanEmi(employeeId) {
        await db.run(
            "UPDATE loans SET balance = GREATEST(0, balance - monthly_emi) WHERE employee_id = ? AND status = 'Active' AND balance > 0",
            [employeeId]
        );
        await db.run("UPDATE loans SET status = 'Closed' WHERE employee_id = ? AND balance <= 0 AND status = 'Active'", [employeeId]);
    },

    async activeUserDeductions() {
        return db.all('SELECT * FROM user_defined_deductions WHERE is_active = 1');
    },

    async allSettings() {
        return db.all('SELECT * FROM settings');
    },

    async insert(record) {
        const { insertId } = await db.run(
            `INSERT INTO payroll (
                employee_id, pay_period_start, pay_period_end, base_salary,
                basic_salary, da, hra, conveyance, medical, special_allowance,
                overtime_hours, overtime_amount,
                bonuses, employee_pf, employer_pf, employer_eps, employee_esi,
                employer_esi, professional_tax, tds, other_deductions, lop_amount,
                gross_salary, total_deductions, net_salary, payment_date, status,
                vpf_percent, vpf_amount, loan_deduction, user_defined_deduction
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Paid',?,?,?,?)`,
            [
                record.employee_id, record.pay_period_start, record.pay_period_end, record.base_salary,
                record.basic_salary, record.da, record.hra, record.conveyance, record.medical, record.special_allowance,
                record.overtime_hours || 0, record.overtime_amount || 0,
                record.bonuses, record.employee_pf, record.employer_pf, record.employer_eps, record.employee_esi,
                record.employer_esi, record.professional_tax, record.tds, record.other_deductions, record.lop_amount,
                record.gross_salary, record.total_deductions, record.net_salary, record.payment_date,
                record.vpf_percent, record.vpf_amount, record.loan_deduction, record.user_defined_deduction,
            ]
        );
        return insertId;
    },

    async list({ employeeId, companyId, month, year, status }) {
        const conditions = [];
        const params = [];
        if (employeeId) { conditions.push('p.employee_id = ?'); params.push(employeeId); }
        if (companyId) { conditions.push('e.company_id = ?'); params.push(companyId); }
        if (status) { conditions.push('p.status = ?'); params.push(status); }
        if (month && year) {
            conditions.push('p.payment_date BETWEEN ? AND ?');
            params.push(`${year}-${String(month).padStart(2, '0')}-01`, `${year}-${String(month).padStart(2, '0')}-31`);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return db.all(
            `SELECT p.*, e.first_name, e.last_name, e.employee_code,
                    DATEDIFF(p.pay_period_end, p.pay_period_start) + 1 AS period_days,
                    (SELECT COUNT(*) FROM attendance a
                      WHERE a.employee_id = p.employee_id
                        AND a.date BETWEEN p.pay_period_start AND p.pay_period_end
                        AND a.status = 'Present') AS present_days
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             ${where}
             ORDER BY p.payment_date DESC, e.first_name ASC`,
            params
        );
    },

    async findById(id) {
        return db.get(
            `SELECT p.*, e.first_name, e.last_name, e.employee_code
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             WHERE p.id = ?`,
            [id]
        );
    },

    // Used by PDF generation — needs the employee/company fields a payslip prints.
    async findWithFullDetails(id) {
        const payroll = await db.get('SELECT * FROM payroll WHERE id = ?', [id]);
        if (!payroll) return null;
        const employee = await db.get(
            `SELECT e.*, d.name as department_name, pos.title as position_title
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN positions pos ON e.position_id = pos.id
             WHERE e.id = ?`,
            [payroll.employee_id]
        );
        const company = employee?.company_id ? await db.get('SELECT * FROM companies WHERE id = ?', [employee.company_id]) : null;
        return { payroll, employee, company };
    },

    async remove(id) {
        await db.run('DELETE FROM payroll WHERE id = ?', [id]);
    },

    async findRawById(id) {
        return db.get('SELECT * FROM payroll WHERE id = ?', [id]);
    },

    async updateComponents(id, fields) {
        const columns = Object.keys(fields);
        await db.run(
            `UPDATE payroll SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
            [...columns.map((c) => fields[c]), id]
        );
    },

    async report(sql, params) {
        return db.all(sql, params);
    },

    async annualSummaryForEmployee(employeeId, startDate, endDate) {
        return db.get(
            `SELECT SUM(gross_salary) as gross_income, SUM(basic_salary) as annual_basic,
                    SUM(hra) as annual_hra, SUM(da) as annual_da,
                    SUM(special_allowance + bonuses) as annual_allowances,
                    SUM(employee_pf) as annual_pf, SUM(professional_tax) as annual_pt,
                    SUM(tds) as annual_tds, SUM(net_salary) as net_salary
             FROM payroll
             WHERE employee_id = ? AND payment_date BETWEEN ? AND ?`,
            [employeeId, startDate, endDate]
        );
    },
};

module.exports = Payroll;
