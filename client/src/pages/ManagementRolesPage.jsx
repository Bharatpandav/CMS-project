import { PlaceholderPage } from './PlaceholderPage.jsx';

export function ManagementRolesPage() {
    return (
        <PlaceholderPage
            title="Roles & Permissions"
            description="Role hierarchy is enforced on the server via authorizeUserManagement. Advisors may create students; HODs may create advisors; deans may create HODs; the Vice Chancellor (super_admin) may create dean-level staff. Privilege escalation is blocked on registration and user update APIs."
        />
    );
}
