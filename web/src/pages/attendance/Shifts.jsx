import MasterCrudPage from '../../components/MasterCrudPage';

export default function Shifts() {
    return (
        <MasterCrudPage
            title="Shifts"
            apiPath="/shifts"
            icon="fa-clock"
            scopedToCompany
            fields={[
                { key: 'name', label: 'Shift Name', required: true },
                { key: 'start_time', label: 'Start Time', type: 'time' },
                { key: 'end_time', label: 'End Time', type: 'time' },
                { key: 'grace_period_mins', label: 'Grace Period (mins)', type: 'number' },
            ]}
            columns={[
                { key: 'name', label: 'Name' },
                { key: 'start_time', label: 'Start' },
                { key: 'end_time', label: 'End' },
                { key: 'grace_period_mins', label: 'Grace (mins)' },
            ]}
        />
    );
}
