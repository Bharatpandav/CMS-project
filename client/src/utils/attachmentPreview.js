export function isImageMime(fileType = '', url = '') {
    if (fileType.startsWith('image/')) return true;
    if (typeof url === 'string' && url.startsWith('data:image/')) return true;
    return /\.(png|jpe?g|gif|webp)$/i.test(url);
}

export function isPdfMime(fileType = '', url = '') {
    if (fileType === 'application/pdf') return true;
    if (typeof url === 'string' && url.startsWith('data:application/pdf'))
        return true;
    return /\.pdf$/i.test(url);
}

export function isWordMime(fileType = '') {
    return (
        fileType === 'application/msword' ||
        fileType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
}

export function isExcelMime(fileType = '') {
    return (
        fileType === 'application/vnd.ms-excel' ||
        fileType ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
}

/** @returns {'image' | 'pdf' | 'word' | 'excel' | 'document'} */
export function attachmentPreviewKind(file) {
    const fileType = file?.fileType || file?.type || '';
    const url = file?.url || '';
    if (isImageMime(fileType, url)) return 'image';
    if (isPdfMime(fileType, url)) return 'pdf';
    if (isWordMime(fileType)) return 'word';
    if (isExcelMime(fileType)) return 'excel';
    return 'document';
}

export function attachmentDisplayName(file, fallback = 'Attachment') {
    return (
        file?.filename ||
        file?.name ||
        fallback
    );
}