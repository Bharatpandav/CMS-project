import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ManagementSidebar } from '../components/ManagementSidebar.jsx';
import { TopNav } from '../components/TopNav.jsx';

export function ManagementLayout() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [search, setSearch] = useState('');

    return (
        <div className="app-shell">
            <ManagementSidebar
                mobileOpen={mobileNavOpen}
                onClose={() => setMobileNavOpen(false)}
            />
            <div className="app-main">
                <TopNav
                    onMenuClick={() => setMobileNavOpen(true)}
                    search={search}
                    onSearchChange={setSearch}
                />
                <main className="app-content">
                    <Outlet context={{ search }} />
                </main>
            </div>
        </div>
    );
}
