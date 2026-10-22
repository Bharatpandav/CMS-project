import { Breadcrumbs } from './Breadcrumbs.jsx';
import { BackButton } from './BackButton.jsx';

export function PageHeader({
    title,
    description,
    breadcrumbs,
    back,
    actions,
    children,
    className = ''
}) {
    return (
        <header className={`app-page-header ${className}`.trim()}>
            {back ? (
                <BackButton
                    fallbackTo={back.fallbackTo}
                    label={back.label || 'Back'}
                />
            ) : null}
            {breadcrumbs?.length ? (
                <Breadcrumbs items={breadcrumbs} />
            ) : null}
            <div className="app-page-header__row">
                <div className="app-page-header__text">
                    {title ? <h1>{title}</h1> : null}
                    {description ? <p>{description}</p> : null}
                </div>
                {actions ? (
                    <div className="app-page-header__actions">{actions}</div>
                ) : null}
            </div>
            {children}
        </header>
    );
}
