import MasterCrudPage from '../../components/MasterCrudPage';

export default function UserDeductions() {
    return (
        <MasterCrudPage
            title="User-Defined Deductions"
            apiPath="/user-deductions"
            icon="fa-minus-circle"
            scopedToCompany
            fields={[
                { key: 'name', label: 'Name', required: true },
                { key: 'code', label: 'Code' },
                { key: 'calc_type', label: 'Calc Type', type: 'select', options: [{ value: 'Fixed', label: 'Fixed Amount' }, { value: 'Percentage', label: '% of Gross' }] },
                { key: 'amount', label: 'Amount / %', type: 'number' },
                { key: 'is_active', label: 'Active', type: 'checkbox' },
            ]}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'calc_type', label: 'Type' },
                { key: 'amount', label: 'Amount' },
                { key: 'is_active', label: 'Active', render: (r) => r.is_active ? 'Yes' : 'No' },
            ]}
        />
    );
}
