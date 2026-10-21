import { useState } from 'react';
import { authApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { validateNewPassword } from '../utils/passwordPolicy.js';
import { PasswordField } from './PasswordField.jsx';

export function ChangePasswordCard() {
    const { updateUser } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const errors = {};

        if (!currentPassword) {
            errors.current = 'Current password is required';
        }

        const policyError = validateNewPassword(newPassword);
        if (policyError) {
            errors.new = policyError;
        }

        if (!confirmPassword) {
            errors.confirm = 'Please confirm your new password';
        } else if (newPassword !== confirmPassword) {
            errors.confirm = 'Passwords do not match';
        }

        if (
            currentPassword &&
            newPassword &&
            currentPassword === newPassword
        ) {
            errors.new = 'New password must be different from current password';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSuccess('');

        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            const data = await authApi.changePassword(
                currentPassword,
                newPassword
            );
            if (data.user) {
                updateUser(data.user);
            }
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setFieldErrors({});
            setSuccess('Password updated successfully.');
        } catch (err) {
            setFormError(err.message || 'Password update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <article className="profile-card">
            <header className="profile-card__header">
                <h2>Change Password</h2>
                <p>
                    Update your account password. Profile details cannot be
                    changed here.
                </p>
            </header>

            <form className="profile-password-form" onSubmit={handleSubmit}>
                {formError ? (
                    <p className="form-error" role="alert">{formError}</p>
                ) : null}
                {success ? (
                    <p className="form-success" role="status">{success}</p>
                ) : null}

                <PasswordField
                    id="profile-current-password"
                    label="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    error={fieldErrors.current}
                />
                <PasswordField
                    id="profile-new-password"
                    label="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    error={fieldErrors.new}
                />
                <PasswordField
                    id="profile-confirm-password"
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    error={fieldErrors.confirm}
                />

                <button
                    type="submit"
                    className="profile-btn-primary"
                    disabled={loading}
                >
                    {loading ? 'Updating…' : 'Update Password'}
                </button>
            </form>
        </article>
    );
}
