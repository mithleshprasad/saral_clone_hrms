// Progressive (slab-wise) Indian income-tax engine — FY 2024-25 statutory rates.
// Payroll TDS is estimated by annualizing the current period's earnings, running that
// through the applicable regime's slabs, applying the Section 87A rebate and Health &
// Education Cess, then dividing back down to a monthly figure. This replaces a flat
// cliff-rate placeholder (5%/10% on the whole monthly amount past a threshold) with the
// actual marginal-rate computation the law requires.

const NEW_REGIME_SLABS = [
    { upto: 300000, rate: 0 },
    { upto: 700000, rate: 0.05 },
    { upto: 1000000, rate: 0.10 },
    { upto: 1200000, rate: 0.15 },
    { upto: 1500000, rate: 0.20 },
    { upto: Infinity, rate: 0.30 },
];

const OLD_REGIME_SLABS = [
    { upto: 250000, rate: 0 },
    { upto: 500000, rate: 0.05 },
    { upto: 1000000, rate: 0.20 },
    { upto: Infinity, rate: 0.30 },
];

const STANDARD_DEDUCTION = { New: 75000, Old: 50000 };
const REBATE_87A_THRESHOLD = { New: 700000, Old: 500000 };
const REBATE_87A_MAX = { New: 25000, Old: 12500 };
const CESS_RATE = 0.04;

const SURCHARGE_SLABS = {
    New: [
        { upto: 5000000, rate: 0 },
        { upto: 10000000, rate: 0.10 },
        { upto: 20000000, rate: 0.15 },
        { upto: Infinity, rate: 0.25 }, // capped at 25% under the new regime since FY2023-24
    ],
    Old: [
        { upto: 5000000, rate: 0 },
        { upto: 10000000, rate: 0.10 },
        { upto: 20000000, rate: 0.15 },
        { upto: 50000000, rate: 0.25 },
        { upto: Infinity, rate: 0.37 },
    ],
};

function slabsFor(regime) {
    return regime === 'Old' ? OLD_REGIME_SLABS : NEW_REGIME_SLABS;
}

// Marginal-rate tax on a slab table — each band's rate applies only to the income
// falling inside that band, not the whole amount (the bug the old flat-rate code had).
function taxFromSlabs(taxableIncome, slabs) {
    let tax = 0;
    let lower = 0;
    for (const { upto, rate } of slabs) {
        if (taxableIncome <= lower) break;
        const bandAmount = Math.min(taxableIncome, upto) - lower;
        tax += bandAmount * rate;
        lower = upto;
    }
    return tax;
}

function surchargeFor(taxableIncome, tax, regime) {
    const slabs = SURCHARGE_SLABS[regime] || SURCHARGE_SLABS.New;
    let rate = 0;
    for (const { upto, rate: r } of slabs) {
        if (taxableIncome <= upto) { rate = r; break; }
    }
    return tax * rate;
}

/**
 * @param {number} annualGrossIncome - annualized gross salary (before standard deduction)
 * @param {'New'|'Old'} regime
 * @param {number} [declaredDeductions] - old-regime-only investment declarations (80C/80D/HRA/home loan/other); ignored under the new regime
 * @returns {{ annualTax: number, standardDeduction: number, taxableIncome: number, rebateApplied: boolean }}
 */
function computeAnnualTax({ annualGrossIncome, regime = 'New', declaredDeductions = 0 }) {
    const effectiveRegime = regime === 'Old' ? 'Old' : 'New';
    const standardDeduction = STANDARD_DEDUCTION[effectiveRegime];
    const eligibleDeductions = effectiveRegime === 'Old' ? Math.max(0, declaredDeductions) : 0;

    const taxableIncome = Math.max(0, annualGrossIncome - standardDeduction - eligibleDeductions);

    let tax = taxFromSlabs(taxableIncome, slabsFor(effectiveRegime));

    const rebateThreshold = REBATE_87A_THRESHOLD[effectiveRegime];
    let rebateApplied = false;
    if (taxableIncome <= rebateThreshold) {
        tax = Math.max(0, tax - Math.min(tax, REBATE_87A_MAX[effectiveRegime]));
        if (tax === 0) rebateApplied = true;
    }

    const surcharge = surchargeFor(taxableIncome, tax, effectiveRegime);
    const cess = (tax + surcharge) * CESS_RATE;
    const annualTax = Math.round(tax + surcharge + cess);

    return { annualTax, standardDeduction, taxableIncome: Math.round(taxableIncome), rebateApplied };
}

/**
 * Estimates this period's TDS by annualizing the period's taxable earnings.
 * @param {number} periodGrossIncome - this pay period's gross earnings (e.g. monthly)
 * @param {number} periodsPerYear - typically 12 for monthly payroll
 */
function estimatePeriodTds({ periodGrossIncome, periodsPerYear = 12, regime = 'New', annualDeclaredDeductions = 0 }) {
    const annualGrossIncome = periodGrossIncome * periodsPerYear;
    const { annualTax } = computeAnnualTax({ annualGrossIncome, regime, declaredDeductions: annualDeclaredDeductions });
    return Math.round(annualTax / periodsPerYear);
}

module.exports = {
    NEW_REGIME_SLABS,
    OLD_REGIME_SLABS,
    STANDARD_DEDUCTION,
    computeAnnualTax,
    estimatePeriodTds,
};
