import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from 'react';
import {
    authApi,
    getAuthToken,
    getStoredUser,
    setAuthToken,
    setStoredUser
} from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getStoredUser());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            setUser(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const onExpired = () => {
            setAuthToken(null);
            setStoredUser(null);
            setUser(null);
        };
        window.addEventListener('cms:session-expired', onExpired);
        return () =>
            window.removeEventListener('cms:session-expired', onExpired);
    }, []);

    const login = useCallback(async (identifier, password, options = {}) => {
        const data = await authApi.login(
            identifier,
            password,
            options.loginChannel
        );
        setAuthToken(data.token);
        setStoredUser(data.user);
        setUser(data.user);
        return data;
    }, []);

    const updateUser = useCallback((nextUser) => {
        setStoredUser(nextUser);
        setUser(nextUser);
    }, []);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            /* clear local session even if server call fails */
        }
        setAuthToken(null);
        setStoredUser(null);
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({
            user,
            loading,
            isAuthenticated: Boolean(user && getAuthToken()),
            login,
            logout,
            updateUser
        }),
        [user, loading, login, logout, updateUser]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
}
