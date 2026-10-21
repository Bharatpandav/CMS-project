import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { RequirePasswordChanged } from './components/RequirePasswordChanged.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import { SimpleAuthLayout } from './layouts/SimpleAuthLayout.jsx';
import { AllComplaintsPage } from './pages/AllComplaintsPage.jsx';
import { BulkRegistrationPage } from './pages/BulkRegistrationPage.jsx';
import { CategoriesPage } from './pages/CategoriesPage.jsx';
import { ChangePasswordPage } from './pages/ChangePasswordPage.jsx';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { DepartmentsPage } from './pages/DepartmentsPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { PlaceholderPage } from './pages/PlaceholderPage.jsx';
import { PortalPage } from './pages/PortalPage.jsx';
import { RegisterUserPage } from './pages/RegisterUserPage.jsx';
import { MyProfilePage } from './pages/MyProfilePage.jsx';
import { StudentDashboardPage } from './pages/StudentDashboardPage.jsx';
import { StudentComplaintsPage } from './pages/StudentComplaintsPage.jsx';
import { StudentSupportPage } from './pages/StudentSupportPage.jsx';
import { RegisterComplaintPage } from './pages/RegisterComplaintPage.jsx';
import { staffRoleRoutes } from './routes/StaffRoleRoutes.jsx';
import { ADMIN_STAFF_ROLES } from './utils/staffRoles.js';
import { MANAGEMENT_PORTAL_ROLES } from './utils/managementAccess.js';
import { ManagementLayout } from './layouts/ManagementLayout.jsx';
import { ManagementDashboardPage } from './pages/ManagementDashboardPage.jsx';
import { ManagementUsersPage } from './pages/ManagementUsersPage.jsx';
import { ManagementImportExportPage } from './pages/ManagementImportExportPage.jsx';
import { ManagementRolesPage } from './pages/ManagementRolesPage.jsx';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route
                    path="/login"
                    element={<Navigate to="/?login=1" replace />}
                />
                <Route
                    path="/admin/login"
                    element={<Navigate to="/?admin=1" replace />}
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
                    path="/portal"
                    element={
                        <ProtectedRoute>
                            <RequirePasswordChanged>
                                <PortalPage />
                            </RequirePasswordChanged>
                        </ProtectedRoute>
                    }
                />

                <Route
                    element={
                        <ProtectedRoute roles={['student']}>
                            <RequirePasswordChanged>
                                <DashboardLayout />
                            </RequirePasswordChanged>
                        </ProtectedRoute>
                    }
                >
                    <Route
                        path="/student/dashboard"
                        element={<StudentDashboardPage />}
                    />
                    <Route
                        path="/student/complaints"
                        element={<StudentComplaintsPage />}
                    />
                    <Route
                        path="/student/complaints/register"
                        element={<RegisterComplaintPage />}
                    />
                    <Route
                        path="/student/track"
                        element={
                            <StudentComplaintsPage title="Track Status" />
                        }
                    />
                    <Route
                        path="/student/profile"
                        element={<MyProfilePage />}
                    />
                    <Route
                        path="/student/support"
                        element={<StudentSupportPage />}
                    />
                    <Route
                        path="/student/complaints/:id"
                        element={<ComplaintDetailPage />}
                    />
                </Route>

                <Route
                    element={
                        <ProtectedRoute
                            roles={ADMIN_STAFF_ROLES}
                            loginTo="/?admin=1"
                        >
                            <RequirePasswordChanged>
                                <DashboardLayout />
                            </RequirePasswordChanged>
                        </ProtectedRoute>
                    }
                >
                    {staffRoleRoutes('/advisor', 'advisor')}
                    {staffRoleRoutes('/hod', 'hod')}
                    {staffRoleRoutes('/dean', 'dean')}
                    {staffRoleRoutes('/vc', 'super_admin')}
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
                        path="/management/roles"
                        element={<ManagementRolesPage />}
                    />
                    <Route
                        path="/management/import-export"
                        element={<ManagementImportExportPage />}
                    />
                </Route>

                <Route
                    element={
                        <ProtectedRoute
                            roles={['super_admin']}
                            loginTo="/?admin=1"
                        >
                            <RequirePasswordChanged>
                                <DashboardLayout />
                            </RequirePasswordChanged>
                        </ProtectedRoute>
                    }
                >
                    <Route
                        path="/dashboard"
                        element={<DashboardPage />}
                    />
                    <Route
                        path="/users"
                        element={
                            <PlaceholderPage
                                title="All Users"
                                description="A paginated user list API is not available on the backend yet. Use Register User or Bulk Registration to add accounts."
                            />
                        }
                    />
                    <Route
                        path="/users/register"
                        element={<RegisterUserPage />}
                    />
                    <Route
                        path="/users/bulk"
                        element={<BulkRegistrationPage />}
                    />
                    <Route path="/departments" element={<DepartmentsPage />} />
                    <Route path="/complaints" element={<AllComplaintsPage />} />
                    <Route
                        path="/complaints/categories"
                        element={<CategoriesPage />}
                    />
                    <Route
                        path="/complaints/:id"
                        element={<ComplaintDetailPage />}
                    />
                    <Route
                        path="/audit-logs"
                        element={
                            <PlaceholderPage
                                title="Audit Logs"
                                description="Global audit log export is not available. Per-complaint logs are shown on the complaint detail page."
                            />
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <PlaceholderPage
                                title="Settings"
                                description="System settings management is not implemented on the backend yet."
                            />
                        }
                    />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
