import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRoleDashboardPath } from '../utils/navigationPaths.js';

export function RoleGate({ roles, children }) {
    const { user } = useAuth();
    if (!roles?.length || roles.includes(user?.role)) {
        return children;
    }
    return <Navigate to={getRoleDashboardPath(user)} replace />;
}
