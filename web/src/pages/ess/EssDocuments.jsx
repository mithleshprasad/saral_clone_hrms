import { useEffect, useState, useCallback } from 'react';
import apiClient, { openFile } from '../../api/client';

export default function EssDocuments() {
    const [documents, setDocuments] = useState([]);

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/ess/documents');
        setDocuments(data);
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div>
            <div className="page-header"><h1>My Documents</h1></div>

            <table className="win-grid">
                <thead><tr><th>Type</th><th>File</th><th>Uploaded</th><th></th></tr></thead>
                <tbody>
                    {documents.map((d) => (
                        <tr key={d.id}>
                            <td>{d.doc_type}</td>
                            <td>{d.original_name}</td>
                            <td>{new Date(d.created_at).toLocaleDateString('en-IN')}</td>
                            <td><button className="win-btn small" onClick={() => openFile(`/ess/documents/${d.id}/download`)}>Download</button></td>
                        </tr>
                    ))}
                    {documents.length === 0 && <tr><td colSpan={4} className="text-muted">No documents uploaded yet. Ask HR to upload your ID proofs or certificates.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
