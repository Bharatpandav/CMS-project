import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
    getRoleDashboardPath,
    resolvePostLoginPath
} from '../utils/navigationPaths.js';

export function useLoginSubmit({ onSuccess, postLoginPath } = {}) {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submitLogin = useCallback(
        async (identifier, password) => {
            setError('');
            const urn = identifier.trim();
            const pwd = password;

            if (!urn) {
                setError('URN or login ID is required');
                return false;
            }
            if (!pwd) {
                setError('Password is required');
                return false;
            }

            setLoading(true);
            try {
                const data = await login(urn, pwd, { loginChannel: 'student' });
                const dashboard = getRoleDashboardPath(data.user);
                let dest = dashboard;

                if (postLoginPath && data.user?.role === 'student') {
                    dest = postLoginPath;
                } else {
                    dest = resolvePostLoginPath(
                        data.user,
                        location.state?.from,
                        { dashboardFallback: dashboard }
                    );
                }

                navigate(dest, { replace: true, state: null });
                onSuccess?.();
                return true;
            } catch (err) {
                setError(
                    err.message ||
                        'Invalid credentials. Please check your URN and password.'
                );
                return false;
            } finally {
                setLoading(false);
            }
        },
        [login, navigate, onSuccess, location, postLoginPath]
    );

    return { submitLogin, loading, error, setError };
}
