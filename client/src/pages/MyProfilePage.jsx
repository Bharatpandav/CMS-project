import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/client.js';
import { ChangePasswordCard } from '../components/ChangePasswordCard.jsx';
import { ProfileInfoCard } from '../components/ProfileInfoCard.jsx';
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
                <ProfileInfoCard
                    profile={profile}
                    loading={loading}
                    error={error}
                    onRetry={loadProfile}
                />
                <ChangePasswordCard />
            </div>
        </div>
    );
}
