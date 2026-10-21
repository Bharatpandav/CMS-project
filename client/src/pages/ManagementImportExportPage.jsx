import { Link } from 'react-router-dom';

export function ManagementImportExportPage() {
    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>Import / Export</h1>
                <p>Bulk import and filtered exports for university accounts.</p>
            </header>
            <article className="panel">
                <h2>Import</h2>
                <p>
                    Use{' '}
                    <Link to="/management/bulk" className="link-teal">
                        Bulk Registration
                    </Link>{' '}
                    to upload CSV files with row-level validation and credential
                    delivery.
                </p>
            </article>
            <article className="panel">
                <h2>Export</h2>
                <p>
                    From{' '}
                    <Link to="/management/users" className="link-teal">
                        All Users
                    </Link>
                    , apply filters and download CSV (server), Excel, or PDF
                    (filtered result set). Exports never include passwords or
                    authentication secrets.
                </p>
            </article>
        </div>
    );
}
