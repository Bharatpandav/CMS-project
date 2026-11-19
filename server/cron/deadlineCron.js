import {
    handleResolvedAutoClose,
    handleTimeouts
} from '../controller/complaintController.js';

const AUTO_CLOSE_INTERVAL_MS = 15 * 60 * 1000;
const DEADLINE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

function runSafely(label, fn) {
    return async () => {
        try {
            await fn();
        } catch (error) {
            console.error(`${label} failed:`, error);
        }
    };
}

export function startComplaintSchedulers() {
    setInterval(
        runSafely('Resolved auto-close check', handleResolvedAutoClose),
        AUTO_CLOSE_INTERVAL_MS
    );

    setInterval(
        runSafely('Complaint deadline check', handleTimeouts),
        DEADLINE_CHECK_INTERVAL_MS
    );

    console.log('Complaint schedulers started (auto-close + deadline checks)');
}