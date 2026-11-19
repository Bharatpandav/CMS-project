import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { RequirePasswordChanged } from './components/RequirePasswordChanged.jsx';
import { RoleGate } from './components/RoleGate.jsx';
import { SimpleAuthLayout } from './layouts/SimpleAuthLayout.jsx';
import { PortalShellLayout } from './layouts/PortalShellLayout.jsx';
import { AllComplaintsPage } from './pages/AllComplaintsPage.jsx';
import { BulkRegistrationPage } from './pages/BulkRegistrationPage.jsx';
import { ChangePasswordPage } from './pages/ChangePasswordPage.jsx';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage.jsx';
import { ComplaintLetterPage } from './pages/ComplaintLetterPage.jsx';
import { DepartmentsPage } from './pages/DepartmentsPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { PlaceholderPage } from './pages/PlaceholderPage.jsx';
import { RegisterUserPage } from './pages/RegisterUserPage.jsx';
import { MyProfilePage } from './pages/MyProfilePage.jsx';
import { StudentComplaintsPage } from './pages/StudentComplaintsPage.jsx';
import { RegisterComplaintPage } from './pages/RegisterComplaintPage.jsx';
import { StaffComplaintDetailPage } from './pages/StaffComplaintDetailPage.jsx';
import { StaffComplaintsPage } from './pages/StaffComplaintsPage.jsx';
import { ManagementUsersPage } from './pages/ManagementUsersPage.jsx';
import { ManagementRolesPage } from './pages/ManagementRolesPage.jsx';
import { ManagementComplaintsPage } from './pages/ManagementComplaintsPage.jsx';
import { ManagementComplaintDetailPage } from './pages/ManagementComplaintDetailPage.jsx';
import { UnifiedDashboardPage } from './pages/UnifiedDashboardPage.jsx';
import { HodDashboardPage } from './pages/HodDashboardPage.jsx';
import { VcDashboardPage } from './pages/VcDashboardPage.jsx';
import { DeanDashboardPage } from './pages/DeanDashboardPage.jsx';
import { StudentDashboardPage } from './pages/StudentDashboardPage.jsx';
import { StaffRouteGuard } from './components/StaffRouteGuard.jsx';
import { ADMIN_STAFF_ROLES } from './utils/staffRoles.js';
import { MANAGEMENT_PORTAL_ROLES } from './utils/managementAccess.js';
import { UNIFIED_DASHBOARD_PATH } from './utils/appPaths.js';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx';

function staffDetail(role) {
    return (
        <StaffRouteGuard expectedRole={role}>
            <StaffComplaintDetailPage />
        </StaffRouteGuard>
    );
}

function staffList(role) {
    return (
        <StaffRouteGuard expectedRole={role}>
            <StaffComplaintsPage />
        </StaffRouteGuard>
    );
}

