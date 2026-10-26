import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/client.js';
import { ChangePasswordCard } from '../components/ChangePasswordCard.jsx';
import { ProfileInfoCard } from '../components/ProfileInfoCard.jsx';
import { ProfileContactForm } from '../components/ProfileContactForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { getProfileHomePath } from '../utils/profileFieldConfig.js';

export function MyProfilePage() {
    const { user } = useAuth();
    const location = useLocation();
    const homePath = getProfileHomePath(location.pathname);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadProfile = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await authApi.getMe();
            setProfile(data.user);
        } catch (err) {
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    if (user?.isFirstLogin) {
        return <Navigate to="/change-password" replace />;
    }

    return (
        <div className="profile-page">
            <PageHeader
                className="profile-page__header"
                breadcrumbs={[
                    { to: homePath, label: 'Dashboard' },
                    { label: 'My Profile' }
                ]}
                title="My Profile"
                description="View your registered details and update your password."
            />

            <div className="profile-layout">
                <div className="profile-layout__main">
                    <ProfileInfoCard
                        profile={profile}
                        loading={loading}
                        error={error}
                        onRetry={loadProfile}
                    />
                    {user?.role === 'student' ? (
                        <p className="field-hint profile-readonly-note">
                            Email and phone are issued by the university and
                            cannot be edited here.
                            {!profile?.email || !profile?.phone
                                ? ' Missing contact details must be completed by an administrator.'
                                : ''}
                        </p>
                    ) : (
                        <ProfileContactForm
                            profile={profile}
                            onUpdated={(u) => setProfile(u)}
                        />
                    )}
                </div>
                <ChangePasswordCard />
            </div>
        </div>
    );
}
