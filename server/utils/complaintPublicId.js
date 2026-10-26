import ComplaintSequence from '../models/complaintSequenceModel.js';

const ROLL_PATTERN = /^\d{1,10}$/;
const PUBLIC_ID_PATTERN = /^CID\/(\d{1,10})\/(\d{2,})$/;

export function formatComplaintSequence(seq) {
    const n = Number(seq);
    if (!Number.isInteger(n) || n < 1) {
        throw new Error('Complaint sequence must be a positive integer');
    }
    return n < 100 ? String(n).padStart(2, '0') : String(n);
}

export function buildComplaintPublicId(rollNumber, seq) {
    const roll = String(rollNumber || '').trim();
    if (!ROLL_PATTERN.test(roll)) {
        throw new Error(
            'A registered student roll number is required to issue a complaint ID'
        );
    }
    return `CID/${roll}/${formatComplaintSequence(seq)}`;
}

export function parseComplaintPublicId(publicId) {
    const match = PUBLIC_ID_PATTERN.exec(String(publicId || '').trim());
    if (!match) return null;
    return { rollNumber: match[1], seq: Number(match[2]) };
}

export function resolveComplainantRoll(complaint) {
    const raisedById = complaint?.raisedBy?._id || complaint?.raisedBy;
    const creator = Array.isArray(complaint?.participants)
        ? complaint.participants.find(
              (participant) =>
                  String(participant?.student?._id || participant?.student) ===
                  String(raisedById)
          )
        : null;
    return String(
        complaint?.studentProfile?.rollNumber ||
            complaint?.raisedBy?.rollNumber ||
            creator?.rollNumber ||
            ''
    ).trim();
}

async function updateSequence(filter, update) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            return await ComplaintSequence.findOneAndUpdate(filter, update, {
                upsert: true,
                returnDocument: 'after',
                setDefaultsOnInsert: true
            });
        } catch (error) {
            if (error?.code === 11000 && attempt < 4) continue;
            throw error;
        }
    }
    throw new Error('Could not update the complaint sequence');
}

/**
 * Atomically reserve the next complaint number for one student.
 * A failed complaint save consumes the number so the next attempt cannot reuse it.
 */
export async function allocateComplaintPublicId(rollNumber) {
    const roll = String(rollNumber || '').trim();
    if (!ROLL_PATTERN.test(roll)) {
        const error = new Error(
            'A registered student roll number is required to issue a complaint ID'
        );
        error.statusCode = 400;
        throw error;
    }

    const doc = await updateSequence({ rollNumber: roll }, { $inc: { seq: 1 } });
    return buildComplaintPublicId(roll, doc.seq);
}

function maxSequence(values) {
    return values.reduce((max, value) => Math.max(max, value || 0), 0);
}

/**
 * Plan IDs for complaints that do not have one yet.
 * Sequence continues from the highest issued number, not from the current record count.
 */
export function planHistoricalPublicIds(complaints, counters = {}) {
    const issues = [];
    const byRoll = new Map();

    for (const complaint of complaints) {
        const roll = String(complaint.rollNumber || '').trim();
        if (!ROLL_PATTERN.test(roll)) {
            issues.push({
                complaintId: String(complaint._id),
                reason: 'missing-roll-number'
            });
            continue;
        }
        if (!byRoll.has(roll)) byRoll.set(roll, []);
        byRoll.get(roll).push(complaint);
    }

    if (issues.length) {
        return { ok: false, issues, assignments: [], counters: { ...counters } };
    }

    const seen = new Map();
    for (const complaint of complaints) {
        if (!complaint.publicId) continue;
        const parsed = parseComplaintPublicId(complaint.publicId);
        if (!parsed || parsed.rollNumber !== complaint.rollNumber) {
            issues.push({
                complaintId: String(complaint._id),
                reason: 'invalid-public-id',
                publicId: complaint.publicId
            });
            continue;
        }
        if (seen.has(complaint.publicId)) {
            issues.push({
                complaintId: String(complaint._id),
                reason: 'duplicate-public-id',
                publicId: complaint.publicId
            });
            continue;
        }
        seen.set(complaint.publicId, String(complaint._id));
    }

    if (issues.length) {
        return { ok: false, issues, assignments: [], counters: { ...counters } };
    }

    const assignments = [];
    const nextCounters = { ...counters };

    for (const [roll, rows] of byRoll) {
        const ordered = [...rows].sort((a, b) => {
            const time =
                new Date(a.createdAt || 0).getTime() -
                new Date(b.createdAt || 0).getTime();
            if (time !== 0) return time;
            return String(a._id).localeCompare(String(b._id));
        });
        const issued = ordered
            .map((row) => parseComplaintPublicId(row.publicId)?.seq || 0)
            .filter(Boolean);
        let next = maxSequence([Number(nextCounters[roll]) || 0, ...issued]);
        for (const row of ordered) {
            if (row.publicId) continue;
            next += 1;
            assignments.push({
                _id: row._id,
                publicId: buildComplaintPublicId(roll, next)
            });
        }
        nextCounters[roll] = next;
    }

    return { ok: true, issues: [], assignments, counters: nextCounters };
}

