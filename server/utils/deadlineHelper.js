const DAY = 24 * 60 * 60 * 1000;

export const DURATIONS = {
    OVERALL: 60 * DAY,   // 2 months
    DEAN: 30 * DAY,      // 1 month
    HOD: 14 * DAY,       // 2 weeks
    ADVISOR: 14 * DAY,   // 2 weeks
};

export const addTime = (ms) => new Date(Date.now() + ms);