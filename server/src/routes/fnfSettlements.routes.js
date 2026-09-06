const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/fnfSettlement.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.get));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.post('/:id/finalize', asyncHandler(controller.finalize));

router.post('/:id/items', asyncHandler(controller.addItem));
router.put('/:id/items/:itemId', asyncHandler(controller.updateItem));
router.delete('/:id/items/:itemId', asyncHandler(controller.removeItem));

module.exports = router;
