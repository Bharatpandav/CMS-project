/**
 * Development-only seed: dedicated test users + workflow sample complaints.
 * Idempotent upserts for @cms-dev.test accounts only.
 * Does not delete or modify unrelated users.
 *
 * Usage:
 *   cd server
 *   CMS_ALLOW_REMOTE_SEED=1 npm run seed:dev   # if MONGO_URI is not localhost
 *   npm run seed:dev                           # when MONGO_URI points to localhost
 *
 * Optional:
 *   CMS_SYNC_LEGACY_SAMPLE=1  — reset passwords for legacy sample@sbssu.ac.in accounts
 */

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

dotenv.config();

/** Local-only password documented in docs/LOCAL_TESTING.md — never imported by app code */
const DEV_PASSWORD = 'LocalTest@2026';
const DEV_EMAIL_DOMAIN = '@cms-dev.test';
const COMPLAINT_TAG = '[DEV-TEST]';

const DEPT_CSE = 'Computer Science and Engineering';
const DEPT_ECE = 'Electronics and Communication Engineering';

const devUsers = [
    {
        key: 'studentA',
        name: 'Dev Student A',
        email: `dev.student.a${DEV_EMAIL_DOMAIN}`,
        rollNumber: 'DEV-CSE-A001',
        role: 'student',
        department: DEPT_CSE,
        semester: 5,
        section: 'A',
        isFirstLogin: false
    },
    {
        key: 'studentB',
        name: 'Dev Student B',
        email: `dev.student.b${DEV_EMAIL_DOMAIN}`,
        rollNumber: 'DEV-CSE-A002',
        role: 'student',
        department: DEPT_CSE,
        semester: 5,
        section: 'B',
        isFirstLogin: false
    },
    {
        key: 'studentC',
        name: 'Dev Student C',
        email: `dev.student.c${DEV_EMAIL_DOMAIN}`,
        rollNumber: 'DEV-ECE-A001',
        role: 'student',
        department: DEPT_ECE,
        semester: 3,
        section: 'A',
        isFirstLogin: false
    },
    {
        key: 'studentFirstLogin',
        name: 'Dev Student First Login',
        email: `dev.student.firstlogin${DEV_EMAIL_DOMAIN}`,
        rollNumber: 'DEV-CSE-FLOGIN',
        role: 'student',
        department: DEPT_CSE,
        semester: 1,
        section: 'A',
        isFirstLogin: true
    },
    {
        key: 'advisor',
        name: 'Dev Advisor CSE',
        email: `dev.advisor.cse${DEV_EMAIL_DOMAIN}`,
        role: 'advisor',
        department: DEPT_CSE,
        isFirstLogin: false
    },
    {
        key: 'hodCse',
        name: 'Dev HOD CSE',
        email: `dev.hod.cse${DEV_EMAIL_DOMAIN}`,
        role: 'hod',
        department: DEPT_CSE,
        isFirstLogin: false
    },
    {
        key: 'hodEce',
        name: 'Dev HOD ECE',
        email: `dev.hod.ece${DEV_EMAIL_DOMAIN}`,
        role: 'hod',
        department: DEPT_ECE,
        isFirstLogin: false
    },
    {
        key: 'dean',
        name: 'Dev Dean',
        email: `dev.dean${DEV_EMAIL_DOMAIN}`,
        role: 'dean',
        isFirstLogin: false
    },
    {
        key: 'vc',
        name: 'Dev Vice Chancellor',
        email: `dev.vc${DEV_EMAIL_DOMAIN}`,
        role: 'super_admin',
        isFirstLogin: false
    },
    {
        key: 'mgmt',
        name: 'Dev Management (Dean)',
        email: `dev.mgmt${DEV_EMAIL_DOMAIN}`,
        role: 'dean',
        isFirstLogin: false
    },
    {
        key: 'mgmtHod',
        name: 'Dev Management (HOD)',
        email: `dev.mgmt.hod${DEV_EMAIL_DOMAIN}`,
        role: 'hod',
        department: DEPT_CSE,
        isFirstLogin: false
    }
];

const legacySampleEmails = [
    'student@sbssu.ac.in',
    'advisor@sbssu.ac.in',
    'hod@sbssu.ac.in',
    'dean@sbssu.ac.in',
    'vc@sbssu.ac.in'
];

