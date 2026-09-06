const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/statutoryFile.controller');

const router = express.Router();

router.get('/muster-roll-data', asyncHandler(controller.musterRollData));
router.get('/muster-roll', asyncHandler(controller.musterRoll));
router.get('/pf-ecr', asyncHandler(controller.pfEcr));
router.get('/esi-return', asyncHandler(controller.esiReturn));
router.get('/pt-register', asyncHandler(controller.ptRegister));
router.get('/lwf-register', asyncHandler(controller.lwfRegister));
router.get('/bonus-register', asyncHandler(controller.bonusRegister));
router.get('/gratuity-register', asyncHandler(controller.gratuityRegister));
router.get('/form-24q', asyncHandler(controller.form24Q));
router.get('/form-24q-nsdl', asyncHandler(controller.form24QNsdl));
router.get('/form-3a', asyncHandler(controller.form3A));
router.get('/form-5', asyncHandler(controller.form5));
router.get('/form-10', asyncHandler(controller.form10));
router.get('/bank-file/sbi', asyncHandler(controller.bankFileSbi));
router.get('/bank-file/hdfc', asyncHandler(controller.bankFileHdfc));
router.get('/bank-file/icici', asyncHandler(controller.bankFileIcici));

module.exports = router;
