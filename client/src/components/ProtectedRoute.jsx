import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({
    children,
    roles,
    loginTo = '/?login=1'
}) {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="page-loading">Checking session…</div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to={loginTo}
                replace
                state={{ from: location }}
            />
        );
    }

    if (roles?.length && !roles.includes(user?.role)) {
        return (
            <div className="page-error">
                <h1>Access denied</h1>
                <p>
                    Your role ({user?.role}) is not permitted to view this
                    section.
                </p>
            </div>
        );
    }

    return children;
}
