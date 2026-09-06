// Single source of truth for pricing — used by both the landing page's pricing teaser
// and the full comparison inside the Help Center's Plans & Pricing chapter, so the two
// views can never drift out of sync with each other.
export const PLANS = [
    {
        name: 'Free', icon: 'fa-seedling', price: 0, employees: 10, companies: 1,
        features: ['Payroll & payslips', 'Attendance & leave', 'Core reports'],
        note: 'Permanent, not a trial — matches Zoho/greytHR\'s actual free tiers.', cta: 'Start free', tagline: 'Free forever, up to 10 employees',
    },
    {
        name: 'Starter', icon: 'fa-shop', price: 799, employees: 25, companies: 1,
        features: ['Payroll & payslips', 'Attendance & leave', 'Core reports'],
        note: 'Slightly under Zoho\'s ₹1,000 at the same headcount.', cta: 'Get started', tagline: 'For your first few clients',
    },
    {
        name: 'Growth', icon: 'fa-arrow-trend-up', price: 2499, employees: 100, companies: 3,
        features: ['Everything in Starter', 'Automated statutory filing', 'Employee self-service portal', 'Recruitment & onboarding'],
        note: '1/3 to 1/6 of Zoho/greytHR/Keka at 100 employees.', cta: 'Get started', tagline: 'Automate filing & self-service', highlight: true,
    },
    {
        name: 'Professional', icon: 'fa-building', price: 5999, employees: 500, companies: 10,
        features: ['Everything in Growth', 'Letters & documents', 'Asset tracking', 'Helpdesk & performance reviews'],
        note: 'Roughly 1/7th of Keka at 500 employees.', cta: 'Get started', tagline: 'Every module, higher ceilings',
    },
    {
        name: 'Enterprise', icon: 'fa-crown', price: null, employees: null, companies: null,
        features: ['Everything, unlimited scale', 'Dedicated onboarding', 'Custom terms'],
        note: 'Large accounts — sold by conversation.', cta: 'Contact sales', tagline: 'Custom pricing',
    },
];

// Full feature matrix for the comparison table. true = included, false = not included,
// string = a plan-specific value (caps, support tier).
export const COMPARISON_ROWS = [
    { label: 'Max employees', values: ['10', '25', '100', '500', 'Unlimited'] },
    { label: 'Max companies', values: ['1', '1', '3', '10', 'Unlimited'] },
    { label: 'Payroll engine (PF/ESI/PT/TDS)', values: [true, true, true, true, true] },
    { label: 'Attendance & leave', values: [true, true, true, true, true] },
    { label: 'Reports & MIS', values: [true, true, true, true, true] },
    { label: 'Statutory filing (PF/ESI/24Q...)', values: [false, false, true, true, true] },
    { label: 'Employee self-service portal', values: [false, false, true, true, true] },
    { label: 'Recruitment & onboarding', values: [false, false, true, true, true] },
    { label: 'Letters & documents', values: [false, false, false, true, true] },
    { label: 'Asset tracking', values: [false, false, false, true, true] },
    { label: 'Helpdesk & performance reviews', values: [false, false, false, true, true] },
    { label: 'Support', values: ['Community', 'Email', 'Email', 'Priority email', 'Dedicated'] },
];
