import MasterCrudPage from '../../components/MasterCrudPage';

export default function Branches() {
    return (
        <MasterCrudPage
            title="Branches"
            apiPath="/branches"
            icon="fa-code-branch"
            scopedToCompany
            fields={[
                { key: 'name', label: 'Name', required: true },
                { key: 'address', label: 'Address' },
                { key: 'phone', label: 'Phone' },
            ]}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'address', label: 'Address' },
                { key: 'phone', label: 'Phone' },
            ]}
        />
    );
}
