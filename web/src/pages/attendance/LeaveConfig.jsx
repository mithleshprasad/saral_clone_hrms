import MasterCrudPage from '../../components/MasterCrudPage';

const BASIS_OPTIONS = [
    { value: 'Joining Date', label: 'Joining Date' },
    { value: 'Confirmation Date', label: 'Confirmation Date' },
    { value: 'Probationary Completion Date', label: 'Probationary Completion Date' },
];

export default function LeaveConfig() {
    return (
        <MasterCrudPage
            title="Leave Configuration"
            apiPath="/leave-types"
            icon="fa-calendar-week"
            scopedToCompany
            fields={[
                { key: 'name', label: 'Leave Type', required: true },
                { key: 'short_code', label: 'Short Code' },
                { key: 'max_days', label: 'Max Days / Year', type: 'number' },
                { key: 'color', label: 'Color (hex)' },

                { key: 'allotment_from_basis', label: 'Allotment From', type: 'select', options: BASIS_OPTIONS },
                { key: 'allotment_after_months', label: 'Allot After (months)', type: 'number' },
                { key: 'allotment_after_days', label: 'Allot After (days)', type: 'number' },
                { key: 'avail_from_basis', label: 'Avail From', type: 'select', options: BASIS_OPTIONS },
                { key: 'avail_after_months', label: 'Avail After (months)', type: 'number' },
                { key: 'avail_after_days', label: 'Avail After (days)', type: 'number' },

                { key: 'auto_allotment_enabled', label: 'Auto Leave Allotment', type: 'checkbox' },
                { key: 'allot_type', label: 'Allot Type', type: 'select', options: [{ value: 'Monthly', label: 'Monthly' }, { value: 'Half Yearly', label: 'Half Yearly' }, { value: 'Yearly', label: 'Yearly' }] },
                { key: 'year_type', label: 'Year Type', type: 'select', options: [{ value: 'Calendar Year', label: 'Calendar Year' }, { value: 'Financial Year', label: 'Financial Year' }] },
                { key: 'allot_round_off', label: 'Allot Round Off', type: 'select', options: [{ value: 'None', label: 'None' }, { value: 'Nearest 0.5', label: 'Nearest 0.5' }, { value: 'Nearest Whole', label: 'Nearest Whole' }] },

                { key: 'carry_over_enabled', label: 'Carry Over', type: 'checkbox' },
                { key: 'carry_over_lower_limit', label: 'Carry Over Lower Limit', type: 'number' },
                { key: 'carry_over_upper_limit', label: 'Carry Over Upper Limit', type: 'number' },
                { key: 'lapse_unavailed_on', label: 'Lapse Unavailed On (month)' },
                { key: 'lapse_exceeding', label: 'Lapse Exceeding', type: 'number' },

                { key: 'balance_round_off', label: 'Leave Balance Round Off', type: 'select', options: [{ value: 'None', label: 'None' }, { value: 'Nearest 0.5', label: 'Nearest 0.5' }, { value: 'Nearest Whole', label: 'Nearest Whole' }] },
                { key: 'encashment_enabled', label: 'Leave Encashment', type: 'checkbox' },
                { key: 'encashment_min_balance', label: 'Encashment Min. Balance', type: 'number' },
                { key: 'priority', label: 'Priority', type: 'number' },
                { key: 'remarks', label: 'Remarks' },
            ]}
            columns={[
                { key: 'name', label: 'Leave Type' },
                { key: 'short_code', label: 'Code' },
                { key: 'max_days', label: 'Max Days' },
                { key: 'carry_over_enabled', label: 'Carry Over', render: (r) => r.carry_over_enabled ? 'Yes' : 'No' },
                { key: 'encashment_enabled', label: 'Encashment', render: (r) => r.encashment_enabled ? 'Yes' : 'No' },
            ]}
        />
    );
}
