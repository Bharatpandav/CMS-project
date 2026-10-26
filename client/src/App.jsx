import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { RequirePasswordChanged } from './components/RequirePasswordChanged.jsx';
import { RoleGate } from './components/RoleGate.jsx';
import { SimpleAuthLayout } from './layouts/SimpleAuthLayout.jsx';
import { PortalShellLayout } from './layouts/PortalShellLayout.jsx';
import { AllComplaintsPage } from './pages/AllComplaintsPage.jsx';
import { BulkRegistrationPage } from './pages/BulkRegistrationPage.jsx';
import { CategoriesPage } from './pages/CategoriesPage.jsx';
import { ChangePasswordPage } from './pages/ChangePasswordPage.jsx';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage.jsx';
import { ComplaintLetterPage } from './pages/ComplaintLetterPage.jsx';
import { DepartmentsPage } from './pages/DepartmentsPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { PlaceholderPage } from './pages/PlaceholderPage.jsx';
import { RegisterUserPage } from './pages/RegisterUserPage.jsx';
import { MyProfilePage } from './pages/MyProfilePage.jsx';
import { StudentComplaintsPage } from './pages/StudentComplaintsPage.jsx';
import { StudentSupportPage } from './pages/StudentSupportPage.jsx';
import { RegisterComplaintPage } from './pages/RegisterComplaintPage.jsx';
import { StaffComplaintDetailPage } from './pages/StaffComplaintDetailPage.jsx';
import { StaffComplaintsPage } from './pages/StaffComplaintsPage.jsx';
import { ManagementUsersPage } from './pages/ManagementUsersPage.jsx';
import { ManagementImportExportPage } from './pages/ManagementImportExportPage.jsx';
import { ManagementRolesPage } from './pages/ManagementRolesPage.jsx';
import { ManagementDashboardPage } from './pages/ManagementDashboardPage.jsx';
import { ManagementComplaintsPage } from './pages/ManagementComplaintsPage.jsx';
import { ManagementComplaintDetailPage } from './pages/ManagementComplaintDetailPage.jsx';
import { ManagementLayout } from './layouts/ManagementLayout.jsx';
import { UnifiedDashboardPage } from './pages/UnifiedDashboardPage.jsx';
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

function staffCategories(role) {
    return (
        <StaffRouteGuard expectedRole={role}>
            <CategoriesPage />
        </StaffRouteGuard>
    );
}

const legacyDashboardRedirects = [
    '/student/dashboard',
    '/advisor/dashboard',
    '/hod/dashboard',
    '/dean/dashboard',
    '/vc/dashboard',
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
                            <RoleGate roles={['student']}>
                                <StudentSupportPage />
                            </RoleGate>
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
                        element={staffCategories('advisor')}
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
                        element={staffCategories('hod')}
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
                        element={staffCategories('dean')}
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
                        element={staffCategories('super_admin')}
                    />

                    <Route
                        path="/users"
                        element={
                            <RoleGate roles={['super_admin']}>
                                <Navigate
                                    to="/management/users"
                                    replace
                                />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/users/register"
                        element={
                            <RoleGate roles={['super_admin']}>
                                <RegisterUserPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/users/bulk"
                        element={
                            <RoleGate roles={['super_admin']}>
                                <BulkRegistrationPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/departments"
                        element={
                            <RoleGate roles={['super_admin']}>
                                <DepartmentsPage />
                            </RoleGate>
                        }
                    />
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
                        element={
                            <RoleGate roles={['super_admin']}>
                                <CategoriesPage />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/complaints/:id"
                        element={
                            <RoleGate roles={ADMIN_STAFF_ROLES}>
                                <ComplaintDetailPage />
                            </RoleGate>
                        }
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

                <Route
                    element={
                        <ProtectedRoute
                            roles={MANAGEMENT_PORTAL_ROLES}
                            loginTo="/?management=1"
                        >
                            <RequirePasswordChanged>
                                <ManagementLayout />
                            </RequirePasswordChanged>
                        </ProtectedRoute>
                    }
                >
                    <Route
                        path="/management/dashboard"
                        element={<ManagementDashboardPage />}
                    />
                    <Route
                        path="/management/users"
                        element={<ManagementUsersPage />}
                    />
                    <Route
                        path="/management/register"
                        element={<RegisterUserPage />}
                    />
                    <Route
                        path="/management/bulk"
                        element={<BulkRegistrationPage />}
                    />
                    <Route
                        path="/management/departments"
                        element={<DepartmentsPage />}
                    />
                    <Route
                        path="/management/import-export"
                        element={<ManagementImportExportPage />}
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
                        element={<ManagementComplaintsPage />}
                    />
                    <Route
                        path="/management/complaints/:id"
                        element={<ManagementComplaintDetailPage />}
                    />
                    <Route
                        path="/management/categories"
                        element={<CategoriesPage />}
                    />
                    <Route
                        path="/management/audit-logs"
                        element={
                            <PlaceholderPage
                                title="Audit Logs"
                                description="Global audit log export is not available. Per-complaint logs are shown on complaint detail pages."
                            />
                        }
                    />
                    <Route
                        path="/management/settings"
                        element={
                            <RoleGate roles={['super_admin']}>
                                <PlaceholderPage
                                    title="Settings"
                                    description="System settings management is not implemented on the backend yet."
                                />
                            </RoleGate>
                        }
                    />
                    <Route
                        path="/management/profile"
                        element={<MyProfilePage />}
                    />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
