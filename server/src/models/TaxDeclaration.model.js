const db = require('../config/db');

const FIELDS = [
    'employee_id', 'financial_year', 'section_80c', 'section_80ccd', 'section_80d',
    'hra_exemption_claimed', 'home_loan_interest', 'other_deductions', 'status', 'remarks',
];

function computeTotal(d) {
    // Section 80C (incl. 80CCD basic) is capped at 150000 by law; 80CCD(1B) NPS extra
    // is a separate 50000 cap handled here as part of section_80ccd for simplicity.
    const cap80c = Math.min(Number(d.section_80c) || 0, 150000);
    return cap80c
        + (Number(d.section_80ccd) || 0)
        + (Number(d.section_80d) || 0)
        + (Number(d.hra_exemption_claimed) || 0)
        + (Number(d.home_loan_interest) || 0)
        + (Number(d.other_deductions) || 0);
}

const TaxDeclaration = {
    computeTotal,

    async listByEmployee(employeeId) {
        return db.all('SELECT * FROM tax_declarations WHERE employee_id = ? ORDER BY financial_year DESC', [employeeId]);
    },

    async listAll({ financialYear, status, companyId } = {}) {
        const where = [];
        const params = [];
        if (financialYear) { where.push('t.financial_year = ?'); params.push(financialYear); }
        if (status) { where.push('t.status = ?'); params.push(status); }
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        return db.all(
            `SELECT t.*, e.first_name, e.last_name, e.employee_code
             FROM tax_declarations t JOIN employees e ON t.employee_id = e.id
             ${whereSql} ORDER BY t.financial_year DESC, e.first_name`,
            params
        );
    },

    async findById(id) {
        return db.get('SELECT * FROM tax_declarations WHERE id = ?', [id]);
    },

    async findByEmployeeAndYear(employeeId, financialYear) {
        return db.get('SELECT * FROM tax_declarations WHERE employee_id = ? AND financial_year = ?', [employeeId, financialYear]);
    },

    async upsert(data) {
        const total = computeTotal(data);
        const existing = await this.findByEmployeeAndYear(data.employee_id, data.financial_year);
        if (existing) {
            const updates = FIELDS.filter((f) => f in data);
            await db.run(
                `UPDATE tax_declarations SET ${updates.map((f) => `${f} = ?`).join(', ')}, total_declared = ? WHERE id = ?`,
                [...updates.map((f) => data[f]), total, existing.id]
            );
            return this.findById(existing.id);
        }
        const { insertId } = await db.run(
            `INSERT INTO tax_declarations (${FIELDS.join(', ')}, total_declared) VALUES (${FIELDS.map(() => '?').join(', ')}, ?)`,
            [...FIELDS.map((f) => (data[f] !== undefined ? data[f] : null)), total]
        );
        return this.findById(insertId);
    },

    async setStatus(id, status, remarks) {
        await db.run('UPDATE tax_declarations SET status = ?, remarks = COALESCE(?, remarks) WHERE id = ?', [status, remarks ?? null, id]);
        return this.findById(id);
    },

    async remove(id) {
        await db.run('DELETE FROM tax_declarations WHERE id = ?', [id]);
    },

    // Monthly TDS calc reads this: the approved annual declared deduction for the FY
    // containing the given date, or null if none approved.
    async approvedTotalForDate(employeeId, isoDate) {
        const d = new Date(isoDate);
        const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; // FY starts April
        const financialYear = `${y}-${y + 1}`;
        const row = await this.findByEmployeeAndYear(employeeId, financialYear);
        return (row && row.status === 'Approved') ? Number(row.total_declared) : 0;
    },
};

module.exports = TaxDeclaration;
