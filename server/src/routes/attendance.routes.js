const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const upload = require('../middleware/upload');
const attendanceController = require('../controllers/attendance.controller');

const router = express.Router();

router.get('/', asyncHandler(attendanceController.list));
router.post('/', asyncHandler(attendanceController.create));
router.post('/manual', asyncHandler(attendanceController.upsertManual));
router.post('/bulk', asyncHandler(attendanceController.bulk));
router.post('/punch-import', upload.single('file'), asyncHandler(attendanceController.punchImport));
router.post('/check-in/:employeeId', asyncHandler(attendanceController.checkIn));
router.post('/check-out/:employeeId', asyncHandler(attendanceController.checkOut));
router.put('/:id', asyncHandler(attendanceController.update));
router.delete('/:id', asyncHandler(attendanceController.remove));

module.exports = router;
