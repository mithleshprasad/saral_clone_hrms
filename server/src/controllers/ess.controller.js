const employeeService = require('../services/employee.service');
const payrollService = require('../services/payroll.service');
const pdfService = require('../services/pdf.service');
const leaveService = require('../services/leave.service');
const leaveTypeService = require('../services/leaveType.service');
const attendanceRegularizationService = require('../services/attendanceRegularization.service');
const employeeDocumentService = require('../services/employeeDocument.service');
const expenseClaimService = require('../services/expenseClaim.service');
const taxDeclarationService = require('../services/taxDeclaration.service');
const letterService = require('../services/letter.service');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');

// Every handler here trusts only req.user.employeeId for scoping — never a client-supplied
// employee id — so one employee can never read another's payslips/leave/declarations.

module.exports = {
    me: async (req, res) => {
        res.json(await employeeService.get(req.user.employeeId));
    },

    payslips: async (req, res) => {
        res.json(await payrollService.list({ employeeId: req.user.employeeId }));
    },

    downloadPayslip: async (req, res) => {
        const data = await payrollService.getPayslipData(req.params.id);
        if (data.payroll.employee_id !== req.user.employeeId) throw ApiError.forbidden('Not your payslip');
        pdfService.streamPayslip(res, data);
    },

    downloadForm16: async (req, res) => {
        const data = await payrollService.getForm16Data(req.user.employeeId, req.query.financialYear);
        pdfService.streamForm16(res, data);
    },

    attendance: async (req, res) => {
        res.json(await db.all(
            'SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC LIMIT 100',
            [req.user.employeeId]
        ));
    },

    leaveBalance: async (req, res) => {
        const year = parseInt(req.query.year || new Date().getFullYear(), 10);
        res.json(await leaveService.getBalance(req.user.employeeId, year));
    },

    leaves: async (req, res) => {
        res.json(await leaveService.list({ employeeId: req.user.employeeId }));
    },

    requestLeave: async (req, res) => {
        res.status(201).json(await leaveService.request({ ...req.body, employee_id: req.user.employeeId }));
    },

    leaveTypes: async (req, res) => {
        const employee = await employeeService.get(req.user.employeeId);
        res.json(await leaveTypeService.list(employee.company_id));
    },

    attendanceRegularizations: async (req, res) => {
        res.json(await attendanceRegularizationService.listByEmployee(req.user.employeeId));
    },

    requestAttendanceRegularization: async (req, res) => {
        res.status(201).json(await attendanceRegularizationService.request({ ...req.body, employee_id: req.user.employeeId }));
    },

    declarations: async (req, res) => {
        res.json(await taxDeclarationService.listByEmployee(req.user.employeeId));
    },

    saveDeclaration: async (req, res) => {
        res.status(201).json(await taxDeclarationService.save({ ...req.body, employee_id: req.user.employeeId }));
    },

    submitDeclaration: async (req, res) => {
        const decl = await taxDeclarationService.get(req.params.id);
        if (decl.employee_id !== req.user.employeeId) throw ApiError.forbidden('Not your declaration');
        res.json(await taxDeclarationService.submit(req.params.id));
    },

    letters: async (req, res) => {
        res.json(await letterService.listByEmployee(req.user.employeeId));
    },

    documents: async (req, res) => {
        res.json(await employeeDocumentService.listByEmployee(req.user.employeeId));
    },

    downloadDocument: async (req, res) => {
        const { doc, filePath } = await employeeDocumentService.getFileForDownload(req.params.docId);
        if (doc.employee_id !== req.user.employeeId) throw ApiError.forbidden('Not your document');
        res.download(filePath, doc.original_name);
    },

    downloadLetter: async (req, res) => {
        const letter = await letterService.getById(req.params.id);
        if (letter.employee_id !== req.user.employeeId) throw ApiError.forbidden('Not your letter');
        pdfService.streamLetter(res, { title: `${letter.type} Letter`, content: letter.content, employee: letter.employee, company: letter.company });
    },

    expenseClaims: async (req, res) => {
        res.json(await expenseClaimService.listByEmployee(req.user.employeeId));
    },

    submitExpenseClaim: async (req, res) => {
        const claim = await expenseClaimService.submit({ ...req.body, employee_id: req.user.employeeId }, req.file);
        res.status(201).json(claim);
    },

    downloadExpenseReceipt: async (req, res) => {
        const { claim, filePath } = await expenseClaimService.getReceiptForDownload(req.params.id);
        if (claim.employee_id !== req.user.employeeId) throw ApiError.forbidden('Not your expense claim');
        res.download(filePath, claim.receipt_original_name);
    },
};
