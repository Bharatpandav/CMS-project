export function FieldError({ children, id }) {
    if (!children) return null;
    return (
        <p className="ui-field-error" id={id} role="alert">
            {children}
        </p>
    );
}
