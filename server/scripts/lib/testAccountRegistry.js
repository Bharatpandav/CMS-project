/** Domains and emails that may be removed by fresh test reset only. */

export const FRESH_TEST_EMAIL_DOMAIN = '@cms-fresh.test';
export const LEGACY_DEV_EMAIL_DOMAIN = '@cms-dev.test';

/** Exact emails from seedUsers.js and known ad-hoc test imports. */
export const LEGACY_TEST_EMAILS = [
    'student@sbssu.ac.in',
    'advisor@sbssu.ac.in',
    'hod@sbssu.ac.in',
    'dean@sbssu.ac.in',
    'vc@sbssu.ac.in',
    'teststudent@sbssu.ac.in',
    'teststudent2@sbssu.ac.in',
    'bulkstudent1@sbssu.ac.in',
    'bulkstudent2@sbssu.ac.in',
    'bulkadvisor@sbssu.ac.in',
    'credentialstudent1@sbssu.ac.in',
    'credentialstudent2@sbssu.ac.in',
    'credentialadvisor@sbssu.ac.in',
    'downloaddteststudent@sbssu.ac.in',
    'downloadtestadvisor@sbssu.ac.in',
    'duplicatestudent@sbssu.ac.in'
];

export const COMPLAINT_TITLE_PREFIXES = ['[DEV-TEST]', '[CMS-FRESH-TEST]'];

export function isRemovableTestEmail(email) {
    if (!email) return false;
    const lower = email.toLowerCase();
    if (lower.endsWith(LEGACY_DEV_EMAIL_DOMAIN)) return true;
    if (lower.endsWith(FRESH_TEST_EMAIL_DOMAIN)) return true;
    return LEGACY_TEST_EMAILS.includes(lower);
}
