import assert from 'node:assert/strict';
import { assertTransition } from '../utils/complaintWorkflowHelper.js';
import { validateRejectionPayload } from '../constants/complaintRejectionReasons.js';

const acceptSubmitted = assertTransition('accepted', 'submitted');
assert.equal(acceptSubmitted.ok, true);

const rejectSubmitted = assertTransition('rejected', 'submitted');
assert.equal(rejectSubmitted.ok, true);

const badAccept = assertTransition('accepted', 'resolved');
assert.equal(badAccept.ok, false);

const assignSubmitted = assertTransition('assign', 'submitted');
assert.equal(assignSubmitted.ok, false);

const assignAccepted = assertTransition('assign', 'accepted');
assert.equal(assignAccepted.ok, true);

const closeResolved = assertTransition('close', 'resolved');
assert.equal(closeResolved.ok, true);

const closeAssigned = assertTransition('close', 'assigned');
assert.equal(closeAssigned.ok, false);

const rejectionOther = validateRejectionPayload({
    rejectionReasonCode: 'other',
    rejectionReasonOther: 'Test explanation'
});
assert.equal(rejectionOther.ok, true);
assert.ok(rejectionOther.note.includes('Test explanation'));

const rejectionMissing = validateRejectionPayload({
    rejectionReasonCode: 'duplicate_complaint'
});
assert.equal(rejectionMissing.ok, true);

const rejectionNoCode = validateRejectionPayload({});
assert.equal(rejectionNoCode.ok, false);

console.log('testComplaintTransitions: ok');