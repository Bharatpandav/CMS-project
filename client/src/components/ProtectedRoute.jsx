import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRoleDashboardPath } from '../utils/navigationPaths.js';

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
        return <Navigate to={getRoleDashboardPath(user)} replace />;
    }

    return children;
}
