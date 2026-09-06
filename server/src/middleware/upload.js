const multer = require('multer');

// In-memory storage — files are small (employee/attendance spreadsheets), parsed
// immediately and never written to disk.
module.exports = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});
