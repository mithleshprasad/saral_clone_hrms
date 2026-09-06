const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/shiftRoster.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.assign));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
