const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/expenseClaim.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.put('/:id/review', asyncHandler(controller.review));
router.get('/:id/receipt', asyncHandler(controller.downloadReceipt));

module.exports = router;
