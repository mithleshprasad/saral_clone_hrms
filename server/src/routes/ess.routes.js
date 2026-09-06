const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireEmployeeLink = require('../middleware/requireEmployeeLink');
const uploadReceipt = require('../middleware/uploadReceipt');
const controller = require('../controllers/ess.controller');

const router = express.Router();

router.use(requireEmployeeLink);

router.get('/me', asyncHandler(controller.me));

router.get('/payslips', asyncHandler(controller.payslips));
router.get('/payslips/:id/payslip.pdf', asyncHandler(controller.downloadPayslip));
router.get('/form16.pdf', asyncHandler(controller.downloadForm16));

router.get('/attendance', asyncHandler(controller.attendance));
router.get('/attendance-regularizations', asyncHandler(controller.attendanceRegularizations));
router.post('/attendance-regularizations', asyncHandler(controller.requestAttendanceRegularization));

router.get('/leave-balance', asyncHandler(controller.leaveBalance));
router.get('/leave-types', asyncHandler(controller.leaveTypes));
router.get('/leaves', asyncHandler(controller.leaves));
router.post('/leaves', asyncHandler(controller.requestLeave));

router.get('/declarations', asyncHandler(controller.declarations));
router.post('/declarations', asyncHandler(controller.saveDeclaration));
router.post('/declarations/:id/submit', asyncHandler(controller.submitDeclaration));

router.get('/letters', asyncHandler(controller.letters));
router.get('/letters/:id/download', asyncHandler(controller.downloadLetter));

router.get('/documents', asyncHandler(controller.documents));
router.get('/documents/:docId/download', asyncHandler(controller.downloadDocument));

router.get('/expense-claims', asyncHandler(controller.expenseClaims));
router.post('/expense-claims', uploadReceipt.single('receipt'), asyncHandler(controller.submitExpenseClaim));
router.get('/expense-claims/:id/receipt', asyncHandler(controller.downloadExpenseReceipt));

module.exports = router;
