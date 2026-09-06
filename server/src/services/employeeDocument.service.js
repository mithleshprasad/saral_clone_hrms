const fs = require('fs');
const path = require('path');
const EmployeeDocument = require('../models/EmployeeDocument.model');
const Employee = require('../models/Employee.model');
const ApiError = require('../utils/ApiError');
const { UPLOAD_DIR } = require('../middleware/uploadDocument');

module.exports = {
    async listByEmployee(employeeId) {
        return EmployeeDocument.listByEmployee(employeeId);
    },

    async upload(employeeId, file, docType, uploadedBy) {
        if (!file) throw ApiError.badRequest('No file uploaded (field name: file)');
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            fs.unlink(path.join(UPLOAD_DIR, file.filename), () => {});
            throw ApiError.notFound('Employee not found');
        }
        return EmployeeDocument.create({
            employeeId, docType, originalName: file.originalname, storedName: file.filename, uploadedBy,
        });
    },

    async getFileForDownload(id) {
        const doc = await EmployeeDocument.findById(id);
        if (!doc) throw ApiError.notFound('Document not found');
        return { doc, filePath: path.join(UPLOAD_DIR, doc.stored_name) };
    },

    async remove(id) {
        const doc = await EmployeeDocument.findById(id);
        if (!doc) throw ApiError.notFound('Document not found');
        await EmployeeDocument.remove(id);
        fs.unlink(path.join(UPLOAD_DIR, doc.stored_name), () => {});
    },
};
