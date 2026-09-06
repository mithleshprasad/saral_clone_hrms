const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', asyncHandler(authController.login));
router.get('/me', requireAuth, authController.me);
router.post('/users', requireAuth, requireRole(ROLES.ADMIN), asyncHandler(authController.createUser));
router.get('/users/exists/:employeeId', requireAuth, asyncHandler(authController.checkUserExists));

module.exports = router;
