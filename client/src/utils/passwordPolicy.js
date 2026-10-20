const COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export function validateNewPassword(password) {
    if (!password || password.length < 8) {
        return 'New password must be at least 8 characters long';
    }
    if (!COMPLEXITY_REGEX.test(password)) {
        return 'New password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    return null;
}
