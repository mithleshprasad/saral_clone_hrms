const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const payrollController = require('../controllers/payroll.controller');

const router = express.Router();

router.post('/generate', asyncHandler(payrollController.generate));
router.get('/', asyncHandler(payrollController.list));
router.get('/reports/:type', asyncHandler(payrollController.report));
router.get('/form16/:employeeId.pdf', asyncHandler(payrollController.downloadForm16));
router.get('/months/list', asyncHandler(payrollController.listMonths));
router.post('/months', asyncHandler(payrollController.createMonth));
router.post('/months/:id/close', asyncHandler(payrollController.closeMonth));
router.post('/months/:id/reopen', asyncHandler(payrollController.reopenMonth));
router.get('/:id', asyncHandler(payrollController.get));
router.get('/:id/payslip.pdf', asyncHandler(payrollController.downloadPayslip));
router.put('/:id/components', asyncHandler(payrollController.updateComponents));
router.delete('/:id', asyncHandler(payrollController.remove));

module.exports = router;
