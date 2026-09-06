const TaxDeclaration = require('../models/TaxDeclaration.model');
const ApiError = require('../utils/ApiError');

module.exports = {
    async listByEmployee(employeeId) {
        return TaxDeclaration.listByEmployee(employeeId);
    },

    async listAll(query) {
        return TaxDeclaration.listAll(query);
    },

    async get(id) {
        const row = await TaxDeclaration.findById(id);
        if (!row) throw ApiError.notFound('Declaration not found');
        return row;
    },

    // Employee saves/edits their own declaration (Draft) for a financial year.
    async save(data) {
        if (!data.employee_id || !data.financial_year) {
            throw ApiError.badRequest('employee_id and financial_year are required');
        }
        const existing = await TaxDeclaration.findByEmployeeAndYear(data.employee_id, data.financial_year);
        if (existing && existing.status === 'Approved') {
            throw ApiError.conflict('This declaration is already approved and locked. Contact HR to reopen it.');
        }
        return TaxDeclaration.upsert({ ...data, status: data.status || 'Draft' });
    },

    async submit(id) {
        const row = await TaxDeclaration.findById(id);
        if (!row) throw ApiError.notFound('Declaration not found');
        return TaxDeclaration.setStatus(id, 'Submitted');
    },

    async review(id, { status, remarks }) {
        if (!['Approved', 'Rejected', 'Draft'].includes(status)) throw ApiError.badRequest('Invalid status');
        const row = await TaxDeclaration.findById(id);
        if (!row) throw ApiError.notFound('Declaration not found');
        return TaxDeclaration.setStatus(id, status, remarks);
    },

    async remove(id) {
        await TaxDeclaration.remove(id);
    },
};
