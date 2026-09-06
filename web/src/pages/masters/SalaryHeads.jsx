import MasterCrudPage from '../../components/MasterCrudPage';

export default function SalaryHeads() {
    return (
        <MasterCrudPage
            title="Salary Heads"
            apiPath="/salary-heads"
            icon="fa-money-check-alt"
            scopedToCompany
            fields={[
                { key: 'name', label: 'Name', required: true },
                { key: 'code', label: 'Code' },
                { key: 'type', label: 'Type', type: 'select', options: [{ value: 'Earning', label: 'Earning' }, { value: 'Deduction', label: 'Deduction' }] },
                {
                    key: 'form_16_type', label: 'Form 16 Category', type: 'select',
                    options: [
                        { value: 'Salary u/s 17(1)', label: 'Salary u/s 17(1)' },
                        { value: 'Perquisite u/s 17(2)', label: 'Perquisite u/s 17(2)' },
                        { value: 'Profit in lieu u/s 17(3)', label: 'Profit in lieu u/s 17(3)' },
                        { value: 'Exempt', label: 'Exempt' },
                    ],
                },
                { key: 'is_proportionate', label: 'Proportionate to Attendance', type: 'checkbox' },
                { key: 'consider_for_pf', label: 'Consider for PF', type: 'checkbox' },
                { key: 'consider_for_esi', label: 'Consider for ESI', type: 'checkbox' },
                { key: 'consider_for_bonus', label: 'Consider for Bonus', type: 'checkbox' },
                { key: 'consider_for_overtime', label: 'Consider for Overtime', type: 'checkbox' },
                { key: 'is_active', label: 'Active', type: 'checkbox' },
            ]}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'type', label: 'Type' },
                { key: 'consider_for_pf', label: 'PF', render: (r) => r.consider_for_pf ? 'Yes' : 'No' },
                { key: 'consider_for_esi', label: 'ESI', render: (r) => r.consider_for_esi ? 'Yes' : 'No' },
                { key: 'is_active', label: 'Active', render: (r) => r.is_active ? 'Yes' : 'No' },
            ]}
        />
    );
}
