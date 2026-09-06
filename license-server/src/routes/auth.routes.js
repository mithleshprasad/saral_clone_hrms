const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/auth.controller');

const router = express.Router();
router.post('/login', asyncHandler(controller.login));

module.exports = router;
