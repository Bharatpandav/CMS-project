import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordField({
    id,
    label,
    value,
    onChange,
    autoComplete,
    disabled,
    error,
    placeholder,
    required = true
}) {
    const [visible, setVisible] = useState(false);

    const shellClass = [
        'password-field',
        'ui-input-shell',
        error ? 'ui-input-shell--error' : ''
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <label className="ui-label password-label" htmlFor={id}>
            {label}
            <span className={shellClass}>
                <input
                    id={id}
                    className="password-field__input"
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    disabled={disabled}
                    placeholder={placeholder}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${id}-error` : undefined}
                    required={required}
                />
                <button
                    type="button"
                    className="password-field__toggle"
                    data-no-reflect
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    disabled={disabled}
                >
                    {visible ? (
                        <EyeOff size={18} strokeWidth={1.75} aria-hidden />
                    ) : (
                        <Eye size={18} strokeWidth={1.75} aria-hidden />
                    )}
                </button>
            </span>
            {error ? (
                <span id={`${id}-error`} className="ui-field-error" role="alert">
                    {error}
                </span>
            ) : null}
        </label>
    );
}
