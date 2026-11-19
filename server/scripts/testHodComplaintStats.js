import assert from 'node:assert/strict';
import {
    applyHodStatusBucketToFilter,
    buildHodComplaintStatsPipeline,
    mapHodComplaintAggRow
} from '../utils/hodComplaintStatsHelper.js';

const pipeline = buildHodComplaintStatsPipeline('Computer Science and Engineering');
assert.equal(pipeline[0].$match.department, 'Computer Science and Engineering');

const row = {
    total: 4,
    pending: 2,
    accepted: 1,
    rejected: 0,
    resolved: 0
};
const mapped = mapHodComplaintAggRow(row, 4);
assert.equal(mapped.total, 4);
assert.equal(mapped.pending, 2);
assert.equal(mapped.accepted, 1);
assert.deepEqual(Object.keys(mapped).sort(), [
    'accepted',
    'pending',
    'rejected',
    'resolved',
    'total'
]);

const acceptedFilter = { department: 'CSE' };
applyHodStatusBucketToFilter(acceptedFilter, 'accepted');
assert.deepEqual(acceptedFilter.status.$in, [
    'accepted',
    'assigned',
    'escalated',
    'reopened'
]);

const pendingFilter = { department: 'CSE' };
applyHodStatusBucketToFilter(pendingFilter, 'pending');
assert.deepEqual(pendingFilter.status.$in, ['submitted', 'pending']);

console.log('HOD complaint stats helper tests passed.');