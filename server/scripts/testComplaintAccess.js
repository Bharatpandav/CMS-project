import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Complaint from '../models/complaintModel.js';
import {
    canJoinStoredComplaint,
    complaintAccessLabel,
    resolveComplaintAccess
} from '../utils/complaintAccess.js';

dotenv.config();

function testResolve() {
    const individual = resolveComplaintAccess({});
    assert.equal(individual.ok, true);
    assert.equal(individual.complaintType, 'solo');
    assert.equal(individual.visibility, 'public');

    const named = resolveComplaintAccess({
        complaintType: 'individual',
        visibility: 'private'
    });
    assert.equal(named.complaintType, 'solo');
    assert.equal(named.visibility, 'private');

    const group = resolveComplaintAccess({
        complaintType: 'group',
        visibility: 'public'
    });
    assert.equal(group.complaintType, 'group');
    assert.equal(group.visibility, 'public');

    const rejected = resolveComplaintAccess({
        complaintType: 'group',
        visibility: 'private'
    });
    assert.equal(rejected.ok, false);

    const badType = resolveComplaintAccess({ complaintType: 'shared' });
    assert.equal(badType.ok, false);
    const badVisibility = resolveComplaintAccess({ visibility: 'hidden' });
    assert.equal(badVisibility.ok, false);
}

function testLabelsAndJoin() {
    assert.equal(
        complaintAccessLabel({ complaintType: 'solo', visibility: 'public' }),
        'Individual · Public'
    );
    assert.equal(
        complaintAccessLabel({ complaintType: 'solo', visibility: 'private' }),
        'Individual · Private'
    );
    assert.equal(
        complaintAccessLabel({ complaintType: 'group', visibility: 'public' }),
        'Group · Public'
    );
    assert.equal(
        complaintAccessLabel({ complaintType: 'group', visibility: 'private' }),
        'Group · Public'
    );
    assert.equal(complaintAccessLabel({}).includes('Group · Private'), false);

    const owner = '507f1f77bcf86cd799439011';
    const student = '507f1f77bcf86cd799439012';
    assert.equal(
        canJoinStoredComplaint(
            {
                complaintType: 'solo',
                visibility: 'public',
                status: 'submitted',
                raisedBy: owner
            },
            student
        ).ok,
        true
    );
    assert.equal(
        canJoinStoredComplaint(
            {
                complaintType: 'solo',
                visibility: 'private',
                status: 'submitted',
                raisedBy: owner
            },
            student
        ).ok,
        false
    );
    assert.equal(
        canJoinStoredComplaint(
            {
                complaintType: 'group',
                visibility: 'private',
                status: 'submitted',
                raisedBy: owner
            },
            student
        ).ok,
        false
    );
    const allowed = canJoinStoredComplaint(
        {
            complaintType: 'group',
            visibility: 'public',
            status: 'submitted',
            raisedBy: owner
        },
        student
    );
    assert.equal(allowed.ok, true);
    assert.equal(
        canJoinStoredComplaint(
            {
                complaintType: 'group',
                visibility: 'public',
                status: 'submitted',
                raisedBy: owner
            },
            owner
        ).ok,
        false
    );
}

async function correctInvalidGroupPrivacy() {
    const result = await Complaint.updateMany(
        { complaintType: 'group', visibility: 'private' },
        { $set: { visibility: 'public' } }
    );
    const remaining = await Complaint.countDocuments({
        complaintType: 'group',
        visibility: 'private'
    });
    assert.equal(remaining, 0);
    return result.modifiedCount || 0;
}

testResolve();
testLabelsAndJoin();

if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set; stored complaint check was not run');
    process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
try {
    const corrected = await correctInvalidGroupPrivacy();
    console.log(
        `Complaint access tests passed. Group complaints corrected to public: ${corrected}.`
    );
} finally {
    await mongoose.disconnect();
}
