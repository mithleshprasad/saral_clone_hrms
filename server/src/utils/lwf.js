// State-wise Labour Welfare Fund contribution rates — approximate published flat amounts.
// LWF frequency varies by state (monthly/half-yearly/yearly) unlike PF/ESI/PT, so this is
// exposed only as a register/report (see statutoryFile.service.js's generateLwfRegister) —
// "what's due for this state, for this period" — rather than folded into the monthly
// payroll deduction, where guessing at a monthly-equivalent split across a dozen different
// state cadences would produce a wrong number more often than a right one.
const LWF_RATES = {
    Karnataka: { employee: 20, employer: 40, frequency: 'Yearly' },
    Maharashtra: { employee: 12, employer: 36, frequency: 'Half-Yearly' },
    'Tamil Nadu': { employee: 20, employer: 20, frequency: 'Half-Yearly' },
    Gujarat: { employee: 6, employer: 12, frequency: 'Half-Yearly' },
    'West Bengal': { employee: 3, employer: 15, frequency: 'Half-Yearly' },
    Delhi: { employee: 0.75, employer: 2.25, frequency: 'Half-Yearly' },
    Punjab: { employee: 5, employer: 20, frequency: 'Monthly' },
    Haryana: { employee: 31, employer: 62, frequency: 'Yearly' },
    'Madhya Pradesh': { employee: 10, employer: 30, frequency: 'Yearly' },
    Chhattisgarh: { employee: 15, employer: 45, frequency: 'Yearly' },
};

module.exports = { LWF_RATES };
