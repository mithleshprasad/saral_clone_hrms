const PaymentSettings = require('../models/PaymentSettings.model');
const ApiError = require('../utils/ApiError');

module.exports = {
    async get() {
        const row = await PaymentSettings.get();
        return row || { upi_id: null, payee_name: null };
    },

    async update({ upi_id, payee_name }) {
        if (upi_id && !/^[\w.+-]+@[\w.-]+$/.test(upi_id)) {
            throw ApiError.badRequest('upi_id must look like a UPI VPA, e.g. name@bank');
        }
        return PaymentSettings.upsert({ upi_id: upi_id || null, payee_name: payee_name || null });
    },
};
