const xlsx = require('xlsx');
const Attendance = require('../models/Attendance.model');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { computeOvertimeHours } = require('../utils/overtime');

// Column headers accepted in a biometric-device punch export. Devices vary a lot in
// their export shape — this covers the two common ones: separate Date+Time columns, or
// one combined DateTime column — with an optional Type/Direction column (IN/OUT). When
// Type isn't provided, the earliest punch of the day is treated as check-in and the
// latest (if there's more than one) as check-out.
const PUNCH_COLUMN_MAP = {
    employeecode: 'employee_code', empcode: 'employee_code', empid: 'employee_code', code: 'employee_code',
    date: 'date', time: 'time', datetime: 'datetime', timestamp: 'datetime',
    type: 'type', direction: 'type', inout: 'type', punchtype: 'type',
};

function normalizeKey(k) {
    return String(k).toLowerCase().replace(/[\s_-]/g, '');
}

// Builds Y-M-D from the Date object's *local* calendar fields, not toISOString() (which
// converts to UTC first) — SheetJS parses CSV date-like cells into a Date representing
// local midnight for that day, so a UTC conversion on a UTC+ server (e.g. IST) silently
// shifts the date back by one day.
function dateToYmd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function normalizeDate(val) {
    if (val instanceof Date) return dateToYmd(val);
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    return isNaN(d) ? null : dateToYmd(d);
}

