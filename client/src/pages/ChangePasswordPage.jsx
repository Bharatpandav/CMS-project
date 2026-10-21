import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getPostLoginPath } from '../utils/roleRedirect.js';

export function ChangePasswordPage() {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
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
            navigate(
                getPostLoginPath({
                    ...nextUser,
                    isFirstLogin: false
                })
            );
        } catch (err) {
            setError(err.message || 'Password change failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>Change password</h1>
                {user?.isFirstLogin ? (
                    <p>You must set a new password before continuing.</p>
                ) : null}
            </header>
            <form className="form-card" onSubmit={handleSubmit}>
                {error ? (
                    <p className="form-error" role="alert">{error}</p>
                ) : null}
                <label>
                    Current password
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) =>
                            setCurrentPassword(e.target.value)
                        }
                        required
                    />
                </label>
                <label>
                    New password
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                    />
                </label>
                <button type="submit" disabled={loading}>
                    {loading ? 'Saving…' : 'Update password'}
                </button>
            </form>
        </div>
    );
}
