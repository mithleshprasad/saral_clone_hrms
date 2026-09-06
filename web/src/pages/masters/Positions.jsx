import { useEffect, useState } from 'react';
import MasterCrudPage from '../../components/MasterCrudPage';
import apiClient from '../../api/client';
import { useAppState } from '../../context/AppStateContext';

export default function Positions() {
    const { companyId } = useAppState();
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        apiClient.get('/departments', { params: { company_id: companyId || undefined } }).then((res) => setDepartments(res.data));
    }, [companyId]);

    return (
        <MasterCrudPage
            title="Designations"
            apiPath="/positions"
            icon="fa-id-badge"
            scopedToCompany
            fields={[
                { key: 'title', label: 'Title', required: true },
                { key: 'department_id', label: 'Department', type: 'select', options: departments.map((d) => ({ value: d.id, label: d.name })) },
                { key: 'base_salary', label: 'Default Base Salary', type: 'number' },
                { key: 'lwf_category', label: 'LWF Category' },
                { key: 'deduct_pt', label: 'Deduct PT', type: 'checkbox' },
                { key: 'probation_period_days', label: 'Probation (days)', type: 'number' },
            ]}
            columns={[
                { key: 'title', label: 'Title' },
                { key: 'department_id', label: 'Department', render: (r) => departments.find((d) => d.id === r.department_id)?.name || '—' },
                { key: 'base_salary', label: 'Base Salary' },
            ]}
        />
    );
}
