export function getApiErrorMessage(error, fallback = 'Something went wrong.') {
    if (!error) return fallback;

    const status = error.status;
    if (status === 401) {
        return 'Your session has expired. Please sign in again.';
    }
    if (status === 403) {
        return (
            error.message ||
            'You are not allowed to access this resource.'
        );
    }
    if (status === 404) {
        return error.message || 'The requested record was not found.';
    }
    if (status >= 500) {
        return 'The server encountered an error. Please try again in a moment.';
    }
    if (
        error.code === 'NETWORK_ERROR' ||
        /failed to fetch|networkerror|load failed/i.test(
            String(error.message || '')
        )
    ) {
        return 'Unable to reach the server. Check your connection and ensure the API is running.';
    }
    return (error.message || '').trim() || fallback;
}