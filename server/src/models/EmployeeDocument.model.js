const db = require('../config/db');

const EmployeeDocument = {
    async listByEmployee(employeeId) {
        return db.all('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY created_at DESC', [employeeId]);
    },

    async findById(id) {
        return db.get('SELECT * FROM employee_documents WHERE id = ?', [id]);
    },

    async create({ employeeId, docType, originalName, storedName, uploadedBy }) {
        const { insertId } = await db.run(
            'INSERT INTO employee_documents (employee_id, doc_type, original_name, stored_name, uploaded_by) VALUES (?,?,?,?,?)',
            [employeeId, docType || 'Other', originalName, storedName, uploadedBy || null]
        );
        return this.findById(insertId);
    },

    async remove(id) {
        await db.run('DELETE FROM employee_documents WHERE id = ?', [id]);
    },
};

module.exports = EmployeeDocument;
