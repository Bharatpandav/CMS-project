import { NotificationBell } from './NotificationBell.jsx';

export function PublicHeaderActions({ onRequestLogin }) {
    return (
        <div className="public-header__actions">
            <NotificationBell onRequestLogin={onRequestLogin} />
        </div>
    );
}
