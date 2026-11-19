import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
    { className = '', error, ...props },
    ref
) {
    const classes = [
        'ui-input',
        error ? 'ui-input--error' : '',
        className
    ]
        .filter(Boolean)
        .join(' ');

    return <input ref={ref} className={classes} {...props} />;
});
