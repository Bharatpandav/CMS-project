/**
 * Default temporary VC profile — all fields shown on My Profile (staff/VC).
 * Override any field with ADMIN_* env vars when running bootstrap.
 */
export const DEFAULT_VC_PROFILE = {
    name: 'Vandana Kumar',
    email: 'vc.temp@sbssu.in',
    phone: '+91 98765 43210',
    rollNumber: 'VC-EMP-001',
    dateOfBirth: '1975-06-15',
    role: 'super_admin',
    department: 'University Administration',
    programme: ''
};

export function resolveVcBootstrapFromEnv() {
    return {
        name: process.env.ADMIN_NAME?.trim() || DEFAULT_VC_PROFILE.name,
        email: (
            process.env.ADMIN_EMAIL || DEFAULT_VC_PROFILE.email
        ).trim().toLowerCase(),
        phone: process.env.ADMIN_PHONE?.trim() || DEFAULT_VC_PROFILE.phone,
        rollNumber:
            process.env.ADMIN_ROLL_NUMBER?.trim() ||
            DEFAULT_VC_PROFILE.rollNumber,
        dateOfBirth:
            process.env.ADMIN_DOB?.trim() || DEFAULT_VC_PROFILE.dateOfBirth,
        role: process.env.ADMIN_ROLE?.trim() || DEFAULT_VC_PROFILE.role,
        department:
            process.env.ADMIN_DEPARTMENT?.trim() ||
            DEFAULT_VC_PROFILE.department,
        programme:
            process.env.ADMIN_PROGRAMME?.trim() || DEFAULT_VC_PROFILE.programme
    };
}