const legacyDashboardRedirects = [
    '/advisor/dashboard',
    '/dashboard',
    '/portal'
].map((path) => (
    <Route
        key={path}
        path={path}
        element={<Navigate to={UNIFIED_DASHBOARD_PATH} replace />}
    />
));

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                    path="/login"
                    element={<Navigate to="/?login=1" replace />}
                />
                <Route
                    path="/admin/login"
                    element={<Navigate to="/?admin=1" replace />}
                />
                <Route
                    path="/complaints/:id/letter"
                    element={
                        <ProtectedRoute>
                            <RequirePasswordChanged>
                                <ComplaintLetterPage />
                            </RequirePasswordChanged>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/change-password"
                    element={
                        <ProtectedRoute>
                            <SimpleAuthLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<ChangePasswordPage />} />
                </Route>

                <Route
                    element={
                        <ProtectedRoute>
                            <RequirePasswordChanged>
                                <PortalShellLayout />
                            </RequirePasswordChanged>
                        </ProtectedRoute>
                    }
                >
                    <Route
                        path={UNIFIED_DASHBOARD_PATH}
                        element={<UnifiedDashboardPage />}
                    />

                    {legacyDashboardRedirects}

                    <Route
                        path="/student/dashboard"
                        element={
                            <RoleGate roles={['student']}>
                                <StudentDashboardPage />
                            </RoleGate>
                        }
                    />

                    <Route
                        path="/student/complaints"
                        element={
                            <RoleGate roles={['student']}>
                                <StudentComplaintsPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/student/complaints/register"
                        element={
                            <RoleGate roles={['student']}>
                                <RegisterComplaintPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/student/all-complaints"
                        element={
                            <RoleGate roles={['student']}>
                                <StudentComplaintsPage
                                    title="All Complaints"
                                    scope="public"
                                />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/student/track"
                        element={
                            <Navigate to="/student/all-complaints" replace />
                        }
                    />
                    <Route path="/app/profile" element={<MyProfilePage />} />
                    <Route
                        path="/student/profile"
                        element={<Navigate to="/app/profile" replace />}
                    />
                    <Route
                        path="/student/support"
                        element={
                            <Navigate to={UNIFIED_DASHBOARD_PATH} replace />
                        }
                    />
                    <Route
                        path="/student/complaints/:id"
                        element={
                            <RoleGate roles={['student']}>
                                <ComplaintDetailPage />
                            </RoleGate>
                        }
                    />

                    <Route
                        path="/advisor/complaints"
                        element={staffList('advisor')}
                    />
                    <Route
                        path="/advisor/complaints/:id"
                        element={staffDetail('advisor')}
                    />
                    <Route
                        path="/advisor/categories"
                        element={<Navigate to="/advisor/complaints" replace />}
                    />

                    <Route
                        path="/hod/dashboard"
                        element={
                            <RoleGate roles={['hod']}>
                                <HodDashboardPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/hod/complaints"
                        element={staffList('hod')}
                    />
                    <Route
                        path="/hod/complaints/:id"
                        element={staffDetail('hod')}
                    />
                    <Route
                        path="/hod/categories"
                        element={<Navigate to="/hod/complaints" replace />}
                    />

                    <Route
                        path="/dean/dashboard"
                        element={
                            <RoleGate roles={['dean']}>
                                <DeanDashboardPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/dean/complaints"
                        element={staffList('dean')}
                    />
                    <Route
                        path="/dean/complaints/:id"
                        element={staffDetail('dean')}
                    />
                    <Route
                        path="/dean/categories"
                        element={<Navigate to="/dean/complaints" replace />}
                    />

                    <Route
                        path="/vc/dashboard"
                        element={
                            <RoleGate roles={['super_admin']}>
                                <VcDashboardPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/vc/complaints"
                        element={staffList('super_admin')}
                    />
                    <Route
                        path="/vc/complaints/:id"
                        element={staffDetail('super_admin')}
                    />
                    <Route
                        path="/vc/categories"
                        element={<Navigate to="/vc/complaints" replace />}
                    />

                    {/* Complaint Management */}
                    <Route
                        path="/complaints"
                        element={
                            <RoleGate roles={['super_admin']}>
                                <AllComplaintsPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/complaints/categories"
                        element={<Navigate to="/complaints" replace />}
                    />
                    <Route
                        path="/complaints/:id"
                        element={
                            <RoleGate roles={ADMIN_STAFF_ROLES}>
                                <ComplaintDetailPage />
                            </RoleGate>
                        }
                    />

                    {/* User Management & Operations inside existing application shell */}
                    <Route
                        path="/management/users"
                        element={
                            <RoleGate roles={MANAGEMENT_PORTAL_ROLES}>
                                <ManagementUsersPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/users"
                        element={<Navigate to="/management/users" replace />}
                    />

                    <Route
                        path="/management/register"
                        element={
                            <RoleGate roles={MANAGEMENT_PORTAL_ROLES}>
                                <RegisterUserPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/users/register"
                        element={<Navigate to="/management/register" replace />}
                    />

                    <Route
                        path="/management/bulk"
                        element={
                            <RoleGate roles={MANAGEMENT_PORTAL_ROLES}>
                                <BulkRegistrationPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/users/bulk"
                        element={<Navigate to="/management/bulk" replace />}
                    />

                    <Route
                        path="/management/import-export"
                        element={<Navigate to="/management/bulk" replace />}
                    />

                    <Route
                        path="/management/departments"
                        element={
                            <RoleGate roles={['dean', 'hod', 'advisor']}>
                                <DepartmentsPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/departments"
                        element={<Navigate to="/management/departments" replace />}
                    />

                    <Route
                        path="/management/roles"
                        element={
                            <RoleGate roles={['super_admin']}>
                                <ManagementRolesPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/management/complaints"
                        element={
                            <RoleGate roles={MANAGEMENT_PORTAL_ROLES}>
                                <ManagementComplaintsPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/management/complaints/:id"
                        element={
                            <RoleGate roles={MANAGEMENT_PORTAL_ROLES}>
                                <ManagementComplaintDetailPage />
                            </RoleGate>
                        }
                    />

                    <Route
                        path="/management/dashboard"
                        element={<Navigate to={UNIFIED_DASHBOARD_PATH} replace />}
                    />
                    <Route
                        path="/management/categories"
                        element={<Navigate to="/management/complaints" replace />}
                    />
                    <Route
                        path="/management/profile"
                        element={<Navigate to="/app/profile" replace />}
                    />
                    <Route
                        path="/management/audit-logs"
                        element={<Navigate to="/audit-logs" replace />}
                    />
                    <Route
                        path="/management/settings"
                        element={<Navigate to="/settings" replace />}
                    />

                    <Route
                        path="/audit-logs"
                        element={
                            <RoleGate roles={['super_admin']}>
                                <PlaceholderPage
                                    title="Audit Logs"
                                    description="Global audit log export is not available. Per-complaint logs are shown on the complaint detail page."
                                />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <RoleGate roles={['super_admin']}>
                                <PlaceholderPage
                                    title="Settings"
                                    description="System settings management is not implemented on the backend yet."
                                />
                            </RoleGate>
                        }
                    />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
