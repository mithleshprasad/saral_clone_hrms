// State-wise monthly Professional Tax slabs — approximate published rates for states that
// charge PT on a monthly cadence. Several states also add a small February top-up to reach
// an annual cap (e.g. Maharashtra's ₹2,500/yr cap via a higher Feb deduction); simplified
// here to a flat monthly figure. States that charge PT half-yearly instead of monthly
// (Tamil Nadu, Kerala) are intentionally not included — mixing cadences into a monthly
// payroll deduction would produce a wrong number, not just an approximate one. Verify
// against each state's current PT Act before filing; treat this as a strong starting point.
const STATE_PT_SLABS = {
    Karnataka: [
        { upto: 24999, amount: 0 },
        { upto: Infinity, amount: 200 },
    ],
    Maharashtra: [
        { upto: 7500, amount: 0 },
        { upto: 10000, amount: 175 },
        { upto: Infinity, amount: 200 },
    ],
    'West Bengal': [
        { upto: 10000, amount: 0 },
        { upto: 15000, amount: 110 },
        { upto: 25000, amount: 130 },
        { upto: 40000, amount: 150 },
        { upto: Infinity, amount: 200 },
    ],
    'Andhra Pradesh': [
        { upto: 15000, amount: 0 },
        { upto: 20000, amount: 150 },
        { upto: Infinity, amount: 200 },
    ],
    Telangana: [
        { upto: 15000, amount: 0 },
        { upto: 20000, amount: 150 },
        { upto: Infinity, amount: 200 },
    ],
    Gujarat: [
        { upto: 12000, amount: 0 },
        { upto: Infinity, amount: 200 },
    ],
    'Madhya Pradesh': [
        { upto: 18750, amount: 0 },
        { upto: 25000, amount: 125 },
        { upto: 33333, amount: 167 },
        { upto: Infinity, amount: 208 },
    ],
    Odisha: [
        { upto: 13304, amount: 0 },
        { upto: 25000, amount: 125 },
        { upto: Infinity, amount: 200 },
    ],
    Assam: [
        { upto: 10000, amount: 0 },
        { upto: 15000, amount: 150 },
        { upto: 25000, amount: 180 },
        { upto: Infinity, amount: 208 },
    ],
};

/**
 * @returns {number|null} the monthly PT amount for a mapped state, or null if the state
 *   isn't in the table — callers should fall back to the flat `professional_tax` setting.
 */
function computeMonthlyPT(state, grossSalary) {
    const slabs = STATE_PT_SLABS[state];
    if (!slabs) return null;
    const gross = Number(grossSalary) || 0;
    for (const { upto, amount } of slabs) {
        if (gross <= upto) return amount;
    }
    return slabs[slabs.length - 1].amount;
}

module.exports = { STATE_PT_SLABS, computeMonthlyPT };
