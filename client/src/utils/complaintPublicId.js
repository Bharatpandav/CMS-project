export function complaintPublicId(complaint) {
    const id = complaint?.publicId;
    return typeof id === 'string' && id.trim() ? id.trim() : '';
}
