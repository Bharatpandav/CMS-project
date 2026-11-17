/**
 * Department-scoped HOD complaint dashboard buckets (mutually exclusive).
 *
 * Pending: newly submitted, awaiting action.
 * Accepted: accepted, assigned, escalated, or reopened (in processing).
 * Rejected / Resolved: by status.
 * Total: all complaints in the department (any status, no duplicates).
 */

export const HOD_PENDING_STATUSES = ['submitted', 'pending'];
export const HOD_ACCEPTED_STATUSES = [
    'accepted',
    'assigned',
    'escalated',
    'reopened'
];

export const HOD_COMPLAINT_BUCKETS = {
    pending: HOD_PENDING_STATUSES,
    accepted: HOD_ACCEPTED_STATUSES,
    rejected: ['rejected'],
    resolved: ['resolved', 'closed']
};

const PENDING_STATUSES = HOD_PENDING_STATUSES;
const ACCEPTED_STATUSES = HOD_ACCEPTED_STATUSES;

/**
 * Apply HOD dashboard bucket filter to an existing complaint list filter.
 * @param {object} filter
 * @param {string | undefined} statusParam — bucket key or empty for all
 */
export function applyHodStatusBucketToFilter(filter, statusParam) {
    const key = (statusParam || '').trim().toLowerCase();
    if (!key || key === 'all') {
        return;
    }

    const statuses = HOD_COMPLAINT_BUCKETS[key];
    if (statuses) {
        filter.status = { $in: statuses };
        return;
    }

    filter.status = key;
}

export function buildScopedComplaintStatsPipeline(matchFilter) {
    return [
        { $match: matchFilter },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                pending: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', PENDING_STATUSES] },
                            1,
                            0
                        ]
                    }
                },
                accepted: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ACCEPTED_STATUSES] },
                            1,
                            0
                        ]
                    }
                },
                rejected: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
                    }
                },
                resolved: {
                    $sum: {
                        $cond: [
                            {
                                $in: [
                                    '$status',
                                    ['resolved', 'closed']
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ];
}

export function buildHodComplaintStatsPipeline(department) {
    return buildScopedComplaintStatsPipeline({ department });
}

export function emptyHodComplaintStats() {
    return {
        total: 0,
        accepted: 0,
        rejected: 0,
        pending: 0,
        resolved: 0
    };
}

export function mapHodComplaintAggRow(row, totalFromCount) {
    if (!row) {
        return { ...emptyHodComplaintStats(), total: totalFromCount || 0 };
    }
    return {
        total: totalFromCount ?? row.total ?? 0,
        accepted: row.accepted ?? 0,
        rejected: row.rejected ?? 0,
        pending: row.pending ?? 0,
        resolved: row.resolved ?? 0
    };
}