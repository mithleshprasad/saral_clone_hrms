import MasterCrudPage from '../../components/MasterCrudPage';

export default function Departments() {
    return (
        <MasterCrudPage
            title="Departments"
            apiPath="/departments"
            icon="fa-building"
            scopedToCompany
            fields={[
                { key: 'name', label: 'Name', required: true },
                { key: 'description', label: 'Description' },
            ]}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'description', label: 'Description' },
            ]}
        />
    );
}
