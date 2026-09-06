const db = require('../config/db');

const Dashboard = {
    async totalEmployees(companyId) {
        const where = companyId ? 'WHERE company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return (await db.get(`SELECT COUNT(*) as c FROM employees ${where}`, params)).c;
    },

    async totalDepartments(companyId) {
        const where = companyId ? 'WHERE company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return (await db.get(`SELECT COUNT(*) as c FROM departments ${where}`, params)).c;
    },

    async presentToday(today, companyId) {
        const where = ["a.date = ?", "a.status = 'Present'"];
        const params = [today];
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        return (await db.get(
            `SELECT COUNT(*) as c FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE ${where.join(' AND ')}`,
            params
        )).c;
    },

    async departmentDistribution(companyId) {
        const where = companyId ? 'WHERE d.company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return db.all(`
            SELECT d.name, COUNT(e.id) as count
            FROM departments d
            LEFT JOIN employees e ON d.id = e.department_id
            ${where}
            GROUP BY d.id
        `, params);
    },

    async recentHires(companyId) {
        const where = companyId ? 'WHERE company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return db.all(`SELECT first_name, last_name, date_of_joining FROM employees ${where} ORDER BY id DESC LIMIT 5`, params);
    },

    async upcomingBirthdays(currentMonth, nextMonth, companyId) {
        const where = ['(MONTH(dob) = ? OR MONTH(dob) = ?)'];
        const params = [currentMonth, nextMonth];
        if (companyId) { where.push('company_id = ?'); params.push(companyId); }
        return db.all(
            `SELECT first_name, last_name, dob FROM employees
             WHERE ${where.join(' AND ')}
             ORDER BY MONTH(dob), DAY(dob)
             LIMIT 5`,
            params
        );
    },

    async employeesByDepartment(companyId) {
        const where = companyId ? 'WHERE e.company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return db.all(
            `SELECT d.name, COUNT(e.id) as count FROM employees e LEFT JOIN departments d ON e.department_id = d.id ${where} GROUP BY d.name`,
            params
        );
    },

    async employeesByStatus(companyId) {
        const where = companyId ? 'WHERE company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return db.all(`SELECT status, COUNT(*) as count FROM employees ${where} GROUP BY status`, params);
    },

    async payrollTotals(companyId) {
        const where = companyId ? 'WHERE e.company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return db.get(
            `SELECT COALESCE(SUM(p.net_salary),0) as totalNet,
                    COALESCE(SUM(p.employee_pf + p.employer_pf),0) as totalPf,
                    COALESCE(SUM(p.tds),0) as totalTds,
                    COUNT(*) as recordCount
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             ${where}`,
            params
        );
    },

    async payrollMonthly(companyId) {
        const where = ['p.payment_date IS NOT NULL'];
        const params = [];
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        return db.all(
            `SELECT DATE_FORMAT(p.payment_date, '%Y-%m') as month, SUM(p.net_salary) as netSalary, SUM(p.gross_salary) as grossSalary
             FROM payroll p JOIN employees e ON p.employee_id = e.id
             WHERE ${where.join(' AND ')}
             GROUP BY DATE_FORMAT(p.payment_date, '%Y-%m')
             ORDER BY month DESC
             LIMIT 12`,
            params
        );
    },
};

module.exports = Dashboard;
