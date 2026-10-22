import { AppIcon } from './AppIcon.jsx';

const RULES = [
    {
        id: 'length',
        label: 'At least 8 characters',
        test: (p) => p.length >= 8
    },
    {
        id: 'upper',
        label: 'One uppercase letter',
        test: (p) => /[A-Z]/.test(p)
    },
    {
        id: 'lower',
        label: 'One lowercase letter',
        test: (p) => /[a-z]/.test(p)
    },
    {
        id: 'number',
        label: 'One number',
        test: (p) => /\d/.test(p)
    }
];

export function PasswordRequirementsChecklist({ password = '' }) {
    return (
        <ul className="password-checklist" aria-label="Password requirements">
            {RULES.map((rule) => {
                const met = password.length > 0 && rule.test(password);
                return (
                    <li
                        key={rule.id}
                        className={
                            met
                                ? 'password-checklist__item password-checklist__item--met'
                                : 'password-checklist__item'
                        }
                    >
                        <span className="password-checklist__mark" aria-hidden="true">
                            <AppIcon
                                name={met ? 'check' : 'circle'}
                                size="sm"
                            />
                        </span>
                        {rule.label}
                    </li>
                );
            })}
        </ul>
    );
}
