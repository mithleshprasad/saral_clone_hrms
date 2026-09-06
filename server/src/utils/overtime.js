// Overtime auto-calculation from a day's check-in/check-out — gated by the company's
// Attendance Configuration OT1/OT2 toggles:
//   OT1 = hours worked on a normal working day beyond standard_hours_per_day
//   OT2 = any hours worked on a weekly-off (Sunday) or company holiday
// There's no per-tier pay-rate split (the config only ever had two enable flags, never rate
// columns) — both tiers are gates on whether that category of overtime counts at all;
// payroll applies one overtime_rate_multiplier to whatever hours clear the gate.
function computeOvertimeHours({ checkInTime, checkOutTime, isOffDay, config }) {
    if (!checkInTime || !checkOutTime) return 0;
    const inMs = new Date(checkInTime).getTime();
    const outMs = new Date(checkOutTime).getTime();
    if (!(outMs > inMs)) return 0;
    const workedHours = (outMs - inMs) / (1000 * 60 * 60);

    if (isOffDay) {
        if (!config?.overtime2_enabled) return 0;
        return Math.round(workedHours * 100) / 100;
    }
    if (!config?.overtime1_enabled) return 0;
    const standardHours = Number(config?.standard_hours_per_day) || 8;
    return Math.max(0, Math.round((workedHours - standardHours) * 100) / 100);
}

// Converts a period's total overtime hours into a payable amount — hourly rate derived
// from the employee's full monthly gross over (working days × standard hours/day), times
// the company's configured overtime rate multiplier (e.g. 1.5x).
function computeOvertimeAmount({ overtimeHours, monthlyGross, workingDays, config }) {
    if (!overtimeHours) return 0;
    const standardHours = Number(config?.standard_hours_per_day) || 8;
    const multiplier = Number(config?.overtime_rate_multiplier) || 1.5;
    if (!workingDays || !standardHours) return 0;
    const hourlyRate = monthlyGross / (workingDays * standardHours);
    return Math.round(overtimeHours * hourlyRate * multiplier);
}

module.exports = { computeOvertimeHours, computeOvertimeAmount };
