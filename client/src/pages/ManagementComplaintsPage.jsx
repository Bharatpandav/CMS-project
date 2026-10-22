import { useAuth } from '../context/AuthContext.jsx';
import { AllComplaintsPage } from './AllComplaintsPage.jsx';
import { StaffComplaintsPage } from './StaffComplaintsPage.jsx';

export function ManagementComplaintsPage() {
    const { user } = useAuth();
    if (user?.role === 'super_admin') {
        return <AllComplaintsPage />;
    }
    return <StaffComplaintsPage />;
}
