const fs = require('fs');
const path = require('path');
const ExpenseClaim = require('../models/ExpenseClaim.model');
const Employee = require('../models/Employee.model');
const ApiError = require('../utils/ApiError');
const { UPLOAD_DIR } = require('../middleware/uploadReceipt');

const VALID_CATEGORIES = ['Travel', 'Medical', 'LTA', 'Telephone', 'Food', 'Office Supplies', 'Other'];

module.exports = {
    async list({ companyId, status } = {}) {
        return ExpenseClaim.list({ companyId, status });
    },

    async listByEmployee(employeeId) {
        return ExpenseClaim.list({ employeeId });
    },

    async submit(data, file) {
        if (!data.employee_id || !data.category || !data.amount || !data.expense_date) {
            if (file) fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
            throw ApiError.badRequest('employee_id, category, amount and expense_date are required');
        }
        if (!VALID_CATEGORIES.includes(data.category)) {
            if (file) fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
            throw ApiError.badRequest(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
        }
        if (Number(data.amount) <= 0) {
            if (file) fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
            throw ApiError.badRequest('amount must be greater than zero');
        }
        const employee = await Employee.findById(data.employee_id);
        if (!employee) {
            if (file) fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
            throw ApiError.notFound('Employee not found');
        }

        return ExpenseClaim.create({
            ...data,
            receipt_original_name: file?.originalname,
            receipt_stored_name: file?.filename,
        });
    },

    // status transitions: Pending -> Approved/Rejected (HR decision), Approved -> Paid (once
    // reimbursed, e.g. alongside a payroll run or a separate payment). No transition out of
    // Rejected/Paid — those are terminal.
    async review(id, status, remarks, reviewedBy) {
        if (!['Approved', 'Rejected', 'Paid'].includes(status)) {
            throw ApiError.badRequest('status must be Approved, Rejected or Paid');
        }
        const claim = await ExpenseClaim.findById(id);
        if (!claim) throw ApiError.notFound('Expense claim not found');
        if (status === 'Paid' && claim.status !== 'Approved') {
            throw ApiError.badRequest('Only an Approved claim can be marked Paid');
        }
        if (['Rejected', 'Paid'].includes(claim.status)) {
            throw ApiError.badRequest(`This claim is already ${claim.status} and can't be changed further`);
        }

        return ExpenseClaim.setStatus(id, status, remarks, reviewedBy);
    },

    async getById(id) {
        const claim = await ExpenseClaim.findById(id);
        if (!claim) throw ApiError.notFound('Expense claim not found');
        return claim;
    },

    async getReceiptForDownload(id) {
        const claim = await this.getById(id);
        if (!claim.receipt_stored_name) throw ApiError.notFound('No receipt attached to this claim');
        return { claim, filePath: path.join(UPLOAD_DIR, claim.receipt_stored_name) };
    },
};
