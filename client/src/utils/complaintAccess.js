export function complaintAccessLabel(complaint) {
    if (complaint?.complaintType === 'group') {
        return 'Group · Public';
    }
    const visibility =
        complaint?.visibility === 'private' ? 'Private' : 'Public';
    return `Individual · ${visibility}`;
}
