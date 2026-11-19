export function Label({ className = '', children, hint, ...props }) {
    return (
        <label className={`ui-label ${className}`.trim()} {...props}>
            {children}
            {hint ? <span className="ui-field-hint">{hint}</span> : null}
        </label>
    );
}
