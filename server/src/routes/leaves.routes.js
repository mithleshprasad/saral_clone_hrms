const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const leaveController = require('../controllers/leave.controller');

const router = express.Router();

router.get('/', asyncHandler(leaveController.list));
router.post('/', asyncHandler(leaveController.request));
router.put('/:id/status', asyncHandler(leaveController.updateStatus));
router.get('/balance/:employeeId', asyncHandler(leaveController.getBalance));
router.post('/balance', asyncHandler(leaveController.setBalance));

module.exports = router;
