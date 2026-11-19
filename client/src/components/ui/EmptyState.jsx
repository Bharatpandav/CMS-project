import { AppIcon } from '../AppIcon.jsx';

export function EmptyState({
    icon = 'clipboard-list',
    title,
    children,
    className = ''
}) {
    return (
        <div className={`ui-empty ${className}`.trim()}>
            {icon ? (
                <div className="ui-empty__icon">
                    <AppIcon name={icon} size="lg" />
                </div>
            ) : null}
            {title ? <p className="ui-empty__title">{title}</p> : null}
            {children ? (
                <div className="ui-empty__text">{children}</div>
            ) : null}
        </div>
    );
}
