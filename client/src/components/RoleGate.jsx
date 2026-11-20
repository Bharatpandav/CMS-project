import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRoleDashboardPath } from '../utils/navigationPaths.js';
import { normalizeStaffRole } from '../utils/managementAccess.js';

export function RoleGate({ roles, children }) {
    const { user } = useAuth();
    const role = normalizeStaffRole(user?.role);
    const allowed = roles?.map((r) => normalizeStaffRole(r)) ?? [];
    if (!allowed.length || allowed.includes(role)) {
        return children;
    }
    return <Navigate to={getRoleDashboardPath(user)} replace />;
}
