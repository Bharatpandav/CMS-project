import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client.js';
import { PasswordField } from '../components/PasswordField.jsx';
import { validateNewPassword } from '../utils/passwordPolicy.js';
import { Button } from '../components/ui/index.js';

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const policy = validateNewPassword(newPassword);
        if (policy) {
            setError(policy);
            return;
        }
        if (newPassword !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (!token) {
            setError('Invalid or missing reset link');
            return;
        }
        setLoading(true);
        try {
            const data = await authApi.resetPassword(token, newPassword);
            setSuccess(data.message || 'Password updated.');
            setTimeout(() => navigate('/?login=1', { replace: true }), 2000);
        } catch (err) {
            setError(err.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-page profile-page--auth-only">
            <header className="page-header">
                <h1>Reset password</h1>
                <p>Choose a new password for your account.</p>
            </header>
            <form className="panel" onSubmit={handleSubmit} style={{ maxWidth: 420, margin: '0 auto' }}>
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                {success ? <p className="form-success" role="status">{success}</p> : null}
                <PasswordField
                    id="reset-new"
                    label="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading || Boolean(success)}
                />
                <PasswordField
                    id="reset-confirm"
                    label="Confirm password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading || Boolean(success)}
                />
                <Button type="submit" variant="primary" block disabled={loading || Boolean(success)}>
                    {loading ? 'Saving…' : 'Update password'}
                </Button>
                <p style={{ marginTop: '1rem' }}>
                    <Link to="/">Back to homepage</Link>
                </p>
            </form>
        </div>
    );
}
