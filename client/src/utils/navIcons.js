/** Lucide icon keys for portal / management nav labels */
export const NAV_ICON_BY_LABEL = {
    Dashboard: 'dashboard',
    'Register Complaint': 'file-plus',
    'Raise Complaint': 'file-plus',
    'My Complaints': 'files',
    'Track Status': 'activity',
    'My Profile': 'user',
    Support: 'life-buoy',
    Complaints: 'clipboard-list',
    'All Complaints': 'clipboard-list',
    Categories: 'tags',
    'Register User': 'user-plus',
    'Bulk Registration': 'upload',
    'Bulk Import': 'upload',
    Departments: 'building',
    'All Users': 'users',
    'Management Portal': 'dashboard',
    'Import / Export': 'upload',
    'Audit Logs': 'scroll-text',
    Settings: 'settings'
};

export function getNavIconKey(label) {
    return NAV_ICON_BY_LABEL[label] || 'dashboard';
}