function normalizeTime(val) {
    if (val instanceof Date) return val.toTimeString().split(' ')[0];
    const m = String(val).trim().match(/^(\d{1,2}):(\d{2})(:(\d{2}))?/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}:${m[4] || '00'}` : null;
}

// First (only, in practice) Attendance Configuration row for the company — overtime
// gates/thresholds live here. No config row -> both OT gates read as disabled (0), so
// computeOvertimeHours naturally returns 0 rather than needing a special case.
async function getAttendanceConfig(companyId) {
    if (!companyId) return null;
    return db.get('SELECT * FROM attendance_configs WHERE company_id = ? LIMIT 1', [companyId]);
}

// Sunday or a company holiday counts as an off day for OT2 purposes — same convention
// Muster Roll uses for its Weekly-Off/Holiday columns.
async function holidayDatesInRange(companyId, start, end) {
    if (!companyId) return new Set();
    const rows = await db.all('SELECT date FROM holidays WHERE company_id = ? AND date BETWEEN ? AND ?', [companyId, start, end]);
    return new Set(rows.map((r) => r.date));
}

module.exports = {
    async list(query) {
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '50', 10);
        return Attendance.paginate({ ...query, page, limit });
    },

    async create(data) {
        return Attendance.create(data);
    },

    async upsertManual(data) {
        return Attendance.upsertManual(data);
    },

    async bulkUpsert(rows) {
        await Attendance.bulkUpsert(rows);
        return { success: true, processed: rows.length };
    },

    // Parses an uploaded biometric-device punch export (.xlsx/.csv) and bulk-upserts
    // attendance — matched by employee_code (the device-side identifier), grouped into
    // one check-in/check-out pair per employee per day.
    async punchImport(fileBuffer, { companyId }) {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });
        if (rows.length === 0) throw ApiError.badRequest('The uploaded file has no data rows');

        const punches = [];
        const skipped = [];

        for (let i = 0; i < rows.length; i++) {
            const raw = rows[i];
            const mapped = {};
            for (const [key, value] of Object.entries(raw)) {
                const field = PUNCH_COLUMN_MAP[normalizeKey(key)];
                if (field) mapped[field] = value;
            }

            let date, time;
            if (mapped.datetime) {
                date = normalizeDate(mapped.datetime);
                time = normalizeTime(mapped.datetime);
            } else {
                date = mapped.date ? normalizeDate(mapped.date) : null;
                time = mapped.time ? normalizeTime(mapped.time) : null;
            }
            if (!mapped.employee_code) { skipped.push({ row: i + 2, reason: 'Missing employee code' }); continue; }
            if (!date || !time) { skipped.push({ row: i + 2, reason: 'Unparseable date/time' }); continue; }

            punches.push({
                employeeCode: String(mapped.employee_code).trim(), date, time,
                type: mapped.type ? String(mapped.type).trim().toUpperCase() : null,
            });
        }

        if (punches.length === 0) {
            throw ApiError.badRequest('No valid punch rows found — check your column headers (Employee Code, Date, Time)');
        }

        const codes = [...new Set(punches.map((p) => p.employeeCode))];
        const placeholders = codes.map(() => '?').join(',');
        const employees = await db.all(
            `SELECT id, employee_code FROM employees WHERE employee_code IN (${placeholders})${companyId ? ' AND company_id = ?' : ''}`,
            companyId ? [...codes, companyId] : codes
        );
        const codeToId = new Map(employees.map((e) => [e.employee_code, e.id]));

        const groups = new Map();
        for (const p of punches) {
            const employeeId = codeToId.get(p.employeeCode);
            if (!employeeId) { skipped.push({ employeeCode: p.employeeCode, reason: 'No matching employee_code found' }); continue; }
            const key = `${employeeId}|${p.date}`;
            if (!groups.has(key)) groups.set(key, { employee_id: employeeId, date: p.date, punches: [] });
            groups.get(key).punches.push(p);
        }

        const groupList = [...groups.values()];
        const config = await getAttendanceConfig(companyId);
        let holidaySet = new Set();
        if (groupList.length > 0) {
            const dates = groupList.map((g) => g.date).sort();
            holidaySet = await holidayDatesInRange(companyId, dates[0], dates[dates.length - 1]);
        }

        const attendanceRows = [];
        for (const g of groupList) {
            g.punches.sort((a, b) => a.time.localeCompare(b.time));
            const inPunch = g.punches.find((p) => p.type === 'IN');
            const outPunch = [...g.punches].reverse().find((p) => p.type === 'OUT');
            const checkIn = inPunch ? `${g.date} ${inPunch.time}` : `${g.date} ${g.punches[0].time}`;
            const checkOut = outPunch ? `${g.date} ${outPunch.time}`
                : (g.punches.length > 1 && !inPunch ? `${g.date} ${g.punches[g.punches.length - 1].time}` : null);

            const isOffDay = holidaySet.has(g.date) || new Date(`${g.date}T00:00:00`).getDay() === 0;
            const overtimeHours = computeOvertimeHours({ checkInTime: checkIn, checkOutTime: checkOut, isOffDay, config });

            attendanceRows.push({
                employee_id: g.employee_id, date: g.date,
                check_in_time: checkIn, check_out_time: checkOut, overtime_hours: overtimeHours,
                status: 'Present', remarks: 'Imported from punch log',
            });
        }

        if (attendanceRows.length > 0) await Attendance.bulkUpsert(attendanceRows);

        return { imported: attendanceRows.length, totalPunchRows: rows.length, skipped };
    },

    async update(id, data) {
        const existing = await Attendance.findById(id);
        if (!existing) throw ApiError.notFound('Attendance record not found');
        return Attendance.update(id, data);
    },

    async remove(id) {
        await Attendance.remove(id);
    },

    async checkIn(employeeId) {
        const date = dateToYmd(new Date());
        const time = new Date().toTimeString().split(' ')[0];
        const existing = await Attendance.findByEmployeeDate(employeeId, date);
        if (existing) throw ApiError.conflict('Already checked in today');
        await Attendance.checkIn(employeeId, date, `${date} ${time}`);
        return { success: true };
    },

    async checkOut(employeeId) {
        const date = dateToYmd(new Date());
        const time = new Date().toTimeString().split(' ')[0];
        const checkOutTimestamp = `${date} ${time}`;

        const existing = await Attendance.findByEmployeeDate(employeeId, date);
        const employee = await db.get('SELECT company_id FROM employees WHERE id = ?', [employeeId]);
        const companyId = employee?.company_id;
        const config = await getAttendanceConfig(companyId);
        const isOffDay = companyId
            ? (await holidayDatesInRange(companyId, date, date)).has(date) || new Date(`${date}T00:00:00`).getDay() === 0
            : new Date(`${date}T00:00:00`).getDay() === 0;
        const overtimeHours = computeOvertimeHours({ checkInTime: existing?.check_in_time, checkOutTime: checkOutTimestamp, isOffDay, config });

        if (existing) {
            await Attendance.update(existing.id, { ...existing, check_out_time: checkOutTimestamp, overtime_hours: overtimeHours });
        } else {
            await Attendance.checkOut(employeeId, date, checkOutTimestamp);
        }
        return { success: true, overtime_hours: overtimeHours };
    },
};
