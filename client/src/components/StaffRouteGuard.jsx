import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRoleDashboardPath } from '../utils/navigationPaths.js';

export function StaffRouteGuard({ expectedRole, children }) {
    const { user } = useAuth();

    if (!user?.role || user.role !== expectedRole) {
        return (
            <Navigate
                to={user ? getRoleDashboardPath(user) : '/?login=1'}
                replace
            />
        );
    }

    return children;
}
