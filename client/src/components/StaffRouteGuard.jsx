import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getStaffDashboardPath } from '../utils/staffRoles.js';

export function StaffRouteGuard({ expectedRole, children }) {
    const { user } = useAuth();

    if (!user?.role || user.role !== expectedRole) {
        return (
            <Navigate
                to={
                    user?.role
                        ? getStaffDashboardPath(user.role)
                        : '/admin/login'
                }
                replace
            />
        );
    }

    return children;
}
