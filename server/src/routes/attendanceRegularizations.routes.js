const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/attendanceRegularization.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.put('/:id/review', asyncHandler(controller.review));

module.exports = router;