function studentProfile(student) {
    return {
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber || '',
        department: student.department || '',
        semester: student.semester ?? null,
        section: student.section || '',
        programme: '',
        batch: '',
        advisor: ''
    };
}

async function upsertDevUser(definition, passwordHash) {
    const { key, ...fields } = definition;
    const email = fields.email.toLowerCase();

    const doc = await userModel.findOneAndUpdate(
        { email },
        {
            ...fields,
            email,
            password: passwordHash,
            isActive: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { key, user: doc };
}

async function syncLegacySample(passwordHash) {
    if (process.env.CMS_SYNC_LEGACY_SAMPLE !== '1') {
        console.log(
            'Skipping legacy sample accounts (set CMS_SYNC_LEGACY_SAMPLE=1 to reset their passwords).'
        );
        return;
    }

    for (const email of legacySampleEmails) {
        const updated = await userModel.findOneAndUpdate(
            { email },
            {
                password: passwordHash,
                isFirstLogin: false,
                isActive: true
            },
            { new: true }
        );
        if (updated) {
            console.log(`Legacy sample updated: ${email}`);
        }
    }
}

async function removePriorDevComplaints() {
    const devComplaints = await Complaint.find({
        title: { $regex: '^\\[DEV-TEST\\]' }
    }).select('_id');

    const ids = devComplaints.map((c) => c._id);
    if (!ids.length) return;

    await ComplaintInvitation.deleteMany({ complaint: { $in: ids } });
    await ComplaintLog.deleteMany({ complaint: { $in: ids } });
    await Complaint.deleteMany({ _id: { $in: ids } });
    console.log(`Removed ${ids.length} prior dev-tagged complaints (re-seed).`);
}

async function seedComplaints(usersByKey, categoryAcademic) {
    const studentA = usersByKey.studentA;
    const studentB = usersByKey.studentB;
    const studentC = usersByKey.studentC;
    const advisor = usersByKey.advisor;
    const hodCse = usersByKey.hodCse;
    const hodEce = usersByKey.hodEce;
    const dean = usersByKey.dean;
    const vc = usersByKey.vc;

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
            tag: '01-submitted',
            raisedBy: studentA,
            department: DEPT_CSE,
            title: `${COMPLAINT_TAG} Newly submitted — awaiting HOD review`,
            status: 'submitted',
            currentLevel: 'hod',
            currentAssignee: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.HOD),
            logs: [
                {
                    actor: studentA,
                    action: 'submitted',
                    newStatus: 'submitted',
                    newAssignee: hodCse._id,
                    level: 'hod',
                    remarks: 'Submitted for HOD review'
                }
            ]
        },
        {
            tag: '02-accepted',
            raisedBy: studentA,
            department: DEPT_CSE,
            title: `${COMPLAINT_TAG} Accepted by HOD`,
            status: 'accepted',
            currentLevel: 'hod',
            currentAssignee: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.HOD),
            logs: [
                {
                    actor: studentA,
                    action: 'submitted',
                    newStatus: 'submitted',
                    level: 'hod'
                },
                {
                    actor: hodCse,
                    action: 'accepted',
                    previousStatus: 'submitted',
                    newStatus: 'accepted',
                    level: 'hod',
                    remarks: 'HOD accepted the complaint'
                }
            ]
        },
        {
            tag: '03-assigned-advisor',
            raisedBy: studentA,
            department: DEPT_CSE,
            title: `${COMPLAINT_TAG} Assigned to advisor`,
            status: 'assigned',
            currentLevel: 'advisor',
            currentAssignee: advisor._id,
            assignedBy: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.ADVISOR),
            logs: [
                {
                    actor: hodCse,
                    action: 'assigned',
                    newStatus: 'assigned',
                    newAssignee: advisor._id,
                    level: 'advisor',
                    remarks: 'Assigned to department advisor'
                }
            ]
        },
        {
            tag: '04-rejected',
            raisedBy: studentB,
            department: DEPT_CSE,
            title: `${COMPLAINT_TAG} Rejected with reason`,
            status: 'rejected',
            currentLevel: 'hod',
            currentAssignee: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.HOD),
            logs: [
                {
                    actor: hodCse,
                    action: 'rejected',
                    previousStatus: 'submitted',
                    newStatus: 'rejected',
                    level: 'hod',
                    remarks: 'Insufficient evidence for escalation'
                }
            ]
        },
        {
            tag: '05-resolved',
            raisedBy: studentA,
            department: DEPT_CSE,
            title: `${COMPLAINT_TAG} Resolved with note`,
            status: 'resolved',
            currentLevel: 'advisor',
            currentAssignee: advisor._id,
            assignedBy: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.ADVISOR),
            resolvedAt: new Date(),
            logs: [
                {
                    actor: advisor,
                    action: 'resolved',
                    previousStatus: 'assigned',
                    newStatus: 'resolved',
                    level: 'advisor',
                    remarks: 'Issue fixed in lab; student informed'
                }
            ]
        },
        {
            tag: '06-escalated-dean',
            raisedBy: studentB,
            department: DEPT_CSE,
            title: `${COMPLAINT_TAG} Escalated to Dean`,
            status: 'escalated',
            currentLevel: 'dean',
            currentAssignee: dean._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.DEAN),
            logs: [
                {
                    actor: hodCse,
                    action: 'escalated',
                    previousStatus: 'assigned',
                    newStatus: 'escalated',
                    newAssignee: dean._id,
                    level: 'dean',
                    remarks: 'Escalated from HOD to Dean'
                }
            ]
        },
        {
            tag: '07-escalated-vc',
            raisedBy: studentA,
            department: DEPT_CSE,
            title: `${COMPLAINT_TAG} Escalated to VC`,
            status: 'escalated',
            currentLevel: 'vc',
            currentAssignee: vc._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.DEAN),
            logs: [
                {
                    actor: dean,
                    action: 'escalated',
                    previousStatus: 'escalated',
                    newStatus: 'escalated',
                    newAssignee: vc._id,
                    level: 'vc',
                    remarks: 'Escalated from Dean to VC'
                }
            ]
        },
        {
            tag: '08-group-pending-invite',
            raisedBy: studentA,
            department: DEPT_CSE,
            title: `${COMPLAINT_TAG} Group — pending invitation`,
            complaintType: 'group',
            visibility: 'public',
            isGroupComplaint: true,
            status: 'submitted',
            currentLevel: 'hod',
            currentAssignee: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.HOD),
            participants: [
                {
                    student: studentA._id,
                    name: studentA.name,
                    rollNumber: studentA.rollNumber,
                    joinedAt: new Date()
                }
            ],
            participantCount: 1,
            groupMembers: [studentA._id],
            invitations: [
                {
                    student: studentB,
                    invitedBy: studentA,
                    status: 'pending'
                },
                {
                    student: studentC,
                    invitedBy: studentA,
                    status: 'declined'
                }
            ]
        },
        {
            tag: '09-group-accepted',
            raisedBy: studentA,
            department: DEPT_CSE,
            title: `${COMPLAINT_TAG} Group — participant accepted`,
            complaintType: 'group',
            visibility: 'public',
            isGroupComplaint: true,
            status: 'submitted',
            currentLevel: 'hod',
            currentAssignee: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.HOD),
            participants: [
                {
                    student: studentA._id,
                    name: studentA.name,
                    rollNumber: studentA.rollNumber,
                    joinedAt: new Date()
                },
                {
                    student: studentB._id,
                    name: studentB.name,
                    rollNumber: studentB.rollNumber,
                    joinedAt: new Date()
                }
            ],
            participantCount: 2,
            groupMembers: [studentA._id, studentB._id]
        },
        {
            tag: '10-private-solo',
            raisedBy: studentC,
            department: DEPT_ECE,
            title: `${COMPLAINT_TAG} Private solo complaint`,
            complaintType: 'solo',
            visibility: 'private',
            status: 'submitted',
            currentLevel: 'hod',
            currentAssignee: hodEce._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.HOD),
            logs: [
                {
                    actor: studentC,
                    action: 'submitted',
                    newStatus: 'submitted',
                    level: 'hod',
                    remarks: 'Private visibility solo complaint'
                }
            ]
        },
        {
            tag: '11-audit-trail',
            raisedBy: studentB,
            department: DEPT_CSE,
            title: `${COMPLAINT_TAG} Multi-step audit trail`,
            status: 'assigned',
            currentLevel: 'advisor',
            currentAssignee: advisor._id,
            assignedBy: hodCse._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.ADVISOR),
            logs: [
                {
                    actor: studentB,
                    action: 'submitted',
                    newStatus: 'submitted',
                    level: 'hod'
                },
                {
                    actor: hodCse,
                    action: 'accepted',
                    previousStatus: 'submitted',
                    newStatus: 'accepted',
                    level: 'hod'
                },
                {
                    actor: hodCse,
                    action: 'assigned',
                    previousStatus: 'accepted',
                    newStatus: 'assigned',
                    newAssignee: advisor._id,
                    level: 'advisor'
                }
            ]
        },
        {
            tag: '12-ece-routing',
            raisedBy: studentC,
            department: DEPT_ECE,
            title: `${COMPLAINT_TAG} ECE department routing`,
            status: 'submitted',
            currentLevel: 'hod',
            currentAssignee: hodEce._id,
            initialLevel: 'hod',
            levelDeadline: addTime(DURATIONS.HOD),
            logs: [
                {
                    actor: studentC,
                    action: 'submitted',
                    newStatus: 'submitted',
                    newAssignee: hodEce._id,
                    level: 'hod',
                    remarks: 'Routed to ECE HOD'
                }
            ]
        }
    ];

    for (const scenario of scenarios) {
        const {
            raisedBy,
            tag,
            logs = [],
            invitations = [],
            participants,
            groupMembers,
            participantCount,
            complaintType = 'solo',
            visibility = 'public',
            isGroupComplaint = false,
            ...rest
        } = scenario;

        const description = `Development test scenario ${tag}. Safe to delete or re-seed.`;

        const complaint = await Complaint.create({
            raisedBy: raisedBy._id,
            raisedByName: raisedBy.name,
            studentProfile: studentProfile(raisedBy),
            description,
            complaintType,
            visibility,
            isGroupComplaint,
            participants:
                participants ||
                [
                    {
                        student: raisedBy._id,
                        name: raisedBy.name,
                        rollNumber: raisedBy.rollNumber || '',
                        joinedAt: new Date()
                    }
                ],
            participantCount: participantCount ?? 1,
            groupMembers: groupMembers || [raisedBy._id],
            priority: 'medium',
            location: 'Campus',
            ...base,
            ...rest
        });

        for (const log of logs) {
            await ComplaintLog.create({
                complaint: complaint._id,
                actor: log.actor._id,
                actorRole: log.actor.role,
                previousStatus: log.previousStatus || null,
                newStatus: log.newStatus || rest.status,
                previousAssignee: log.previousAssignee || null,
                newAssignee: log.newAssignee || rest.currentAssignee || null,
                level: log.level,
                assignedTo: log.newAssignee || rest.currentAssignee || null,
                action: log.action,
                remarks: log.remarks || ''
            });
        }

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

    console.log(`Seeded ${scenarios.length} dev-tagged complaints.`);
}

async function main() {
    const target = assertSafeToSeed(process.env.MONGO_URI);
    console.log(
        `Seed target: host=${target.host} database=${target.dbName} (dev accounts only)`
    );

    await mongoose.connect(process.env.MONGO_URI);
    await ensureDefaultCategories();

    const categoryAcademic = await Category.findOne({
        name: 'Academic Affairs',
        isActive: true
    });

    if (!categoryAcademic) {
        throw new Error('Academic Affairs category missing after ensureDefaultCategories');
    }

    const passwordHash = await bcryptjs.hash(DEV_PASSWORD, 10);
    const usersByKey = {};

    for (const def of devUsers) {
        const { key, user } = await upsertDevUser(def, passwordHash);
        usersByKey[key] = user;
        console.log(`Upserted dev user: ${user.email} (${user.role})`);
    }

    await syncLegacySample(passwordHash);
    await removePriorDevComplaints();
    await seedComplaints(usersByKey, categoryAcademic);

    console.log('\nDev seed complete.');
    console.log(
        'Credentials are documented in docs/LOCAL_TESTING.md (password not printed here).'
    );
}

main()
    .catch((err) => {
        console.error('Dev seed failed:', err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
