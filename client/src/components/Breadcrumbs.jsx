import { Link } from 'react-router-dom';

export function Breadcrumbs({ items = [] }) {
    if (!items.length) return null;

    return (
        <nav className="app-breadcrumbs" aria-label="Breadcrumb">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                return (
                    <span key={`${item.label}-${index}`} className="app-breadcrumbs__item">
                        {index > 0 ? (
                            <span className="app-breadcrumbs__sep" aria-hidden="true">
                                /
                            </span>
                        ) : null}
                        {item.to && !isLast ? (
                            <Link to={item.to}>{item.label}</Link>
                        ) : (
                            <span
                                className={
                                    isLast ? 'app-breadcrumbs__current' : undefined
                                }
                                aria-current={isLast ? 'page' : undefined}
                            >
                                {item.label}
                            </span>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
