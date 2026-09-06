const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const settingsController = require('../controllers/settings.controller');

const router = express.Router();

router.get('/', asyncHandler(settingsController.list));
router.put('/', asyncHandler(settingsController.update));

module.exports = router;
