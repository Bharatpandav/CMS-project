import { useNavigate, useLocation } from 'react-router-dom';
import { isSafeInternalPath } from '../utils/navigationPaths.js';

/**
 * Prefer explicit return path from router state, then history.back(), then fallback.
 */
export function BackButton({
    fallbackTo,
    label = 'Back',
    className = 'ui-back-btn'
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleClick = () => {
        const from = location.state?.from;
        if (typeof from === 'string' && isSafeInternalPath(from)) {
            navigate(from, { replace: false });
            return;
        }

        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate(fallbackTo || '/');
    };

    return (
        <button type="button" className={className} onClick={handleClick}>
            ← {label}
        </button>
    );
}
