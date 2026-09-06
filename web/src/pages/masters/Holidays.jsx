import MasterCrudPage from '../../components/MasterCrudPage';

const HOLIDAY_TYPES = ['Public Holiday', 'Restricted Holiday', 'Optional Holiday'];

export default function Holidays() {
    return (
        <MasterCrudPage
            title="Holidays"
            apiPath="/holidays"
            icon="fa-umbrella-beach"
            scopedToCompany
            fields={[
                { key: 'name', label: 'Holiday Name', required: true },
                { key: 'date', label: 'Date', type: 'date', required: true },
                { key: 'type', label: 'Type', type: 'select', options: HOLIDAY_TYPES.map((t) => ({ value: t, label: t })) },
            ]}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'date', label: 'Date' },
                { key: 'type', label: 'Type' },
            ]}
        />
    );
}
