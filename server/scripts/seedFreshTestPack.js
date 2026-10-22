/**
 * Reset documented test accounts and seed a fresh @cms-fresh.test pack.
 *
 *   cd server
 *   CMS_ALLOW_REMOTE_SEED=1 CMS_CONFIRM_TEST_RESET=1 npm run seed:fresh
 *
 * Credentials written to server/.local/test-credentials.md (git-ignored).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import userModel from '../models/userModel.js';
import Complaint from '../models/complaintModel.js';
import ComplaintLog from '../models/complaintLogs.js';
import ComplaintInvitation from '../models/complaintInvitationModel.js';
import { ensureDefaultCategories } from '../utils/categoryHelper.js';
import Category from '../models/categoryModel.js';
import { DURATIONS, addTime } from '../utils/deadlineHelper.js';
import { assertSafeToSeed } from './lib/databaseSafety.js';
import {
    COMPLAINT_TITLE_PREFIXES,
    FRESH_TEST_EMAIL_DOMAIN,
    isRemovableTestEmail
} from './lib/testAccountRegistry.js';
import {
    buildStaffDevPassword,
    buildStudentDevPassword,
    extractFirstName
} from '../utils/devCredentialPatterns.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, '..', '.local', 'test-credentials.md');
const COMPLAINT_TAG = '[CMS-FRESH-TEST]';

const DEPT_CSE = 'Computer Science and Engineering';
const DEPT_ECE = 'Electronics and Communication Engineering';

const FRESH_USERS = [
    {
        key: 'studentA',
        name: 'Rahul Sharma',
        email: `rahul.sharma${FRESH_TEST_EMAIL_DOMAIN}`,
        rollNumber: '23303040',
        role: 'student',
        department: DEPT_CSE,
        programme: 'B.Tech Computer Science and Engineering',
        semester: 5,
        section: 'A',
        dateOfBirth: '2004-07-14',
        assignedAdvisor: 'Neha Kapoor'
    },
    {
        key: 'studentB',
        name: 'Priya Nair',
        email: `priya.nair${FRESH_TEST_EMAIL_DOMAIN}`,
        rollNumber: '23303041',
        role: 'student',
        department: DEPT_CSE,
        programme: 'B.Tech Computer Science and Engineering',
        semester: 5,
        section: 'B',
        dateOfBirth: '2004-11-02',
        assignedAdvisor: 'Neha Kapoor'
    },
    {
        key: 'studentC',
        name: 'Karan Mehta',
        email: `karan.mehta${FRESH_TEST_EMAIL_DOMAIN}`,
        rollNumber: '24404050',
        role: 'student',
        department: DEPT_ECE,
        programme: 'B.Tech Electronics and Communication Engineering',
        semester: 3,
        section: 'A',
        dateOfBirth: '2005-01-19',
        assignedAdvisor: 'Neha Kapoor'
    },
    {
        key: 'advisor',
        name: 'Neha Kapoor',
        email: `neha.advisor${FRESH_TEST_EMAIL_DOMAIN}`,
        role: 'advisor',
        department: DEPT_CSE,
        dateOfBirth: '1990-06-15'
    },
    {
        key: 'hodCse',
        name: 'Amit Verma',
        email: `amit.hod${FRESH_TEST_EMAIL_DOMAIN}`,
        role: 'hod',
        department: DEPT_CSE,
        dateOfBirth: '1985-04-12'
    },
    {
        key: 'hodEce',
        name: 'Rajesh Pillai',
        email: `rajesh.hod${FRESH_TEST_EMAIL_DOMAIN}`,
        role: 'hod',
        department: DEPT_ECE,
        dateOfBirth: '1983-08-22'
    },
    {
        key: 'dean',
        name: 'Suresh Menon',
        email: `suresh.dean${FRESH_TEST_EMAIL_DOMAIN}`,
        role: 'dean',
        dateOfBirth: '1978-01-20'
    },
    {
        key: 'vc',
        name: 'Vikram Rao',
        email: `vikram.vc${FRESH_TEST_EMAIL_DOMAIN}`,
        role: 'super_admin',
        dateOfBirth: '1975-11-08'
    },
    {
        key: 'superAdmin',
        name: 'Anita Desai',
        email: `anita.admin${FRESH_TEST_EMAIL_DOMAIN}`,
        role: 'super_admin',
        dateOfBirth: '1976-05-30'
    },
    {
        key: 'mgmt',
        name: 'Meera Iyer',
        email: `meera.mgmt${FRESH_TEST_EMAIL_DOMAIN}`,
        role: 'dean',
        dateOfBirth: '1982-03-25'
    }
];

function plainPasswordFor(definition) {
    if (definition.role === 'student') {
        return buildStudentDevPassword(
            definition.name,
            definition.rollNumber
        );
    }
    return buildStaffDevPassword(
        definition.name,
        definition.dateOfBirth
    );
}

function loginIdentifierFor(definition) {
    return definition.role === 'student'
        ? definition.rollNumber
        : definition.email;
}

function expectedDashboard(definition) {
    const map = {
        student: '/student/dashboard (then /change-password on first login)',
        advisor: '/advisor/dashboard',
        hod: '/hod/dashboard',
        dean: '/dean/dashboard',
        super_admin: '/vc/dashboard'
    };
    if (definition.key === 'mgmt') {
        return '/management/dashboard (Management Login on homepage)';
    }
    if (definition.key === 'superAdmin') {
        return '/vc/dashboard and legacy /dashboard (super_admin)';
    }
    return map[definition.role] || '/portal';
}

async function removeTestUsers() {
    const candidates = await userModel.find({}).select('email').lean();
    const toRemove = candidates.filter((u) =>
        isRemovableTestEmail(u.email)
    );

    if (!toRemove.length) {
        return { removedUsers: 0, removedComplaints: 0 };
    }

    const ids = toRemove.map((u) => u._id);

    const titleOr = COMPLAINT_TITLE_PREFIXES.map((p) => ({
        title: {
            $regex: `^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
        }
    }));

    const complaintFilter = {
        $or: [
            { raisedBy: { $in: ids } },
            ...titleOr
        ]
    };

    const complaintIds = await Complaint.find(complaintFilter)
        .select('_id')
        .lean();
    const cIds = complaintIds.map((c) => c._id);

    if (cIds.length) {
        await ComplaintInvitation.deleteMany({
            complaint: { $in: cIds }
        });
        await ComplaintLog.deleteMany({ complaint: { $in: cIds } });
        await Complaint.deleteMany({ _id: { $in: cIds } });
    }

    const deleteResult = await userModel.deleteMany({ _id: { $in: ids } });

    return {
        removedUsers: deleteResult.deletedCount || 0,
        removedComplaints: cIds.length
    };
}

async function upsertFreshUser(definition) {
    const email = definition.email.toLowerCase();
    const plain = plainPasswordFor(definition);
    const hash = await bcryptjs.hash(plain, 10);

    const doc = {
        name: definition.name.trim(),
        email,
        password: hash,
        role: definition.role,
        department: definition.department?.trim() || undefined,
        rollNumber: definition.rollNumber?.trim() || undefined,
        semester: definition.semester ?? undefined,
        section: definition.section?.trim() || undefined,
        programme: definition.programme?.trim() || '',
        dateOfBirth: definition.dateOfBirth
            ? new Date(definition.dateOfBirth)
            : null,
        assignedAdvisor: definition.assignedAdvisor?.trim() || '',
        isFirstLogin: true,
        isActive: true
    };

    const user = await userModel.findOneAndUpdate(
        { email },
        doc,
        { upsert: true, returnDocument: 'after' }
    );

    return {
        user,
        plainPassword: plain,
        loginIdentifier: loginIdentifierFor(definition)
    };
}

function studentProfile(student) {
    return {
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber || '',
        department: student.department || '',
        semester: student.semester ?? null,
        section: student.section || '',
        programme: student.programme || '',
        batch: '',
        advisor: student.assignedAdvisor || ''
    };
}

async function seedComplaints(usersByKey, categoryAcademic) {
    await Complaint.deleteMany({
        title: { $regex: '^\\[CMS-FRESH-TEST\\]' }
    });

    const studentA = usersByKey.studentA.user;
    const studentB = usersByKey.studentB.user;
    const studentC = usersByKey.studentC.user;
    const advisor = usersByKey.advisor.user;
    const hodCse = usersByKey.hodCse.user;
    const hodEce = usersByKey.hodEce.user;
    const dean = usersByKey.dean.user;
    const vc = usersByKey.vc.user;

    const base = {
        category: categoryAcademic.name,
        categoryId: categoryAcademic._id,
        undertaking: true,
        Date: new Date(),
        deadline: addTime(DURATIONS.OVERALL),
        images: [],
        attachments: []
    };

    const scenarios = [
        {
            raisedBy: studentA,
            title: `${COMPLAINT_TAG} Submitted — awaiting HOD`,
            department: DEPT_CSE,
            status: 'submitted',
            currentLevel: 'hod',
            currentAssignee: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.HOD)
        },
        {
            raisedBy: studentA,
            title: `${COMPLAINT_TAG} Assigned to advisor`,
            department: DEPT_CSE,
            status: 'assigned',
            currentLevel: 'advisor',
            currentAssignee: advisor._id,
            assignedBy: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.ADVISOR)
        },
        {
            raisedBy: studentA,
            title: `${COMPLAINT_TAG} Group — invite to Priya`,
            complaintType: 'group',
            visibility: 'public',
            isGroupComplaint: true,
            department: DEPT_CSE,
            status: 'submitted',
            currentLevel: 'hod',
            currentAssignee: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.HOD),
            invitations: [
                {
                    student: usersByKey.studentB.user,
                    invitedBy: studentA,
                    status: 'pending'
                }
            ]
        },
        {
            raisedBy: studentC,
            title: `${COMPLAINT_TAG} Private solo (ECE)`,
            complaintType: 'solo',
            visibility: 'private',
            department: DEPT_ECE,
            status: 'submitted',
            currentLevel: 'hod',
            currentAssignee: hodEce._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.HOD)
        },
        {
            raisedBy: studentB,
            title: `${COMPLAINT_TAG} Escalated to VC`,
            department: DEPT_CSE,
            status: 'escalated',
            currentLevel: 'vc',
            currentAssignee: vc._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.DEAN)
        }
    ];

    for (const scenario of scenarios) {
        const {
            invitations = [],
            invite,
            complaintType = 'solo',
            visibility = 'public',
            isGroupComplaint = false,
            raisedBy,
            ...rest
        } = scenario;

        const complaint = await Complaint.create({
            raisedBy: raisedBy._id,
            raisedByName: raisedBy.name,
            studentProfile: studentProfile(raisedBy),
            description: 'Fresh test pack complaint — safe to delete on re-seed.',
            complaintType,
            visibility,
            isGroupComplaint,
            participants: [
                {
                    student: raisedBy._id,
                    name: raisedBy.name,
                    rollNumber: raisedBy.rollNumber || '',
                    joinedAt: new Date()
                }
            ],
            participantCount: 1,
            groupMembers: [raisedBy._id],
            priority: 'medium',
            location: 'Main Campus',
            ...base,
            ...rest
        });

        await ComplaintLog.create({
            complaint: complaint._id,
            actor: raisedBy._id,
            actorRole: raisedBy.role,
            newStatus: rest.status,
            newAssignee: rest.currentAssignee,
            level: rest.currentLevel,
            action: 'submitted',
            remarks: 'Fresh test seed'
        });

        for (const inv of invitations) {
            await ComplaintInvitation.create({
                complaint: complaint._id,
                student: inv.student._id,
                studentName: inv.student.name,
                studentRollNumber: inv.student.rollNumber,
                invitedBy: inv.invitedBy._id,
                status: inv.status
            });
        }
    }
}

async function verifyLogin(identifier, password) {
    const port = process.env.PORT || 5000;
    const base = process.env.VERIFY_API_BASE || `http://127.0.0.1:${port}`;
    try {
        const res = await fetch(`${base}/api/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });
        const data = await res.json().catch(() => ({}));
        return res.ok
            ? { ok: true, role: data.user?.role }
            : { ok: false, message: data.message };
    } catch (err) {
        return { ok: false, message: err.message || 'API unreachable' };
    }
}

function writeCredentialSheet(rows, meta) {
    fs.mkdirSync(path.dirname(CREDENTIALS_PATH), { recursive: true });

    const lines = [
        '# CMS local test credentials (DO NOT COMMIT)',
        '',
        `Generated: ${new Date().toISOString()}`,
        `Database host: ${meta.host} | db: ${meta.dbName}`,
        '',
        '**First login:** all accounts have `isFirstLogin: true` — expect `/change-password` after login.',
        '',
        '| Role | Full name | Login | Initial password | Department | Dashboard | Login verified |',
        '|------|-----------|-------|------------------|------------|-------------|----------------|',
        ...rows.map(
            (r) =>
                `| ${r.roleLabel} | ${r.name} | ${r.login} | ${r.password} | ${r.department || '—'} | ${r.dashboard} | ${r.verified} |`
        ),
        '',
        '## Entry points',
        '',
        '- **Students:** Homepage → Login (URN + password)',
        '- **Staff:** Homepage → Login as Admin → Administrator Login',
        '- **Management:** Homepage → Login as Admin → Management Login (`meera.mgmt@cms-fresh.test`)',
        '',
        '## Refresh command',
        '',
        '```bash',
        'cd server',
        'CMS_ALLOW_REMOTE_SEED=1 CMS_CONFIRM_TEST_RESET=1 npm run seed:fresh',
        '```',
        ''
    ];

    fs.writeFileSync(CREDENTIALS_PATH, lines.join('\n'), 'utf8');
}

async function main() {
    if (process.env.CMS_CONFIRM_TEST_RESET !== '1') {
        throw new Error(
            'Set CMS_CONFIRM_TEST_RESET=1 to remove documented test accounts.'
        );
    }

    const target = assertSafeToSeed(process.env.MONGO_URI);
    console.log(
        `Target: host=${target.host} database=${target.dbName}`
    );

    await mongoose.connect(process.env.MONGO_URI);

    const removal = await removeTestUsers();
    console.log(
        `Removed ${removal.removedUsers} test users, ${removal.removedComplaints} linked/tagged complaints.`
    );

    await ensureDefaultCategories();
    const categoryAcademic = await Category.findOne({
        name: 'Academic Affairs',
        isActive: true
    });

    const usersByKey = {};
    const credentialRows = [];

    for (const def of FRESH_USERS) {
        const result = await upsertFreshUser(def);
        usersByKey[def.key] = result;
        console.log(`Upserted: ${def.email} (${def.role})`);

        const roleLabels = {
            studentA: 'Student A',
            studentB: 'Student B',
            studentC: 'Student C',
            advisor: 'Advisor',
            hodCse: 'HOD (CSE)',
            hodEce: 'HOD (ECE)',
            dean: 'Dean',
            vc: 'VC (super_admin)',
            superAdmin: 'Super Admin',
            mgmt: 'Management (Dean)'
        };

        credentialRows.push({
            roleLabel: roleLabels[def.key] || def.role,
            name: def.name,
            login: result.loginIdentifier,
            password: result.plainPassword,
            department: def.department || '',
            dashboard: expectedDashboard(def),
            verified: 'pending'
        });
    }

    await seedComplaints(usersByKey, categoryAcademic);
    console.log('Seeded fresh test complaints.');

    for (const row of credentialRows) {
        const v = await verifyLogin(row.login, row.password);
        row.verified = v.ok ? `yes (${v.role})` : `no — ${v.message}`;
    }

    writeCredentialSheet(credentialRows, target);

    const failed = credentialRows.filter((r) => !r.verified.startsWith('yes'));
    console.log(`\nCredential sheet: ${CREDENTIALS_PATH}`);
    console.log(
        `Accounts: ${credentialRows.length} upserted, ${failed.length} login failures.`
    );
    if (failed.length) {
        console.log(
            'Start the API (`npm run dev`) and re-run verify, or check failures above.'
        );
    }
}

main()
    .catch((err) => {
        console.error('seed:fresh failed:', err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
