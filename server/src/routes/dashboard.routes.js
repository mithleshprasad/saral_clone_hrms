const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/stats', asyncHandler(dashboardController.stats));
router.get('/employee-stats', asyncHandler(dashboardController.employeeStats));
router.get('/payroll-stats', asyncHandler(dashboardController.payrollStats));

module.exports = router;
