import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ManagementPortalHeader } from '../components/management/ManagementPortalHeader.jsx';
import { ManagementPortalSidebar } from '../components/management/ManagementPortalSidebar.jsx';
import { useOffCanvasNav } from '../hooks/useOffCanvasNav.js';
import '../styles/management-portal.css';
import '../styles/cms-surfaces.css';
import '../styles/responsive-portal.css';

export function ManagementLayout() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    useOffCanvasNav(mobileNavOpen, setMobileNavOpen);
    const navigate = useNavigate();

    const handleSearch = (query) => {
        navigate(`/management/users?search=${encodeURIComponent(query)}`);
    };

    return (
        <div className="mgmt-shell">
            <ManagementPortalSidebar variant="desktop" />
            <ManagementPortalSidebar
                variant="mobile"
                mobileOpen={mobileNavOpen}
                onClose={() => setMobileNavOpen(false)}
            />
            <button
                type="button"
                className={`mgmt-backdrop${mobileNavOpen ? ' is-open' : ''}`}
                onClick={() => setMobileNavOpen(false)}
                aria-hidden={!mobileNavOpen}
                tabIndex={mobileNavOpen ? 0 : -1}
                aria-label="Close navigation menu"
            />
            <div className="mgmt-main">
                <ManagementPortalHeader
                    menuOpen={mobileNavOpen}
                    onMenuClick={() => setMobileNavOpen((open) => !open)}
                    onSearch={handleSearch}
                />
                <main className="mgmt-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
