const db = require('../config/db');
const genericModel = require('./genericModel');

const base = genericModel(
    'assets',
    ['company_id', 'name', 'serial_number', 'type', 'status', 'assigned_to', 'assigned_date', 'value'],
    { orderBy: 'name', filterColumn: 'company_id' }
);

module.exports = {
    ...base,

    async findAll(companyId) {
        const where = companyId ? 'WHERE a.company_id = ?' : '';
        const params = companyId ? [companyId] : [];
        return db.all(
            `SELECT a.*, e.first_name, e.last_name FROM assets a
             LEFT JOIN employees e ON a.assigned_to = e.id
             ${where}
             ORDER BY a.name`,
            params
        );
    },

    async assign(id, employeeId, date) {
        await db.run("UPDATE assets SET assigned_to = ?, assigned_date = ?, status = 'Assigned' WHERE id = ?", [employeeId, date, id]);
        return base.findById(id);
    },

    async returnAsset(id) {
        await db.run("UPDATE assets SET assigned_to = NULL, assigned_date = NULL, status = 'Available' WHERE id = ?", [id]);
        return base.findById(id);
    },
};
