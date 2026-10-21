import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client.js';
import { ChangePasswordCard } from '../components/ChangePasswordCard.jsx';

function ProfileRow({ icon, label, value }) {
    return (
        <div className="profile-row">
            <span className="profile-row__icon" aria-hidden="true">{icon}</span>
            <div className="profile-row__content">
                <span className="profile-row__label">{label}</span>
                <span className="profile-row__value">{value}</span>
            </div>
        </div>
    );
}

function formatStatus(isActive) {
    if (isActive === true) return 'Active';
    if (isActive === false) return 'Inactive';
    return 'Not available';
}

function formatRole(role) {
    const labels = {
        student: 'Student',
        advisor: 'Advisor',
        hod: 'HOD',
        dean: 'Dean',
        super_admin: 'Super Admin'
    };
    return labels[role] || role || 'Not available';
}

export function MyProfilePage() {
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

    const na = 'Not available';

    return (
        <div className="profile-page">
            <nav className="breadcrumb" aria-label="Breadcrumb">
                <Link to="/student/dashboard">Home</Link>
                <span aria-hidden="true">→</span>
                <span>My Profile</span>
            </nav>

            <header className="page-header">
                <h1>My Profile</h1>
                <p>
                    View your registered details and update your password.
                </p>
            </header>

            {error ? (
                <div className="inline-alert">
                    <span>{error}</span>
                    <button type="button" onClick={loadProfile}>
                        Retry
                    </button>
                </div>
            ) : null}

            <div className="profile-layout">
                <article className="profile-card">
                    <header className="profile-card__header">
                        <h2>Profile Information</h2>
                        <p>Registered details (read-only)</p>
                    </header>

                    {loading ? (
                        <p className="panel__loading">Loading profile…</p>
                    ) : (
                        <div className="profile-rows">
                            <ProfileRow
                                icon="🎓"
                                label="URN / Roll Number"
                                value={profile?.rollNumber || na}
                            />
                            <ProfileRow
                                icon="👤"
                                label="Full Name"
                                value={profile?.name || na}
                            />
                            <ProfileRow
                                icon="✉️"
                                label="Email Address"
                                value={profile?.email || na}
                            />
                            <ProfileRow
                                icon="🏢"
                                label="Department"
                                value={profile?.department || na}
                            />
                            <ProfileRow
                                icon="📚"
                                label="Programme"
                                value={na}
                            />
                            <ProfileRow
                                icon="📅"
                                label="Year / Semester"
                                value={
                                    profile?.semester != null
                                        ? `Semester ${profile.semester}`
                                        : na
                                }
                            />
                            {profile?.section ? (
                                <ProfileRow
                                    icon="🔤"
                                    label="Section"
                                    value={profile.section}
                                />
                            ) : (
                                <ProfileRow
                                    icon="🔤"
                                    label="Section"
                                    value={na}
                                />
                            )}
                            <ProfileRow
                                icon="🛡️"
                                label="Role"
                                value={formatRole(profile?.role)}
                            />
                            <ProfileRow
                                icon="✅"
                                label="Account Status"
                                value={formatStatus(profile?.isActive)}
                            />
                        </div>
                    )}
                </article>

                <ChangePasswordCard />
            </div>
        </div>
    );
}
