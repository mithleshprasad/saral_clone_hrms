const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/ticket.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.get));
router.put('/:id/status', asyncHandler(controller.updateStatus));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
