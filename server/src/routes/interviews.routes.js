const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/interview.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.schedule));
router.put('/:id', asyncHandler(controller.reschedule));
router.put('/:id/feedback', asyncHandler(controller.feedback));
router.put('/:id/status', asyncHandler(controller.setStatus));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
