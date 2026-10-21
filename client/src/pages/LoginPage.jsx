import { Navigate } from 'react-router-dom';

/** Legacy route — opens the homepage login modal. */
export function LoginPage() {
    return <Navigate to="/?login=1" replace />;
}
