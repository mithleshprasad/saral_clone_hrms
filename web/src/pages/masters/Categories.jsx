import MasterCrudPage from '../../components/MasterCrudPage';

export default function Categories() {
    return (
        <MasterCrudPage
            title="Employee Categories"
            apiPath="/employee-categories"
            icon="fa-layer-group"
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
