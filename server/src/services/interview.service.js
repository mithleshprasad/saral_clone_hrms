const Interview = require('../models/Interview.model');
const Candidate = require('../models/Candidate.model');
const ApiError = require('../utils/ApiError');

const VALID_RECOMMENDATIONS = ['Hire', 'No Hire', 'Hold'];

module.exports = {
    async listByCandidate(candidateId) {
        return Interview.listByCandidate(candidateId);
    },

    async listByCompany(companyId) {
        return Interview.listByCompany(companyId);
    },

    // Scheduling an interview is itself a pipeline signal — a candidate still sitting at
    // 'Applied' moves to 'Interview' automatically. Doesn't touch a candidate already past
    // that stage (e.g. re-scheduling a second round for someone at 'Offer').
    async schedule(data) {
        if (!data.candidate_id || !data.round || !data.scheduled_at) {
            throw ApiError.badRequest('candidate_id, round and scheduled_at are required');
        }
        const candidate = await Candidate.findById(data.candidate_id);
        if (!candidate) throw ApiError.notFound('Candidate not found');

        const interview = await Interview.create(data);
        // Older rows (created before candidate.service.js started defaulting status
        // explicitly) can still be NULL in the DB despite the schema's DEFAULT 'Applied'.
        if (!candidate.status || candidate.status === 'Applied') {
            await Candidate.update(candidate.id, { status: 'Interview' });
        }
        return interview;
    },

    async reschedule(id, data) {
        const existing = await Interview.findById(id);
        if (!existing) throw ApiError.notFound('Interview not found');
        if (!data.scheduled_at || !data.round) throw ApiError.badRequest('round and scheduled_at are required');
        return Interview.reschedule(id, data);
    },

    async submitFeedback(id, { rating, recommendation, feedback }) {
        const existing = await Interview.findById(id);
        if (!existing) throw ApiError.notFound('Interview not found');
        if (rating !== undefined && rating !== null && rating !== '' && (Number(rating) < 1 || Number(rating) > 5)) {
            throw ApiError.badRequest('rating must be between 1 and 5');
        }
        if (recommendation && !VALID_RECOMMENDATIONS.includes(recommendation)) {
            throw ApiError.badRequest(`recommendation must be one of: ${VALID_RECOMMENDATIONS.join(', ')}`);
        }
        return Interview.submitFeedback(id, { rating: rating || null, recommendation: recommendation || null, feedback, status: 'Completed' });
    },

    async setStatus(id, status) {
        if (!['Scheduled', 'Completed', 'Cancelled', 'No-Show'].includes(status)) {
            throw ApiError.badRequest('Invalid interview status');
        }
        const existing = await Interview.findById(id);
        if (!existing) throw ApiError.notFound('Interview not found');
        return Interview.setStatus(id, status);
    },

    async remove(id) {
        const existing = await Interview.findById(id);
        if (!existing) throw ApiError.notFound('Interview not found');
        await Interview.remove(id);
    },
};
