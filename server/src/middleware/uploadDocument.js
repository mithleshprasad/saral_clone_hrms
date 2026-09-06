const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'employee-docs');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    // Never trust the client's filename for the path on disk — a random name sidesteps
    // collisions and path-traversal entirely; the original name is kept separately in the
    // employee_documents row for display/download purposes.
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

module.exports = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXT.has(ext)) {
            // A plain Error has no .status, so app.js's error middleware falls back to 500 —
            // this is a client input mistake (wrong file type), not a server failure.
            const err = new Error(`Unsupported file type "${ext}" — allowed: ${[...ALLOWED_EXT].join(', ')}`);
            err.status = 400;
            return cb(err);
        }
        cb(null, true);
    },
});

module.exports.UPLOAD_DIR = UPLOAD_DIR;
