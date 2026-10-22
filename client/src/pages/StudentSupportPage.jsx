import { Link } from 'react-router-dom';

export function StudentSupportPage() {
    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>Support / Help</h1>
                <p>
                    For login issues, use your university-provided URN and
                    password. For complaint-related help, contact your
                    department office or student affairs through official
                    university channels.
                </p>
            </header>
            <article className="panel">
                <p>
                    Account passwords can be updated from{' '}
                    <Link to="/app/profile" className="link-teal">
                        My Profile
                    </Link>
                    .
                </p>
            </article>
        </div>
    );
}
