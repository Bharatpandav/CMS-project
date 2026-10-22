import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRoleDashboardPath } from '../utils/navigationPaths.js';

export function NotFoundPage() {
    const { user, isAuthenticated } = useAuth();
    const home = isAuthenticated
        ? getRoleDashboardPath(user)
        : '/';

    return (
        <div className="page-stack" style={{ maxWidth: '32rem', margin: '2rem auto' }}>
            <article className="panel">
                <h1>Page not found</h1>
                <p>
                    The page you requested does not exist or you may not have
                    permission to view it.
                </p>
                <p>
                    <Link to={home} className="link-teal">
                        Go to {isAuthenticated ? 'your dashboard' : 'homepage'}
                    </Link>
                </p>
            </article>
        </div>
    );
}
