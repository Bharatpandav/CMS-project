import { useState } from 'react';
import { usersApi } from '../api/client.js';

export function BulkRegistrationPage() {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please choose a CSV file');
            return;
        }
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const data = await usersApi.bulkUpload(file);
            setResult(data);
        } catch (err) {
            setError(err.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const downloadCredentials = () => {
        if (!result?.credentialCSV) return;
        const blob = new Blob([result.credentialCSV], {
            type: 'text/csv;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user-credentials.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>Bulk Registration</h1>
                <p>
                    Upload a CSV with columns: name, email, role, department,
                    rollNumber, semester, section.
                </p>
            </header>

            <form className="form-card" onSubmit={handleSubmit}>
                {error ? (
                    <p className="form-error" role="alert">{error}</p>
                ) : null}
                <label className="file-input">
                    CSV file
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) =>
                            setFile(e.target.files?.[0] || null)
                        }
                    />
                </label>
                <button type="submit" disabled={loading || !file}>
                    {loading ? 'Uploading…' : 'Import users'}
                </button>
            </form>

            {result?.summary ? (
                <div className="result-card">
                    <h2>Import summary</h2>
                    <p>
                        Created: {result.summary.created} / Total rows:{' '}
                        {result.summary.total} (Failed:{' '}
                        {result.summary.failed})
                    </p>
                    {result.credentialCSV ? (
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={downloadCredentials}
                        >
                            Download credentials CSV
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