export async function backfillComplaintPublicIds(Complaint, User) {
    const complaints = await Complaint.find({})
        .select(
            '_id raisedBy studentProfile.rollNumber participants createdAt publicId'
        )
        .populate('raisedBy', 'rollNumber')
        .lean();

    const missingUserIds = complaints
        .filter(
            (complaint) =>
                !resolveComplainantRoll(complaint) && complaint.raisedBy
        )
        .map((complaint) => complaint.raisedBy?._id || complaint.raisedBy);
    const users = missingUserIds.length
        ? await User.find({ _id: { $in: missingUserIds } })
              .select('rollNumber')
              .lean()
        : [];
    const rollsByUser = new Map(
        users.map((user) => [String(user._id), user.rollNumber || ''])
    );

    const plannedInput = complaints.map((complaint) => {
        const raisedById = String(
            complaint.raisedBy?._id || complaint.raisedBy || ''
        );
        return {
            _id: complaint._id,
            createdAt: complaint.createdAt,
            publicId: complaint.publicId || '',
            rollNumber:
                resolveComplainantRoll(complaint) ||
                rollsByUser.get(raisedById) ||
                ''
        };
    });

    const sequences = await ComplaintSequence.find({}).select('rollNumber seq').lean();
    const counters = Object.fromEntries(
        sequences.map((row) => [row.rollNumber, row.seq])
    );
    const plan = planHistoricalPublicIds(plannedInput, counters);
    if (!plan.ok) return { ...plan, updated: 0 };

    let updated = 0;
    const byRoll = new Map();
    for (const assignment of plan.assignments) {
        const parsed = parseComplaintPublicId(assignment.publicId);
        if (!byRoll.has(parsed.rollNumber)) byRoll.set(parsed.rollNumber, []);
        byRoll.get(parsed.rollNumber).push(assignment);
    }

    for (const [roll, assignments] of byRoll) {
        const ordered = [...assignments].sort(
            (a, b) =>
                parseComplaintPublicId(a.publicId).seq -
                parseComplaintPublicId(b.publicId).seq
        );
        const floor = ordered.length
            ? parseComplaintPublicId(ordered[0].publicId).seq - 1
            : 0;
        await updateSequence(
            { rollNumber: roll },
            { $max: { seq: floor } }
        );
        const reserved = await updateSequence(
            { rollNumber: roll },
            { $inc: { seq: ordered.length } }
        );
        const start = reserved.seq - ordered.length + 1;
        const operations = ordered.map((assignment, index) => ({
            updateOne: {
                filter: {
                    _id: assignment._id,
                    $or: [
                        { publicId: { $exists: false } },
                        { publicId: null },
                        { publicId: '' }
                    ]
                },
                update: {
                    $set: {
                        publicId: buildComplaintPublicId(roll, start + index)
                    }
                }
            }
        }));
        const result = await Complaint.bulkWrite(operations, { ordered: true });
        updated += result.modifiedCount || 0;
    }

    for (const [roll, seq] of Object.entries(plan.counters)) {
        if (!byRoll.has(roll) && seq > 0) {
            await updateSequence({ rollNumber: roll }, { $max: { seq } });
        }
    }

    return {
        ok: true,
        issues: [],
        updated,
        scanned: complaints.length
    };
}
