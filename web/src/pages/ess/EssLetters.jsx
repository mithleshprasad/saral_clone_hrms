import { useEffect, useState } from 'react';
import apiClient, { openFile } from '../../api/client';

export default function EssLetters() {
    const [letters, setLetters] = useState([]);

    useEffect(() => {
        apiClient.get('/ess/letters').then((res) => setLetters(res.data));
    }, []);

    return (
        <div>
            <div className="page-header"><h1>My Letters</h1></div>
            <table className="win-grid">
                <thead><tr><th>Type</th><th>Generated On</th><th></th></tr></thead>
                <tbody>
                    {letters.map((l) => (
                        <tr key={l.id}>
                            <td>{l.type}</td>
                            <td>{new Date(l.generated_at).toLocaleDateString()}</td>
                            <td><button className="win-btn small" onClick={() => openFile(`/ess/letters/${l.id}/download`)}>Download</button></td>
                        </tr>
                    ))}
                    {letters.length === 0 && <tr><td colSpan={3} className="text-muted">No letters generated for you yet — ask HR.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
