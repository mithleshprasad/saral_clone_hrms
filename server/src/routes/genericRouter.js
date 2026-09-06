const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

function genericRouter(controller) {
    const router = express.Router();
    router.get('/', asyncHandler(controller.list));
    router.get('/:id', asyncHandler(controller.get));
    router.post('/', asyncHandler(controller.create));
    router.put('/:id', asyncHandler(controller.update));
    router.delete('/:id', asyncHandler(controller.remove));
    return router;
}

module.exports = genericRouter;
