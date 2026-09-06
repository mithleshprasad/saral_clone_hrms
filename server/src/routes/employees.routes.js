const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants');
const upload = require('../middleware/upload');
const uploadDocument = require('../middleware/uploadDocument');
const employeeController = require('../controllers/employee.controller');
const employeeDocumentController = require('../controllers/employeeDocument.controller');

const router = express.Router();

router.get('/', asyncHandler(employeeController.list));
router.post('/bulk-import', upload.single('file'), asyncHandler(employeeController.bulkImport));
router.get('/:id', asyncHandler(employeeController.get));
router.post('/', asyncHandler(employeeController.create));
router.put('/:id', asyncHandler(employeeController.update));
router.delete('/:id', requireRole(ROLES.ADMIN), asyncHandler(employeeController.remove));

router.get('/:id/documents', asyncHandler(employeeDocumentController.list));
router.post('/:id/documents', uploadDocument.single('file'), asyncHandler(employeeDocumentController.upload));
router.get('/:id/documents/:docId/download', asyncHandler(employeeDocumentController.download));
router.delete('/:id/documents/:docId', asyncHandler(employeeDocumentController.remove));

module.exports = router;
