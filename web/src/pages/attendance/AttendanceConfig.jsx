import MasterCrudPage from '../../components/MasterCrudPage';

const NWD_TYPES = [
    'Actual Days/Month', 'Only Working Days', 'Only Working Days + Weekly Holiday',
    'Only Working Days + Holiday', 'Fixed 30 Days/Month', 'Allow User to Edit Days in Month',
];

export default function AttendanceConfig() {
    return (
        <MasterCrudPage
            title="Attendance Configuration"
            apiPath="/attendance-configs"
            icon="fa-sliders-h"
            scopedToCompany
            fields={[
                { key: 'name', label: 'Attendance Config Name', required: true },
                { key: 'salary_calculation', label: 'Salary Calculation', type: 'select', options: [{ value: 'Dependent', label: 'Dependent' }, { value: 'Independent', label: 'Independent' }] },
                { key: 'overtime1_enabled', label: 'Overtime 1 (working-day OT)', type: 'checkbox' },
                { key: 'overtime2_enabled', label: 'Overtime 2 (weekly-off/holiday OT)', type: 'checkbox' },
                { key: 'standard_hours_per_day', label: 'Standard Hours/Day', type: 'number' },
                { key: 'overtime_rate_multiplier', label: 'Overtime Rate Multiplier', type: 'number' },
                { key: 'nwd_type', label: 'Salary Calendar Days (NWD)', type: 'select', options: NWD_TYPES.map((t) => ({ value: t, label: t })) },
                { key: 'register_type', label: 'Attendance Register Type', type: 'select', options: [{ value: 'Daily', label: 'Daily' }, { value: 'Monthly', label: 'Monthly' }, { value: 'Hourly', label: 'Hourly' }, { value: 'Leave Register', label: 'Leave Register' }] },
                { key: 'allow_more_than_working_days', label: 'Allow More Than Working Days', type: 'checkbox' },
                { key: 'remarks', label: 'Remarks' },
            ]}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'salary_calculation', label: 'Salary Calc.' },
                { key: 'nwd_type', label: 'NWD' },
                { key: 'register_type', label: 'Register Type' },
            ]}
        />
    );
}
