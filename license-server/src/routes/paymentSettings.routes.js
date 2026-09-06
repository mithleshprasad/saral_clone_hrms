const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/paymentSettings.controller');

// Mounted at /api/payment-settings with requireVendor already applied in app.js.
const router = express.Router();

router.get('/', asyncHandler(controller.get));
router.put('/', asyncHandler(controller.update));

module.exports = router;
