const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/asset.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.get));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.post('/:id/assign', asyncHandler(controller.assign));
router.post('/:id/return', asyncHandler(controller.returnAsset));

module.exports = router;
