import { useId, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLoginSubmit } from '../hooks/useLoginSubmit.js';
import { PasswordField } from './PasswordField.jsx';
import { Button, Dialog, FieldError, Input, Label } from './ui/index.js';

export function LoginModal({ open, onClose }) {
    const titleId = useId();
    const descId = useId();
    const urnRef = useRef(null);
    const [urn, setUrn] = useState('');
    const [password, setPassword] = useState('');

    const { submitLogin, loading, error, setError } = useLoginSubmit({
        onSuccess: onClose
    });

    const handleClose = () => {
        setUrn('');
        setPassword('');
        setError('');
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await submitLogin(urn, password);
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            titleId={titleId}
            descId={descId}
            closeLabel="Close login dialog"
            initialFocusRef={urnRef}
            className="login-modal"
        >
            <div
                className="login-modal__icon"
                style={{
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 0.75rem',
                    color: 'var(--color-text-muted)'
                }}
            >
                <ShieldCheck size={40} strokeWidth={1.5} aria-hidden />
            </div>

            <h2 id={titleId} className="login-modal__title">
                Login to your account
            </h2>
            <p id={descId} className="login-modal__sub">
                Enter your URN and password to continue.
            </p>

            <form onSubmit={handleSubmit} className="login-modal__form">
                <FieldError>{error}</FieldError>

                <Label htmlFor="login-urn" hint="e.g. 22BCE1045">
                    URN
                    <Input
                        id="login-urn"
                        ref={urnRef}
                        type="text"
                        name="identifier"
                        placeholder="Enter your URN"
                        value={urn}
                        onChange={(e) => setUrn(e.target.value)}
                        autoComplete="username"
                        disabled={loading}
                        error={Boolean(error)}
                    />
                </Label>

                <PasswordField
                    id="login-password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                />

                <Button type="submit" variant="primary" block disabled={loading}>
                    {loading ? 'Logging in…' : 'Login'}
                </Button>
            </form>

            <p className="login-modal__note">
                Use your university-provided credentials (URN and password) to
                access the system.
            </p>
        </Dialog>
    );
}
