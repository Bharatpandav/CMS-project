import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Complaint from '../models/complaintModel.js';
import ComplaintSequence from '../models/complaintSequenceModel.js';
import User from '../models/userModel.js';
import {
    allocateComplaintPublicId,
    backfillComplaintPublicIds,
    buildComplaintPublicId,
    formatComplaintSequence,
    planHistoricalPublicIds
} from '../utils/complaintPublicId.js';

dotenv.config();

function testFormatting() {
    assert.equal(formatComplaintSequence(1), '01');
    assert.equal(formatComplaintSequence(9), '09');
    assert.equal(formatComplaintSequence(10), '10');
    assert.equal(formatComplaintSequence(99), '99');
    assert.equal(formatComplaintSequence(100), '100');
    assert.equal(formatComplaintSequence(101), '101');
    assert.equal(buildComplaintPublicId('23303040', 1), 'CID/23303040/01');
    assert.equal(buildComplaintPublicId('23303041', 2), 'CID/23303041/02');
    assert.throws(() => buildComplaintPublicId('', 1));
    assert.throws(() => buildComplaintPublicId('ABC', 1));
    assert.throws(() => formatComplaintSequence(0));
}

function testHistoricalPlan() {
    const first = planHistoricalPublicIds([
        {
            _id: 'b',
            rollNumber: '23303040',
            createdAt: '2026-02-01T00:00:00.000Z',
            publicId: ''
        },
        {
            _id: 'a',
            rollNumber: '23303040',
            createdAt: '2026-01-01T00:00:00.000Z',
            publicId: ''
        },
        {
            _id: 'c',
            rollNumber: '23303041',
            createdAt: '2026-03-01T00:00:00.000Z',
            publicId: ''
        }
    ]);
    assert.equal(first.ok, true);
    assert.deepEqual(
        first.assignments.map((row) => row.publicId),
        ['CID/23303040/01', 'CID/23303040/02', 'CID/23303041/01']
    );
    assert.equal(first.assignments[0]._id, 'a');

    const continued = planHistoricalPublicIds(
        [
            {
                _id: 'kept',
                rollNumber: '23303040',
                createdAt: '2026-01-01T00:00:00.000Z',
                publicId: 'CID/23303040/01'
            },
            {
                _id: 'next',
                rollNumber: '23303040',
                createdAt: '2026-04-01T00:00:00.000Z',
                publicId: ''
            }
        ],
        { 23303040: 1 }
    );
    assert.equal(continued.assignments[0].publicId, 'CID/23303040/02');

    const afterGap = planHistoricalPublicIds(
        [
            {
                _id: 'only',
                rollNumber: '23303040',
                createdAt: '2026-04-01T00:00:00.000Z',
                publicId: ''
            }
        ],
        { 23303040: 3 }
    );
    assert.equal(afterGap.assignments[0].publicId, 'CID/23303040/04');
    assert.equal(afterGap.counters['23303040'], 4);

    const missing = planHistoricalPublicIds([
        {
            _id: 'x',
            rollNumber: '',
            createdAt: '2026-01-01T00:00:00.000Z',
            publicId: ''
        }
    ]);
    assert.equal(missing.ok, false);
    assert.equal(missing.assignments.length, 0);

    const duplicate = planHistoricalPublicIds([
        {
            _id: 'd1',
            rollNumber: '23303040',
            createdAt: '2026-01-01T00:00:00.000Z',
            publicId: 'CID/23303040/01'
        },
        {
            _id: 'd2',
            rollNumber: '23303040',
            createdAt: '2026-02-01T00:00:00.000Z',
            publicId: 'CID/23303040/01'
        }
    ]);
    assert.equal(duplicate.ok, false);
}

async function resetRoll(roll) {
    await ComplaintSequence.deleteOne({ rollNumber: roll });
    await Complaint.deleteMany({ publicId: new RegExp(`^CID/${roll}/`) });
}

