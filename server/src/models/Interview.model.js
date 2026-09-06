const db = require('../config/db');

const Interview = {
    async listByCandidate(candidateId) {
        return db.all('SELECT * FROM interviews WHERE candidate_id = ? ORDER BY scheduled_at DESC', [candidateId]);
    },

    // Company-scoped list (through candidate -> job -> company) for a jobs-wide interview
    // calendar view — not used by the per-candidate screen, but keeps the model complete.
    async listByCompany(companyId) {
        return db.all(
            `SELECT i.*, c.name as candidate_name, j.title as job_title
             FROM interviews i
             JOIN candidates c ON i.candidate_id = c.id
             JOIN jobs j ON c.job_id = j.id
             WHERE j.company_id = ?
             ORDER BY i.scheduled_at DESC`,
            [companyId]
        );
    },

    async findById(id) {
        return db.get('SELECT * FROM interviews WHERE id = ?', [id]);
    },

    async create(d) {
        const { insertId } = await db.run(
            `INSERT INTO interviews (candidate_id, round, scheduled_at, interviewer_name, mode)
             VALUES (?,?,?,?,?)`,
            [d.candidate_id, d.round, d.scheduled_at, d.interviewer_name || null, d.mode || 'In-Person']
        );
        return this.findById(insertId);
    },

    async reschedule(id, { scheduled_at, round, interviewer_name, mode }) {
        await db.run(
            'UPDATE interviews SET scheduled_at = ?, round = ?, interviewer_name = ?, mode = ? WHERE id = ?',
            [scheduled_at, round, interviewer_name || null, mode || 'In-Person', id]
        );
        return this.findById(id);
    },

    async submitFeedback(id, { rating, recommendation, feedback, status }) {
        await db.run(
            'UPDATE interviews SET rating = ?, recommendation = ?, feedback = ?, status = ? WHERE id = ?',
            [rating || null, recommendation || null, feedback || null, status || 'Completed', id]
        );
        return this.findById(id);
    },

    async setStatus(id, status) {
        await db.run('UPDATE interviews SET status = ? WHERE id = ?', [status, id]);
        return this.findById(id);
    },

    async remove(id) {
        await db.run('DELETE FROM interviews WHERE id = ?', [id]);
    },
};

module.exports = Interview;
