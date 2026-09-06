const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/onboardingTask.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.post('/:id/toggle', asyncHandler(controller.toggle));

module.exports = router;
