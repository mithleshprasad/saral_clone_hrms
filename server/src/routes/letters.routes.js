const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/letter.controller');

const router = express.Router();

router.get('/types', controller.types);
router.get('/employee/:employeeId', asyncHandler(controller.listByEmployee));
router.post('/generate', asyncHandler(controller.generate));
router.get('/:id/download', asyncHandler(controller.download));

module.exports = router;
