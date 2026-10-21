import { useEffect, useId, useRef, useState } from 'react';
import { useLoginSubmit } from '../hooks/useLoginSubmit.js';

function IconShield() {
    return (
        <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    );
}

function IconEye({ open }) {
    if (open) {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
        );
    }
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

export function LoginModal({ open, onClose }) {
    const titleId = useId();
    const descId = useId();
    const dialogRef = useRef(null);
    const urnRef = useRef(null);
    const [urn, setUrn] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { submitLogin, loading, error, setError } = useLoginSubmit({
        onSuccess: onClose
    });

    useEffect(() => {
        if (!open) {
            setUrn('');
            setPassword('');
            setShowPassword(false);
            setError('');
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        urnRef.current?.focus();

        const handleKey = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKey);
        };
    }, [open, onClose, setError]);

    if (!open) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        await submitLogin(urn, password);
    };

    return (
        <div
            className="login-modal-backdrop"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                className="login-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="login-modal__close"
                    onClick={onClose}
                    aria-label="Close login dialog"
                >
                    ×
                </button>

                <div className="login-modal__icon">
                    <IconShield />
                </div>

                <h2 id={titleId}>Login to Your Account</h2>
                <p id={descId} className="login-modal__sub">
                    Enter your URN and password to continue.
                </p>

                <form onSubmit={handleSubmit} className="login-modal__form">
                    {error ? (
                        <p className="form-error" role="alert">{error}</p>
                    ) : null}

                    <label htmlFor="login-urn">
                        URN
                        <input
                            id="login-urn"
                            ref={urnRef}
                            type="text"
                            name="identifier"
                            placeholder="Enter your URN"
                            value={urn}
                            onChange={(e) => setUrn(e.target.value)}
                            autoComplete="username"
                            disabled={loading}
                        />
                        <span className="field-hint">e.g. 22BCE1045</span>
                    </label>

                    <label htmlFor="login-password">
                        Password
                        <span className="password-field">
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword((v) => !v)
                                }
                                aria-label={
                                    showPassword
                                        ? 'Hide password'
                                        : 'Show password'
                                }
                            >
                                <IconEye open={showPassword} />
                            </button>
                        </span>
                    </label>

                    <button
                        type="submit"
                        className="login-modal__submit"
                        disabled={loading}
                    >
                        {loading ? 'Logging in…' : 'Login'}
                    </button>
                </form>

                <p className="login-modal__note">
                    Use your university-provided credentials (URN and Password)
                    to access the system.
                </p>
            </div>
        </div>
    );
}
