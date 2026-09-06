const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/license.controller');
const transactionController = require('../controllers/transaction.controller');

// Mounted at /api/licenses with requireVendor already applied in app.js — every route
// here is vendor-only. The public check-in endpoint (/api/validate) is registered
// separately in app.js, outside this router, so it can never accidentally inherit
// vendor auth or get miswired alongside it.
const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
router.post('/:id/suspend', asyncHandler(controller.suspend));
router.post('/:id/revoke', asyncHandler(controller.revoke));
router.post('/:id/reactivate', asyncHandler(controller.reactivate));
router.delete('/:id', asyncHandler(controller.remove));

router.get('/:id/transactions', asyncHandler(transactionController.listForLicense));
router.post('/:id/transactions', asyncHandler(transactionController.record));

module.exports = router;
