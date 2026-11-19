/** Local + cross-tab hint that dashboard user statistics should refetch. */
export const DASHBOARD_USER_STATS_EVENT = 'cms:dashboard-user-stats-changed';

export function notifyDashboardUserStatsChanged() {
    window.dispatchEvent(new CustomEvent(DASHBOARD_USER_STATS_EVENT));
}