import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getPostLoginPath } from '../utils/roleRedirect.js';
import {
    canAccessManagementPortal,
    getManagementDashboardPath
} from '../utils/managementAccess.js';
import { validateNewPassword } from '../utils/passwordPolicy.js';
import { PasswordField } from './PasswordField.jsx';
import { PasswordRequirementsChecklist } from './PasswordRequirementsChecklist.jsx';

export function ChangePasswordCard({ redirectOnSuccess = false }) {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
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
            const nextUser = data.user || user;
            if (data.user) {
                updateUser(data.user);
            }
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setFieldErrors({});
            if (redirectOnSuccess) {
                const cleared = { ...nextUser, isFirstLogin: false };
                const dest = canAccessManagementPortal(cleared.role)
                    ? getManagementDashboardPath()
                    : getPostLoginPath(cleared);
                navigate(dest, { replace: true });
                return;
            }
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
                <PasswordRequirementsChecklist password={newPassword} />
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
