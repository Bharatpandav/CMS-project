export function computeComplaintStats(complaints = []) {
    const stats = {
        total: complaints.length,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        escalated: 0,
        rejected: 0
    };

    complaints.forEach((c) => {
        const status = (c.status || '').toLowerCase();

        if (['submitted', 'pending'].includes(status)) {
            stats.pending += 1;
        } else if (
            ['accepted', 'assigned', 'escalated'].includes(status)
        ) {
            stats.inProgress += 1;
        }

        if (status === 'resolved') {
            stats.resolved += 1;
        }
        if (status === 'escalated') {
            stats.escalated += 1;
        }
        if (status === 'rejected') {
            stats.rejected += 1;
        }
    });

    return stats;
}
