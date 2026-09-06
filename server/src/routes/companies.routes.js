const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants');
const genericRouter = require('./genericRouter');
const companyController = require('../controllers/company.controller');

const router = genericRouter(companyController);

// Subscription/application-control fields are gated separately from the general company
// edit form above — only the Super Admin can flip a tenant's plan, status or kill switch.
router.put('/:id/subscription', requireRole(ROLES.SUPER_ADMIN), asyncHandler(companyController.updateSubscription));

module.exports = router;
