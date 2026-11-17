/** E.164-style: + followed by 8–15 digits */
const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(value) {
    if (value === null || value === undefined) return '';
    let s = String(value).trim();
    if (!s) return '';
    s = s.replace(/[\s()-]/g, '');
    if (/^\d{10,15}$/.test(s)) {
        if (s.length === 10) {
            return `+91${s}`;
        }
        if (s.length === 12 && s.startsWith('91')) {
            return `+${s}`;
        }
    }
    return s;
}

export function validatePhone(value, { required = false } = {}) {
    const phone = normalizePhone(value);
    if (!phone) {
        if (required) {
            return { ok: false, message: 'Phone number is required' };
        }
        return { ok: true, phone: '' };
    }
    if (!PHONE_E164_REGEX.test(phone)) {
        return {
            ok: false,
            message:
                'Phone must be in international format, e.g. +919876543210'
        };
    }
    return { ok: true, phone };
}
