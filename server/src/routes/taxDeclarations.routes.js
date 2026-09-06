const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants');
const controller = require('../controllers/taxDeclaration.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.listAll));
router.get('/employee/:employeeId', asyncHandler(controller.listByEmployee));
router.get('/:id', asyncHandler(controller.get));
router.post('/', asyncHandler(controller.save));
router.post('/:id/submit', asyncHandler(controller.submit));
router.put('/:id/review', requireRole(ROLES.ADMIN, ROLES.HR), asyncHandler(controller.review));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
