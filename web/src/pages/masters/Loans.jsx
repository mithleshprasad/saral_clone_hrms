import { useEffect, useState } from 'react';
import MasterCrudPage from '../../components/MasterCrudPage';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';

export default function Loans() {
    const { companyId } = useAppState();
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        apiClient.get('/employees', { params: { companyId: companyId || undefined, limit: 500 } })
            .then((res) => setEmployees(res.data.employees));
    }, [companyId]);

    const empOptions = employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }));

    return (
        <MasterCrudPage
            title="Loan / Advance Setup"
            apiPath="/loans"
            icon="fa-hand-holding-dollar"
            scopedToCompany
            fields={[
                { key: 'employee_id', label: 'Employee', type: 'select', options: empOptions, required: true },
                { key: 'loan_type', label: 'Loan Type' },
                { key: 'principal_amount', label: 'Principal Amount', type: 'number' },
                { key: 'monthly_emi', label: 'Monthly EMI', type: 'number' },
                { key: 'start_date', label: 'Start Date', type: 'date' },
                { key: 'balance', label: 'Outstanding Balance', type: 'number' },
                { key: 'status', label: 'Status', type: 'select', options: [{ value: 'Active', label: 'Active' }, { value: 'Closed', label: 'Closed' }] },
            ]}
            columns={[
                { key: 'employee_id', label: 'Employee', render: (r) => empOptions.find((o) => o.value === r.employee_id)?.label || r.employee_id },
                { key: 'loan_type', label: 'Type' },
                { key: 'monthly_emi', label: 'EMI' },
                { key: 'balance', label: 'Balance' },
                { key: 'status', label: 'Status' },
            ]}
        />
    );
}
