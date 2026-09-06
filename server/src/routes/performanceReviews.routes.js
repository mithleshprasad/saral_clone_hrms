const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/performanceReview.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.initiate));
router.get('/:id', asyncHandler(controller.get));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.put('/:id/manager-review', asyncHandler(controller.submitManagerReview));

module.exports = router;
