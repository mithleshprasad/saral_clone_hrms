const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { REPORT_COLUMNS } = require('../constants/reportColumns');

module.exports = {
    listColumns() {
        return Object.entries(REPORT_COLUMNS).map(([key, def]) => ({ key, label: def.label, group: def.group }));
    },

    async run({ columns, employeeIds, companyId, startDate, endDate, groupBy }) {
        if (!Array.isArray(columns) || columns.length === 0) {
            throw ApiError.badRequest('Select at least one column');
        }
        const invalid = columns.filter((c) => !REPORT_COLUMNS[c]);
        if (invalid.length > 0) throw ApiError.badRequest(`Unknown column(s): ${invalid.join(', ')}`);
        if (!startDate || !endDate) throw ApiError.badRequest('startDate and endDate are required');

        const groupable = groupBy === 'employee' || groupBy === 'department';
        const selectParts = columns.map((key) => {
            const def = REPORT_COLUMNS[key];
            if (groupable && def.aggregatable) return `SUM(${def.expr}) as ${key}`;
            // ANY_VALUE avoids ONLY_FULL_GROUP_BY errors for non-aggregated joined columns
            // that aren't provably functionally dependent on the GROUP BY key.
            if (groupable) return `ANY_VALUE(${def.expr}) as ${key}`;
            return `${def.expr} as ${key}`;
        });

        const params = [startDate, endDate];
        const where = ['p.payment_date BETWEEN ? AND ?'];
        if (companyId) { where.push('e.company_id = ?'); params.push(companyId); }
        if (Array.isArray(employeeIds) && employeeIds.length > 0) {
            where.push(`e.id IN (${employeeIds.map(() => '?').join(',')})`);
            params.push(...employeeIds);
        }

        let groupClause = '';
        if (groupBy === 'employee') groupClause = 'GROUP BY e.id';
        else if (groupBy === 'department') groupClause = 'GROUP BY d.id';

        const sql = `
            SELECT ${selectParts.join(', ')}
            FROM payroll p
            JOIN employees e ON p.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN positions pos ON e.position_id = pos.id
            LEFT JOIN branches b ON e.branch_id = b.id
            WHERE ${where.join(' AND ')}
            ${groupClause}
            ORDER BY e.first_name
        `;

        return db.all(sql, params);
    },
};
