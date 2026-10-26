import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolvePostLoginPath } from '../utils/navigationPaths.js';
import { PasswordField } from './PasswordField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getPostLoginPath } from '../utils/roleRedirect.js';
import { isAdminStaffRole } from '../utils/staffRoles.js';
import { canAccessManagementPortal } from '../utils/managementAccess.js';
import { getManagementPostLoginPath } from '../utils/managementAccess.js';
import { validateEmail } from '../utils/emailValidation.js';
import { ForgotPasswordDialog } from './ForgotPasswordDialog.jsx';

function IconShield() {
    return (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    );
}

export function AdminAuthModal({ open, onClose, initialMode = 'admin' }) {
    const titleId = useId();
    const navigate = useNavigate();
    const location = useLocation();
    const { login, logout } = useAuth();
    const emailRef = useRef(null);

    const [mode, setMode] = useState(initialMode);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [forgotOpen, setForgotOpen] = useState(false);

    const resetSensitive = () => {
        setPassword('');
        setError('');
    };

    const handleClose = () => {
        resetSensitive();
        setIdentifier('');
        setMode('admin');
        onClose();
    };

    useEffect(() => {
        if (!open) {
            resetSensitive();
            setIdentifier('');
            setMode(initialMode);
            return;
        }
        document.body.style.overflow = 'hidden';
        emailRef.current?.focus();
        return () => {
            document.body.style.overflow = '';
        };
    }, [open, initialMode]);

    useEffect(() => {
        if (open) {
            setMode(initialMode);
        }
    }, [open, initialMode]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && open) handleClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    if (!open) return null;

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        const emailCheck = validateEmail(identifier);
        if (!emailCheck.ok) {
            setError(emailCheck.message);
            return;
        }
        if (!password) {
            setError('Password is required');
            return;
        }
        setLoading(true);
        try {
            const data = await login(emailCheck.email, password, {
                loginChannel: 'staff'
            });
            const role = data.user?.role;

            if (role === 'student') {
                await logout();
                setError(
                    'Student accounts must use the student login. Management and administrator access is not available.'
                );
                return;
            }

            if (mode === 'management') {
                if (!canAccessManagementPortal(role)) {
                    await logout();
                    setError(
                        'This account is not authorized for the Management Portal.'
                    );
                    return;
                }
                handleClose();
                navigate(getManagementPostLoginPath(data.user), {
                    replace: true
                });
                return;
            }

            if (!isAdminStaffRole(role)) {
                await logout();
                setError('This account is not authorized for administrator login.');
                return;
            }

            handleClose();
            navigate(
                resolvePostLoginPath(data.user, location.state?.from, {
                    dashboardFallback: getPostLoginPath(data.user)
                }),
                { replace: true }
            );
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const isManagement = mode === 'management';

    return (
        <div className="login-modal-backdrop" onClick={handleClose} role="presentation">
            <div
                className="login-modal admin-auth-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" className="login-modal__close" onClick={handleClose} aria-label="Close">×</button>
                <div className="login-modal__icon"><IconShield /></div>
                <h2 id={titleId}>
                    {isManagement ? 'Management Login' : 'Administrator Login'}
                </h2>
                <p className="login-modal__sub">
                    {isManagement
                        ? 'Sign in to manage university users and registrations.'
                        : 'Sign in to manage and resolve university complaints.'}
                </p>

                <form className="login-modal__form" onSubmit={submit}>
                    {error ? <p className="form-error" role="alert">{error}</p> : null}
                    <label htmlFor="admin-login-id">
                        {isManagement ? 'Management email' : 'Email'}
                        <input
                            id="admin-login-id"
                            ref={emailRef}
                            className="ui-input"
                            type="email"
                            autoComplete="username"
                            placeholder="admin@university.edu"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            disabled={loading}
                        />
                    </label>
                    <PasswordField
                        id="admin-login-password"
                        label="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        disabled={loading}
                    />
                    <button
                        type="button"
                        className="login-modal__forgot link-teal"
                        onClick={() => setForgotOpen(true)}
                    >
                        Forgot password?
                    </button>
                    <button type="submit" className="login-modal__submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Login'}
                    </button>
                </form>
                <ForgotPasswordDialog
                    open={forgotOpen}
                    onClose={() => setForgotOpen(false)}
                />

                {!isManagement ? (
                    <div className="admin-auth-switch">
                        <div className="admin-auth-divider" />
                        <button
                            type="button"
                            className="admin-auth-switch__link"
                            onClick={() => {
                                resetSensitive();
                                setMode('management');
                            }}
                        >
                            Management Login
                        </button>
                        <p className="admin-auth-switch__hint">
                            Manage student and staff accounts.
                        </p>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="admin-auth-back"
                        onClick={() => {
                            resetSensitive();
                            setMode('admin');
                        }}
                    >
                        ← Back to Administrator Login
                    </button>
                )}
            </div>
        </div>
    );
}
