export function StaffComplaintActionCard({
    title,
    description,
    icon: Icon,
    tone = 'default',
    children,
    footer
}) {
    return (
        <section
            className={`staff-action-card staff-action-card--${tone}`.trim()}
        >
            <header className="staff-action-card__head">
                {Icon ? (
                    <span className="staff-action-card__icon" aria-hidden>
                        <Icon size={18} strokeWidth={1.75} />
                    </span>
                ) : null}
                <div className="staff-action-card__titles">
                    <h3>{title}</h3>
                    {description ? <p>{description}</p> : null}
                </div>
            </header>
            {children ? (
                <div className="staff-action-card__body">{children}</div>
            ) : null}
            {footer ? (
                <div className="staff-action-card__footer">{footer}</div>
            ) : null}
        </section>
    );
}

export function StaffActionField({
    label,
    hint,
    htmlFor,
    required = false,
    children
}) {
    return (
        <div className="staff-action-field">
            <label className="staff-action-field__label" htmlFor={htmlFor}>
                {label}
                {required ? (
                    <span className="staff-action-field__req" aria-hidden>
                        {' '}
                        *
                    </span>
                ) : null}
            </label>
            {hint ? (
                <p className="staff-action-field__hint">{hint}</p>
            ) : null}
            {children}
        </div>
    );
}