async function testDatabaseAllocation() {
    const rollA = '91000040';
    const rollB = '91000041';
    await resetRoll(rollA);
    await resetRoll(rollB);

    const first = await allocateComplaintPublicId(rollA);
    const second = await allocateComplaintPublicId(rollA);
    const other = await allocateComplaintPublicId(rollB);
    assert.equal(first, 'CID/91000040/01');
    assert.equal(second, 'CID/91000040/02');
    assert.equal(other, 'CID/91000041/01');

    const skipped = await allocateComplaintPublicId(rollA);
    assert.equal(skipped, 'CID/91000040/03');

    const concurrent = await Promise.all(
        Array.from({ length: 20 }, () => allocateComplaintPublicId(rollA))
    );
    const unique = new Set(concurrent);
    assert.equal(unique.size, 20);
    assert.equal(concurrent.includes('CID/91000040/03'), false);
    const numbers = concurrent
        .map((id) => Number(id.split('/')[2]))
        .sort((a, b) => a - b);
    assert.deepEqual(
        numbers,
        Array.from({ length: 20 }, (_, index) => index + 4)
    );

    const sequence = await ComplaintSequence.findOne({ rollNumber: rollA }).lean();
    assert.equal(sequence.seq, 23);

    const rollC = '91000042';
    await resetRoll(rollC);
    const cold = await Promise.all(
        Array.from({ length: 15 }, () => allocateComplaintPublicId(rollC))
    );
    assert.equal(new Set(cold).size, 15);
    const coldNumbers = cold
        .map((id) => Number(id.split('/')[2]))
        .sort((a, b) => a - b);
    assert.deepEqual(
        coldNumbers,
        Array.from({ length: 15 }, (_, index) => index + 1)
    );

    await Complaint.syncIndexes();
    await Complaint.collection.insertOne({
        publicId: 'CID/91000042/90',
        raisedBy: new mongoose.Types.ObjectId()
    });
    await assert.rejects(() =>
        Complaint.collection.insertOne({
            publicId: 'CID/91000042/90',
            raisedBy: new mongoose.Types.ObjectId()
        })
    );

    await resetRoll(rollA);
    await resetRoll(rollB);
    await resetRoll(rollC);
    await Complaint.deleteMany({ publicId: 'CID/91000042/90' });
    await testBackfill();
}

async function testBackfill() {
    const roll = '91000043';
    await ComplaintSequence.deleteOne({ rollNumber: roll });
    await Complaint.deleteMany({ 'studentProfile.rollNumber': roll });

    const olderId = new mongoose.Types.ObjectId();
    const newerId = new mongoose.Types.ObjectId();
    await Complaint.collection.insertMany([
        {
            _id: newerId,
            raisedBy: new mongoose.Types.ObjectId(),
            studentProfile: { rollNumber: roll, name: 'Newer', email: 'newer@example.com' },
            createdAt: new Date('2026-05-02T00:00:00.000Z'),
            title: 'newer test complaint'
        },
        {
            _id: olderId,
            raisedBy: new mongoose.Types.ObjectId(),
            studentProfile: { rollNumber: roll, name: 'Older', email: 'older@example.com' },
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
            title: 'older test complaint'
        }
    ]);

    const result = await backfillComplaintPublicIds(Complaint, User);
    assert.equal(result.ok, true);

    const older = await Complaint.findById(olderId).select('publicId _id').lean();
    const newer = await Complaint.findById(newerId).select('publicId _id').lean();
    assert.equal(String(older._id), String(olderId));
    assert.equal(older.publicId, 'CID/91000043/01');
    assert.equal(newer.publicId, 'CID/91000043/02');

    const second = await backfillComplaintPublicIds(Complaint, User);
    assert.equal(second.ok, true);
    assert.equal(second.updated, 0);
    const olderAgain = await Complaint.findById(olderId).select('publicId').lean();
    assert.equal(olderAgain.publicId, 'CID/91000043/01');

    await Complaint.deleteMany({ _id: { $in: [olderId, newerId] } });
    await ComplaintSequence.deleteOne({ rollNumber: roll });
}

testFormatting();
testHistoricalPlan();

if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set; database allocation tests were not run');
    process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
try {
    await testDatabaseAllocation();
    console.log('Complaint ID tests passed');
} finally {
    await mongoose.disconnect();
}
