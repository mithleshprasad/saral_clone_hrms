const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/salaryStructure.controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.get));
router.put('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

router.get('/:id/components', asyncHandler(controller.listComponents));
router.post('/:id/components', asyncHandler(controller.addComponent));
router.put('/components/:componentId', asyncHandler(controller.updateComponent));
router.delete('/components/:componentId', asyncHandler(controller.removeComponent));
router.post('/:id/apply', asyncHandler(controller.applyToEmployee));

module.exports = router;
