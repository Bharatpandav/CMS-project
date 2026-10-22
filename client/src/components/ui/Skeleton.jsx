export function Skeleton({ className = '', variant = 'text' }) {
    return (
        <div
            className={`ui-skeleton ui-skeleton--${variant} ${className}`.trim()}
            aria-hidden="true"
        />
    );
}
