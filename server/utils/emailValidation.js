import validator from 'validator';

export function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

export function validateEmailAddress(value) {
    const email = normalizeEmail(value);
    if (!email) {
        return { ok: false, message: 'Email is required' };
    }
    if (!validator.isEmail(email)) {
        return { ok: false, message: 'Enter a valid email address' };
    }
    return { ok: true, email };
}
