const dbManager = require('../database/db');

async function generatePayroll(data) {
    // Enforce payroll month locking (if a payroll month exists and is locked, prevent generation)
    const startParts = (data.startDate || '').split('-');
    const year = parseInt(startParts[0]);
    const month = parseInt(startParts[1]);
    
    // Calculate actual days in month
    const totalWorkingDays = (year && month) ? new Date(year, month, 0).getDate() : 30;

    if (year && month) {
        const pm = await dbManager.get("SELECT locked FROM payroll_months WHERE year=? AND month=?", [year, month]);
        if (pm && pm.locked) throw new Error('Payroll month is closed for the selected period');
    }

    // If employeeId is null -> process all active employees
    let employeesToProcess = [];
    const empSelect = `
        SELECT e.*, e.is_pt_enabled, p.base_salary as pos_salary, p.deduct_pt as position_deduct_pt
        FROM employees e
        LEFT JOIN positions p ON e.position_id = p.id
    `;

    if (!data.employeeId) {
        employeesToProcess = await dbManager.all(`${empSelect} WHERE e.status='Active'`);
    } else {
        const emp = await dbManager.get(`${empSelect} WHERE e.id=?`, [data.employeeId]);
        if (!emp) throw new Error("Employee not found");
        employeesToProcess = [emp];
    }

    // Fetch Settings for Calculation once
    const settingsArr = await dbManager.all("SELECT * FROM settings");
    const getSet = (k, def) => {
        const row = settingsArr.find(s => s.key === k);
        return row ? parseFloat(row.value) : def;
    };

    const pfPercentDefault = getSet('pf_percentage', 12) / 100;
    const ptAmount = getSet('professional_tax', 200);
    const taxSlab1 = getSet('tax_slab_1', 50000);
    const taxSlab2 = getSet('tax_slab_2', 100000);

    const today = new Date().toISOString().split('T')[0];

    const skipped = [];
    let processedCount = 0;

    for (const emp of employeesToProcess) {
        try {
            const empId = emp.id;
            // Check if payroll already exists for this employee & period
            const exists = await dbManager.get("SELECT id FROM payroll WHERE employee_id=? AND pay_period_start=? AND pay_period_end=?", [empId, data.startDate, data.endDate]);
            if (exists) {
                if (data.skip_completed) { skipped.push(empId); continue; }
                continue;
            }

            // 1. Calculate Full Monthly Gross CTC
            const monthlyBasic = emp.base_salary || 0;
            const monthlyDA = emp.da_rate || 0;
            const monthlyHRA = emp.hra_rate || 0;
            const monthlyConv = emp.conveyance_allowance || 0;
            const monthlyMed = emp.medical_allowance || 0;
            const monthlySpl = emp.special_allowance_fixed || 0;

            let totalMonthlyGross = monthlyBasic + monthlyDA + monthlyHRA + monthlyConv + monthlyMed + monthlySpl;
            
            // Fallback to position salary if no components are defined in employee master
            if (totalMonthlyGross <= 0 && emp.pos_salary > 0) {
                totalMonthlyGross = emp.pos_salary;
            }

            // 2. Attendance & LOP Calculation
            const att = await dbManager.get("SELECT count(*) as p FROM attendance WHERE employee_id=? AND status='Present' AND date BETWEEN ? AND ?", [empId, data.startDate, data.endDate]);
            const effDays = (att ? att.p : 0);
            // totalWorkingDays is now calculated above based on actual month

            let lop = 0;
            let attendanceFactor = 1.0;
            if (effDays < totalWorkingDays) {
                const lopDays = totalWorkingDays - Math.max(0, effDays);
                lop = Math.round((totalMonthlyGross / totalWorkingDays) * lopDays);
                attendanceFactor = effDays / totalWorkingDays;
            }

            // 3. Component Calculation (Pro-rated)
            let basic = 0, da = 0, hra = 0, conveyance = 0, medical = 0, special = 0;

            if (data.manual_basic && Number(data.manual_basic) > 0) {
                // Manual overrides (trust user input)
                basic = Math.round(Number(data.manual_basic) || 0);
                da = Math.round(Number(data.manual_da) || 0);
                hra = Math.round(Number(data.manual_hra) || 0);
                conveyance = Math.round(Number(data.manual_conveyance) || 0);
                medical = Math.round(Number(data.manual_medical) || 0);
                special = Math.round(Number(data.manual_special) || 0);
            } else if (monthlyBasic > 0 || monthlyDA > 0) {
                // Pro-rate Master values
                basic = Math.round(monthlyBasic * attendanceFactor);
                da = Math.round(monthlyDA * attendanceFactor);
                hra = Math.round(monthlyHRA * attendanceFactor);
                conveyance = Math.round(monthlyConv * attendanceFactor);
                medical = Math.round(monthlyMed * attendanceFactor);
                special = Math.round(monthlySpl * attendanceFactor);
            } else {
                // Fallback Auto-split Logic (50/40/10)
                const earnedGross = totalMonthlyGross * attendanceFactor;
                basic = Math.round(earnedGross * 0.5);
                hra = Math.round(basic * 0.4);
                special = Math.round(earnedGross - basic - hra);
            }

            // 4. Deductions
            // PF Calculation (Basic + DA)
            let pfPercent = emp.pf_rate ? (emp.pf_rate / 100) : pfPercentDefault;
            if (emp.is_pf_enabled === 0 || emp.is_pf_enabled === false) pfPercent = 0;
            
            const pfWage = (emp.pf_limit_enabled !== 0 && emp.pf_limit_enabled !== false) 
                ? Math.min(basic + da, emp.pf_limit || 15000) 
                : (basic + da);
            
            const employee_pf = Math.round(pfWage * pfPercent);

            let employer_pf = 0;
            let employer_eps = 0;
            if (pfPercent > 0) {
                const employerPfPercent = getSet('employer_pf_percentage', 12) / 100;
                employer_pf = Math.round(pfWage * employerPfPercent);

                const eps_wage_limit = getSet('eps_wage_limit', 15000);
                employer_eps = Math.round(Math.min(pfWage, eps_wage_limit) * 0.0833);
            }

            let pt = 0;
            const positionAllowsPt = emp.position_deduct_pt === null || emp.position_deduct_pt === undefined || emp.position_deduct_pt === 1;
            if ((emp.is_pt_enabled !== 0 && emp.is_pt_enabled !== false) && positionAllowsPt) {
                pt = ptAmount;
            }

            // VPF (Voluntary PF) - employee-elected additional PF % on top of mandatory PF
            const vpfPercent = (emp.vpf_percent || 0) / 100;
            const vpfAmount = vpfPercent > 0 ? Math.round(pfWage * vpfPercent) : 0;

            // Active loan EMI deduction
            const loanRow = await dbManager.get("SELECT COALESCE(SUM(monthly_emi),0) as emi FROM loans WHERE employee_id=? AND status='Active' AND balance > 0", [empId]);
            const loanDeduction = loanRow ? Math.round(loanRow.emi) : 0;

            // User-defined deductions (company-wide active custom deductions)
            const userDeductions = await dbManager.all("SELECT * FROM user_defined_deductions WHERE is_active = 1");

            // Tax: Depends on Earned Gross
            const earningsSubtotal = basic + da + hra + conveyance + medical + special;
            let tds = 0;
            if (earningsSubtotal > taxSlab2) tds = Math.round(earningsSubtotal * 0.1);
            else if (earningsSubtotal > taxSlab1) tds = Math.round(earningsSubtotal * 0.05);

            const bonuses = parseFloat(data.bonuses) || 0;
            const otherDeductions = parseFloat(data.deductions) || 0;
            const grossEarnings = earningsSubtotal + bonuses;

            let userDefinedDeductionTotal = 0;
            for (const ud of userDeductions) {
                userDefinedDeductionTotal += ud.calc_type === 'Percentage'
                    ? Math.round(grossEarnings * (ud.amount || 0) / 100)
                    : Math.round(ud.amount || 0);
            }

            // ESI
            const esiThreshold = getSet('esi_threshold', 21000);
            const esiEmployeeRate = getSet('esi_employee_percentage', 0.75) / 100;
            const esiEmployerRate = getSet('esi_employer_percentage', 3.25) / 100;
            let employee_esi = 0, employer_esi = 0;

            if (emp.is_esi_enabled === 1 || emp.is_esi_enabled === true) {
                if (grossEarnings <= esiThreshold) {
                    employee_esi = Math.round(grossEarnings * esiEmployeeRate);
                    employer_esi = Math.round(grossEarnings * esiEmployerRate);
                }
            }

            // Net Calculation
            const totalDeductions = employee_pf + vpfAmount + pt + tds + otherDeductions + employee_esi + lop + loanDeduction + userDefinedDeductionTotal;
            const net = grossEarnings - totalDeductions;

            await dbManager.run(
                `INSERT INTO payroll (
                    employee_id, pay_period_start, pay_period_end, base_salary,
                    basic_salary, da, hra, conveyance, medical, special_allowance,
                    bonuses, employee_pf, employer_pf, employer_eps, employee_esi,
                    employer_esi, professional_tax, tds, other_deductions, lop_amount,
                    gross_salary, total_deductions, net_salary, payment_date, status,
                    vpf_percent, vpf_amount, loan_deduction, user_defined_deduction
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'Paid', ?,?,?,?)`,
                [
                    empId, data.startDate, data.endDate, totalMonthlyGross,
                    basic, da, hra, conveyance, medical, special,
                    bonuses, employee_pf, employer_pf, employer_eps, employee_esi,
                    employer_esi, pt, tds, otherDeductions, lop,
                    grossEarnings, totalDeductions, net, today,
                    emp.vpf_percent || 0, vpfAmount, loanDeduction, userDefinedDeductionTotal
                ]
            );

            // Reduce active loan balance now that this month's EMI has been paid
            if (loanDeduction > 0) {
                await dbManager.run(
                    "UPDATE loans SET balance = MAX(0, balance - monthly_emi) WHERE employee_id=? AND status='Active' AND balance > 0",
                    [empId]
                );
                await dbManager.run("UPDATE loans SET status='Closed' WHERE employee_id=? AND balance <= 0 AND status='Active'", [empId]);
            }

            processedCount++;
        } catch (ex) {
            console.error('Payroll generation error for emp', emp.id, ex.message);
        }
    }

    return { success: true, processed: processedCount, skipped };
}

module.exports = { generatePayroll };