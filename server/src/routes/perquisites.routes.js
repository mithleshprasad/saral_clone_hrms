const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/perquisite.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.delete('/:id', asyncHandler(controller.remove));
router.get('/employee/:employeeId', asyncHandler(controller.listByEmployee));
router.get('/employee/:employeeId/form-12ba.pdf', asyncHandler(controller.form12Ba));

module.exports = router;
