import { useId, useState } from 'react';
import { authApi } from '../api/client.js';
import { validateEmail } from '../utils/emailValidation.js';
import { Button, Dialog, FieldError, Input, Label } from './ui/index.js';

export function ForgotPasswordDialog({ open, onClose }) {
    const titleId = useId();
    const descId = useId();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleClose = () => {
        setEmail('');
        setError('');
        setSuccess('');
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const check = validateEmail(email);
        if (!check.ok) {
            setError(check.message);
            return;
        }
        setLoading(true);
        try {
            const data = await authApi.forgotPassword(check.email);
            setSuccess(data.message || 'Check your email for reset instructions.');
        } catch (err) {
            setError(err.message || 'Unable to process request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            titleId={titleId}
            descId={descId}
            className="login-modal"
            closeLabel="Close forgot password dialog"
        >
            <h2 id={titleId} className="login-modal__title">
                Forgot password
            </h2>
            <p id={descId} className="login-modal__sub">
                Enter the email registered to your account. We will send reset
                instructions if the account exists.
            </p>
            <form onSubmit={handleSubmit} className="login-modal__form">
                <FieldError>{error}</FieldError>
                {success ? (
                    <p className="form-success" role="status">{success}</p>
                ) : null}
                <Label htmlFor="forgot-email">
                    Email
                    <Input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading || Boolean(success)}
                    />
                </Label>
                <Button
                    type="submit"
                    variant="primary"
                    block
                    disabled={loading || Boolean(success)}
                >
                    {loading ? 'Sending…' : 'Send reset link'}
                </Button>
            </form>
        </Dialog>
    );
}
