import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PortalHeader } from '../components/PortalHeader.jsx';
import { PortalSidebar } from '../components/PortalSidebar.jsx';
import { useOffCanvasNav } from '../hooks/useOffCanvasNav.js';
import '../styles/home.css';
import '../styles/portal-unified.css';
import '../styles/cms-surfaces.css';
import '../styles/responsive-portal.css';

export function PortalShellLayout() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    useOffCanvasNav(mobileNavOpen, setMobileNavOpen);

    return (
        <div className="portal-shell">
            <PortalHeader
                menuOpen={mobileNavOpen}
                onMenuClick={() => setMobileNavOpen((open) => !open)}
            />
            <PortalSidebar
                variant="mobile"
                mobileOpen={mobileNavOpen}
                onClose={() => setMobileNavOpen(false)}
            />
            <button
                type="button"
                className={`portal-backdrop${mobileNavOpen ? ' is-open' : ''}`}
                onClick={() => setMobileNavOpen(false)}
                aria-hidden={!mobileNavOpen}
                tabIndex={mobileNavOpen ? 0 : -1}
                aria-label="Close navigation menu"
            />
            <div className="portal-shell__body">
                <PortalSidebar variant="desktop" />
                <main className="portal-main app-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
