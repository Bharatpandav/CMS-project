export function Button({
    variant = 'primary',
    type = 'button',
    className = '',
    block = false,
    children,
    ...props
}) {
    const classes = [
        'ui-btn',
        'cms-btn-reflect',
        `ui-btn--${variant}`,
        block ? 'ui-btn--block' : '',
        className
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button type={type} className={classes} {...props}>
            {children}
        </button>
    );
}
