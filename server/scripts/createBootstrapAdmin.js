import 'dotenv/config';
import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import userModel from '../models/userModel.js';
import {
    buildInitialUserPassword,
    parseDateOfBirthInput
} from '../utils/devCredentialPatterns.js';

const VALID_ROLES = ['super_admin', 'dean', 'hod', 'advisor'];

function readProfileFromEnv() {
    return {
        name: (process.env.ADMIN_NAME || '').trim(),
        email: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
        phone: (process.env.ADMIN_PHONE || '').trim(),
        rollNumber: (process.env.ADMIN_ROLL_NUMBER || '').trim(),
        dobRaw: (process.env.ADMIN_DOB || '').trim(),
        role: (process.env.ADMIN_ROLE || 'super_admin').trim(),
        department: (process.env.ADMIN_DEPARTMENT || '').trim(),
        programme: (process.env.ADMIN_PROGRAMME || '').trim()
    };
}

async function main() {
    if (process.env.CMS_CONFIRM_BOOTSTRAP !== '1') {
        console.error('Set CMS_CONFIRM_BOOTSTRAP=1 to run.');
        process.exit(1);
    }

    const p = readProfileFromEnv();

    if (!p.email || !p.name || !p.dobRaw) {
        console.error('Required: ADMIN_EMAIL, ADMIN_NAME, ADMIN_DOB (YYYY-MM-DD)');
        process.exit(1);
    }
    if (!VALID_ROLES.includes(p.role)) {
        console.error(`ADMIN_ROLE must be one of: ${VALID_ROLES.join(', ')}`);
        process.exit(1);
    }

    const uri = process.env.MONGO_URI?.trim();
    if (!uri) {
        console.error('MONGO_URI required in server/.env');
        process.exit(1);
    }

    const dateOfBirth = parseDateOfBirthInput(p.dobRaw);
    if (!dateOfBirth) {
        console.error('Invalid ADMIN_DOB — use YYYY-MM-DD');
        process.exit(1);
    }

    const temporaryPassword = buildInitialUserPassword({
        role: p.role,
        name: p.name,
        dateOfBirth
    });

    const profileFields = {
        name: p.name,
        email: p.email,
        role: p.role,
        dateOfBirth,
        phone: p.phone || undefined,
        rollNumber: p.rollNumber || undefined,
        department: p.department || undefined,
        programme: p.programme || undefined,
        isActive: true
    };

    await mongoose.connect(uri);

    const existing = await userModel.findOne({ email: p.email });

    if (existing) {
        if (process.env.CMS_BOOTSTRAP_UPDATE === '1') {
            Object.assign(existing, profileFields);
            if (process.env.ADMIN_RESET_PASSWORD === '1') {
                existing.password = await bcryptjs.hash(temporaryPassword, 10);
                existing.isFirstLogin = true;
            }
            await existing.save();
            console.log('Updated existing profile:', p.email);
        } else {
            console.error(
                `Already exists: ${p.email}. Set CMS_BOOTSTRAP_UPDATE=1 to refresh profile fields.`
            );
            await mongoose.disconnect();
            process.exit(1);
        }
    } else {
        await userModel.create({
            ...profileFields,
            password: await bcryptjs.hash(temporaryPassword, 10),
            isFirstLogin: true
        });
        console.log('Saved new account to MongoDB.');
    }

    console.log('\n--- Profile (pre-filled) ---');
    console.log('  Full name:    ', p.name);
    console.log('  Email:        ', p.email);
    console.log('  Employee ID:  ', p.rollNumber || '(none)');
    console.log('  Phone:        ', p.phone || '(none)');
    console.log('  Date of birth:', p.dobRaw);
    console.log('  Department:   ', p.department || '(none)');
    console.log('  Role:         ', p.role);
    console.log('  Password:     ', temporaryPassword);
    console.log('\nUse on deployed site: Administrator or Management login.');

    await mongoose.disconnect();
}

main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
});