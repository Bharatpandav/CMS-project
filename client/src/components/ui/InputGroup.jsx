/**
 * Input with optional leading icon — reserves padding so text never overlaps icons.
 */
export function InputGroup({
    icon,
    noIcon = false,
    textarea = false,
    className = '',
    children
}) {
    const classes = [
        'ui-input-group',
        noIcon ? 'ui-input-group--no-icon' : '',
        textarea ? 'ui-input-group--textarea' : '',
        className
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes}>
            {!noIcon && icon ? (
                <span
                    className={`ui-input-group__icon${
                        textarea ? ' ui-input-group__icon--textarea' : ''
                    }`}
                    aria-hidden="true"
                >
                    {icon}
                </span>
            ) : null}
            {children}
        </div>
    );
}
