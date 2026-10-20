import { Route } from 'react-router-dom';
import { StaffRouteGuard } from '../components/StaffRouteGuard.jsx';
import { CategoriesPage } from '../pages/CategoriesPage.jsx';
import { StaffComplaintDetailPage } from '../pages/StaffComplaintDetailPage.jsx';
import { StaffComplaintsPage } from '../pages/StaffComplaintsPage.jsx';
import { StaffDashboardPage } from '../pages/StaffDashboardPage.jsx';

export function staffRoleRoutes(prefix, role) {
    const guard = (element) => (
        <StaffRouteGuard expectedRole={role}>{element}</StaffRouteGuard>
    );

    return (
        <>
            <Route
                path={`${prefix}/dashboard`}
                element={guard(<StaffDashboardPage />)}
            />
            <Route
                path={`${prefix}/complaints`}
                element={guard(<StaffComplaintsPage />)}
            />
            <Route
                path={`${prefix}/complaints/:id`}
                element={guard(<StaffComplaintDetailPage />)}
            />
            <Route
                path={`${prefix}/categories`}
                element={guard(<CategoriesPage />)}
            />
        </>
    );
}
