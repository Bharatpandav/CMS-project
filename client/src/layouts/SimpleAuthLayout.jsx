import { Outlet } from 'react-router-dom';

export function SimpleAuthLayout() {
    return (
        <div className="simple-auth-layout">
            <Outlet />
        </div>
    );
}
