import { ChangePasswordCard } from '../components/ChangePasswordCard.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
    MANAGEMENT_PROFILE_PATH,
    UNIFIED_PROFILE_PATH
} from '../utils/appPaths.js';
import { getRoleDashboardPath } from '../utils/navigationPaths.js';
import { canAccessManagementPortal } from '../utils/managementAccess.js';

export function ChangePasswordPage() {
    const { user } = useAuth();
    const firstLogin = user?.isFirstLogin;
    const profilePath = canAccessManagementPortal(user?.role)
        ? MANAGEMENT_PROFILE_PATH
        : UNIFIED_PROFILE_PATH;

    return (
        <div className="profile-page profile-page--auth-only">
            <PageHeader
                back={
                    firstLogin
                        ? undefined
                        : {
                              fallbackTo: profilePath,
                              label: 'Profile'
                          }
                }
                breadcrumbs={
                    firstLogin
                        ? undefined
                        : [
                              {
                                  to: getRoleDashboardPath(user),
                                  label: 'Dashboard'
                              },
                              { to: profilePath, label: 'Profile' },
                              { label: 'Change password' }
                          ]
                }
                title="Change password"
                description={
                    firstLogin
                        ? 'You must set a new password before continuing.'
                        : 'Update your account password securely.'
                }
            />
            <div className="profile-layout profile-layout--single">
                <ChangePasswordCard redirectOnSuccess />
            </div>
        </div>
    );
}
