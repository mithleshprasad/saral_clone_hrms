const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/reportWriter.controller');

const router = express.Router();

router.get('/columns', controller.columns);
router.post('/run', asyncHandler(controller.run));

module.exports = router;
