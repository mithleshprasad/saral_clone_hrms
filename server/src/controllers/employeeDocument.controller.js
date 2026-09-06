const service = require('../services/employeeDocument.service');
const auditLog = require('../services/auditLog.service');

module.exports = {
    list: async (req, res) => {
        res.json(await service.listByEmployee(req.params.id));
    },
    upload: async (req, res) => {
        const doc = await service.upload(req.params.id, req.file, req.body?.doc_type, req.user.id);
        auditLog.record({
            userId: req.user.id, username: req.user.username,
            action: 'Create', entityType: 'EmployeeDocument', entityId: doc.id,
            summary: `Uploaded "${doc.original_name}" (${doc.doc_type}) for employee #${req.params.id}`,
        });
        res.status(201).json(doc);
    },
    download: async (req, res) => {
        const { doc, filePath } = await service.getFileForDownload(req.params.docId);
        res.download(filePath, doc.original_name);
    },
    remove: async (req, res) => {
        await service.remove(req.params.docId);
        res.status(204).end();
    },
};
