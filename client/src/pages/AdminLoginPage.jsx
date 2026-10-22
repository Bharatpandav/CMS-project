import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PasswordField } from '../components/PasswordField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
    getAdminLoginPath,
    getPostLoginPath
} from '../utils/roleRedirect.js';
import { isAdminStaffRole } from '../utils/staffRoles.js';
import '../styles/home.css';

export function AdminLoginPage() {
    const { login, logout, isAuthenticated, user } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (isAuthenticated && user) {
        const target = getAdminLoginPath(user);
        if (target) {
            return <Navigate to={target} replace />;
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!identifier.trim() || !password) {
            setError('Email and password are required');
            return;
        }

        setLoading(true);
        try {
            const data = await login(identifier.trim(), password);

            if (data.user?.role === 'student') {
                await logout();
                setError(
                    'Student accounts cannot use administrator login. Please use the student login on the homepage.'
                );
                return;
            }

            if (!isAdminStaffRole(data.user?.role)) {
                await logout();
                setError('This account is not authorized for administrator access.');
                return;
            }

            window.location.href = getPostLoginPath(data.user);
        } catch (err) {
            setError(
                err.message ||
                    'Invalid credentials. Please check your email and password.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page admin-login-page">
            <form className="login-card admin-login-card" onSubmit={handleSubmit}>
                <div className="public-brand__shield admin-login-logo">SB</div>
                <h1>Administrator Login</h1>
                <p className="login-sub">
                    Sign in to manage and resolve university complaints.
                </p>

                {error ? (
                    <p className="form-error" role="alert">{error}</p>
                ) : null}

                <label className="password-label">
                    Email
                    <input
                        className="ui-input"
                        type="email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="admin@university.edu"
                        autoComplete="username"
                        disabled={loading}
                        required
                    />
                </label>

                <PasswordField
                    id="admin-password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                />

                <button
                    type="submit"
                    className="login-modal__submit"
                    disabled={loading}
                >
                    {loading ? 'Signing in…' : 'Login'}
                </button>

                <Link to="/" className="admin-back-home">
                    ← Back to Home
                </Link>
            </form>
        </div>
    );
}
