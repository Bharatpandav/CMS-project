import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function RequirePasswordChanged({ children }) {
    const { user } = useAuth();
    const location = useLocation();

    if (user?.isFirstLogin) {
        if (location.pathname !== '/change-password') {
            return <Navigate to="/change-password" replace />;
        }
        return children;
    }

    return children;
}
