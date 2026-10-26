export function validateEmail(value) {
    const email = String(value || '').trim();
    if (!email) {
        return { ok: false, message: 'Email is required' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, message: 'Enter a valid email address' };
    }
    return { ok: true, email: email.toLowerCase() };
}
