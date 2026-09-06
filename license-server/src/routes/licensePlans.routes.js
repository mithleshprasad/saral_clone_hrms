const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireVendor } = require('../middleware/auth');
const controller = require('../controllers/licensePlan.controller');

const router = express.Router();
router.use(requireVendor);

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
