import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** Leave protected routes first so session clear does not trigger login redirect. */
export function useLogoutToHome() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    return useCallback(async () => {
        navigate('/', { replace: true, state: null });
        await logout();
    }, [logout, navigate]);
}