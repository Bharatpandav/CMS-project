import { ProfileFieldIcon } from './AppIcon.jsx';
import { getProfileFieldRows } from '../utils/profileFieldConfig.js';

function ProfileRow({ iconKey, label, value, isStatus }) {
    return (
        <div className="profile-row">
            <span className="profile-row__icon">
                <ProfileFieldIcon name={iconKey} />
            </span>
            <div className="profile-row__content">
                <span className="profile-row__label">{label}</span>
                {isStatus ? (
                    <span className="profile-row__value">
                        <AccountStatusBadge active={value === 'Active'} />
                    </span>
                ) : (
                    <span className="profile-row__value">{value}</span>
                )}
            </div>
        </div>
    );
}

function AccountStatusBadge({ active }) {
    if (active) {
        return (
            <span className="profile-status-badge profile-status-badge--active">
                Active
            </span>
        );
    }
    return (
        <span className="profile-status-badge profile-status-badge--inactive">
            Inactive
        </span>
    );
}

export function ProfileInfoCard({ profile, loading, error, onRetry }) {
    const rows = getProfileFieldRows(profile);

    return (
        <article className="profile-card">
            <header className="profile-card__header">
                <h2>Profile Information</h2>
                <p>Registered details (read-only)</p>
            </header>

            {error ? (
                <div className="inline-alert">
                    <span>{error}</span>
                    <button type="button" onClick={onRetry}>Retry</button>
                </div>
            ) : null}

            {loading ? (
                <p className="panel__loading">Loading profile…</p>
            ) : (
                <div className="profile-rows">
                    {rows.map((row) => (
                        <ProfileRow
                            key={row.label}
                            iconKey={row.iconKey}
                            label={row.label}
                            value={row.value}
                            isStatus={row.label === 'Account Status'}
                        />
                    ))}
                </div>
            )}
        </article>
    );
}
