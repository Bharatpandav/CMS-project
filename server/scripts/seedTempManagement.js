/**
 * Temporary Management-only account (Dean role) — user registration portal only.
 * Does not replace VC; use with seedTempVc.js for a clean split.
 *
 *   CMS_CONFIRM_BOOTSTRAP=1 npm run bootstrap:management
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaults = {
    ADMIN_NAME: process.env.ADMIN_NAME || 'CMS Management',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'cms.management@sbssu.in',
    ADMIN_DOB: process.env.ADMIN_DOB || '1990-01-15',
    ADMIN_ROLE: 'dean'
};

if (process.env.CMS_CONFIRM_BOOTSTRAP !== '1') {
    console.log('Temporary Management Login only (dry run)\n');
    console.log('Database role: dean — NOT VC\n');
    console.log('  Email:     ', defaults.ADMIN_EMAIL);
    console.log('  Password:  ', 'CMS1990', '\n');
    console.log('Use homepage → Management Login only.');
    console.log('Registers: Students, Advisors, HOD (not Dean/VC).\n');
    console.log('For VC that registers everyone, use: npm run bootstrap:vc\n');
    console.log('  CMS_CONFIRM_BOOTSTRAP=1 npm run bootstrap:management');
    process.exit(0);
}

const child = spawn(
    process.execPath,
    [path.join(__dirname, 'createBootstrapAdmin.js')],
    {
        stdio: 'inherit',
        env: { ...process.env, CMS_CONFIRM_BOOTSTRAP: '1', ...defaults }
    }
);

child.on('exit', (code) => process.exit(code ?? 1));