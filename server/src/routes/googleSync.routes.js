const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/googleSync.controller');

// Mounted at /api/google-sync — inherits the Admin/HR gate app.js already applies to this
// whole block. These manage connection secrets and can insert real records (via
// review-queue approval), the same trust level as other master-data management routes.
const router = express.Router();

router.post('/generate-template', asyncHandler(controller.generateTemplate));
router.post('/test-connection', asyncHandler(controller.testConnection));

router.get('/connections', asyncHandler(controller.listConnections));
router.post('/connections', asyncHandler(controller.addConnection));
router.post('/connections/:id/refresh-tabs', asyncHandler(controller.refreshConnectionTabs));
router.delete('/connections/:id', asyncHandler(controller.deleteConnection));

router.get('/tab-headers', asyncHandler(controller.getTabHeaders));
router.get('/syncable-tables', asyncHandler(controller.getSyncableTables));

router.get('/mappings', asyncHandler(controller.listMappings));
router.post('/mappings', asyncHandler(controller.saveMapping));
router.delete('/mappings/:id', asyncHandler(controller.deleteMapping));
router.post('/mappings/:id/sync', asyncHandler(controller.runSync));

router.get('/review-queue', asyncHandler(controller.getReviewQueue));
router.post('/review-queue/:id/approve', asyncHandler(controller.approveReviewItem));
router.post('/review-queue/:id/reject', asyncHandler(controller.rejectReviewItem));

module.exports = router;
