/**
 * Temporary VC with full profile pre-filled for My Profile page.
 *   CMS_CONFIRM_BOOTSTRAP=1 npm run bootstrap:vc
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    DEFAULT_VC_PROFILE,
    resolveVcBootstrapFromEnv
} from './bootstrapVcDefaults.js';
import { buildInitialUserPassword } from '../utils/devCredentialPatterns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const profile =
    process.env.CMS_CONFIRM_BOOTSTRAP === '1'
        ? resolveVcBootstrapFromEnv()
        : DEFAULT_VC_PROFILE;

const passwordPreview = buildInitialUserPassword({
    role: profile.role,
    name: profile.name,
    dateOfBirth: profile.dateOfBirth
});

if (process.env.CMS_CONFIRM_BOOTSTRAP !== '1') {
    console.log('Temporary VC bootstrap — full profile (dry run)\n');
    console.log('Login: vc.temp@sbssu.in on Administrator or Management\n');
    console.log('--- Pre-filled profile ---');
    console.log('  Full name:     ', profile.name);
    console.log('  Email:         ', profile.email);
    console.log('  Employee ID:   ', profile.rollNumber);
    console.log('  Phone:         ', profile.phone);
    console.log('  Date of birth: ', profile.dateOfBirth);
    console.log('  Department:    ', profile.department);
    console.log('  Role:          ', profile.role, '(Vice Chancellor)');
    console.log('  Password:      ', passwordPreview, '\n');
    console.log('Save once to Atlas (MONGO_URI = same as Render):');
    console.log('  CMS_CONFIRM_BOOTSTRAP=1 npm run bootstrap:vc');
    console.log('\nUpdate profile if account already exists:');
    console.log('  CMS_CONFIRM_BOOTSTRAP=1 CMS_BOOTSTRAP_UPDATE=1 npm run bootstrap:vc');
    process.exit(0);
}

const env = {
    ...process.env,
    CMS_CONFIRM_BOOTSTRAP: '1',
    ADMIN_NAME: profile.name,
    ADMIN_EMAIL: profile.email,
    ADMIN_PHONE: profile.phone,
    ADMIN_ROLL_NUMBER: profile.rollNumber,
    ADMIN_DOB: profile.dateOfBirth,
    ADMIN_ROLE: profile.role,
    ADMIN_DEPARTMENT: profile.department,
    ADMIN_PROGRAMME: profile.programme
};

const child = spawn(
    process.execPath,
    [path.join(__dirname, 'createBootstrapAdmin.js')],
    { stdio: 'inherit', env }
);

child.on('exit', (code) => process.exit(code ?? 1));