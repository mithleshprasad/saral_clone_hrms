const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/candidate.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.get));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.put('/:id/status', asyncHandler(controller.updateStatus));
router.post('/:id/convert', asyncHandler(controller.convert));

module.exports = router;
