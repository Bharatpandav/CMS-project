/**
 * Verifies dev test account passwords and optional HTTP login.
 * Does not print secrets or password hashes.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import userModel from '../models/userModel.js';
import { parseMongoTarget } from './lib/databaseSafety.js';

dotenv.config();

const DEV_PASSWORD = 'LocalTest@2026';

const devAccounts = [
    { role: 'Student A', id: 'dev.student.a@cms-dev.test', urn: 'DEV-CSE-A001' },
    { role: 'Student B', id: 'dev.student.b@cms-dev.test', urn: 'DEV-CSE-A002' },
    { role: 'Student C', id: 'dev.student.c@cms-dev.test', urn: 'DEV-ECE-A001' },
    {
        role: 'Student (first login)',
        id: 'dev.student.firstlogin@cms-dev.test',
        urn: 'DEV-CSE-FLOGIN'
    },
    { role: 'Advisor', id: 'dev.advisor.cse@cms-dev.test', email: true },
    { role: 'HOD CSE', id: 'dev.hod.cse@cms-dev.test', email: true },
    { role: 'HOD ECE', id: 'dev.hod.ece@cms-dev.test', email: true },
    { role: 'Dean', id: 'dev.dean@cms-dev.test', email: true },
    { role: 'VC (super_admin)', id: 'dev.vc@cms-dev.test', email: true },
    { role: 'Management (Dean)', id: 'dev.mgmt@cms-dev.test', email: true },
    { role: 'Management (HOD)', id: 'dev.mgmt.hod@cms-dev.test', email: true }
];

const legacyAccounts = [
    { role: 'Legacy Student', id: 'student@sbssu.ac.in', password: 'Student@123' },
    { role: 'Legacy Advisor', id: 'advisor@sbssu.ac.in', password: 'Advisor@123' },
    { role: 'Legacy HOD', id: 'hod@sbssu.ac.in', password: 'Hod@123' },
    { role: 'Legacy Dean', id: 'dean@sbssu.ac.in', password: 'Dean@123' },
    { role: 'Legacy VC', id: 'vc@sbssu.ac.in', password: 'Vc@123' }
];

async function verifyBcrypt(identifier, expectedPassword, byEmail) {
    const user = byEmail
        ? await userModel.findOne({ email: identifier.toLowerCase() })
        : await userModel.findOne({ rollNumber: identifier });

    if (!user) {
        return { status: 'MISSING' };
    }

    const ok = await bcryptjs.compare(expectedPassword, user.password);
    return {
        status: ok ? 'OK' : 'BAD_PASSWORD',
        isFirstLogin: user.isFirstLogin,
        isActive: user.isActive,
        role: user.role
    };
}

async function verifyHttp(identifier, password) {
    const port = process.env.PORT || 5000;
    const base = process.env.VERIFY_API_BASE || `http://127.0.0.1:${port}`;

    try {
        const res = await fetch(`${base}/api/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return { status: 'HTTP_FAIL', message: data.message || res.status };
        }
        return { status: 'HTTP_OK', role: data.user?.role };
    } catch {
        return { status: 'HTTP_SKIP', message: 'API not reachable' };
    }
}

async function main() {
    const parsed = parseMongoTarget(process.env.MONGO_URI);
    if (parsed.ok) {
        console.log(
            `Connected target: host=${parsed.host} database=${parsed.dbName}`
        );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log('--- Dev @cms-dev.test accounts (password LocalTest@2026) ---');
    for (const acct of devAccounts) {
        const byEmail = acct.email || acct.id.includes('@');
        const lookup = byEmail ? acct.id : acct.urn;
        const result = await verifyBcrypt(lookup, DEV_PASSWORD, byEmail);
        let http = { status: 'HTTP_SKIP' };
        if (result.status === 'OK') {
            http = await verifyHttp(
                byEmail ? acct.id : acct.urn,
                DEV_PASSWORD
            );
        }
        console.log(
            `${acct.role}: db=${result.status} role=${result.role || '-'} firstLogin=${result.isFirstLogin} http=${http.status}`
        );
    }

    console.log('\n--- Legacy sample accounts (from seedUsers.js) ---');
    for (const acct of legacyAccounts) {
        const result = await verifyBcrypt(acct.id, acct.password, true);
        console.log(
            `${acct.role}: db=${result.status} firstLogin=${result.isFirstLogin}`
        );
    }
}

main()
    .catch((err) => {
        console.error(err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
