const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants');
const controller = require('../controllers/subscriptionPlan.controller');

const router = express.Router();

// Platform-level catalog — only the Super Admin manages what plans exist.
router.use(requireRole(ROLES.SUPER_ADMIN));

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.get));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
