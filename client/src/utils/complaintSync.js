/** Local + cross-tab hint that complaint lists and dashboard metrics should refetch. */
export const COMPLAINTS_DATA_EVENT = 'cms:complaints-data-changed';

export function notifyComplaintsDataChanged(detail = {}) {
    window.dispatchEvent(
        new CustomEvent(COMPLAINTS_DATA_EVENT, { detail })
    );
}