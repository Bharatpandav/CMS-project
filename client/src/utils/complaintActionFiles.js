export const ACTION_ATTACHMENT_ACCEPT = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp'
].join(',');

export const ACTION_ATTACHMENT_LIMITS = {
    maxFiles: 5,
    maxFileBytes: 5 * 1024 * 1024,
    maxTotalBytes: 12 * 1024 * 1024
};

const MIME_LABELS = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        'Excel',
    'image/jpeg': 'Image',
    'image/png': 'Image',
    'image/webp': 'Image'
};

export function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileTypeLabel(mime) {
    return MIME_LABELS[mime] || 'Document';
}

function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
        reader.readAsDataURL(file);
    });
}

export function validateClientActionFile(file, existingTotalBytes) {
    const { maxFileBytes, maxTotalBytes } = ACTION_ATTACHMENT_LIMITS;
    if (!ACTION_ATTACHMENT_ACCEPT.split(',').includes(file.type)) {
        return {
            ok: false,
            message: `${file.name}: file type not supported`
        };
    }
    const blocked = /\.(exe|bat|cmd|msi|js|sh|php|html?)$/i.test(file.name);
    if (blocked) {
        return { ok: false, message: `${file.name}: file type not allowed` };
    }
    if (file.size > maxFileBytes) {
        return {
            ok: false,
            message: `${file.name}: exceeds ${formatBytes(maxFileBytes)} limit`
        };
    }
    if (existingTotalBytes + file.size > maxTotalBytes) {
        return {
            ok: false,
            message: 'Total attachment size exceeds the limit for this action'
        };
    }
    return { ok: true };
}

export async function buildActionFileEntries(fileList, existing = []) {
    const entries = [...existing];
    let totalBytes = entries.reduce((sum, f) => sum + (f.size || 0), 0);
    const { maxFiles } = ACTION_ATTACHMENT_LIMITS;

    for (const file of fileList) {
        if (entries.length >= maxFiles) {
            throw new Error(`You can attach up to ${maxFiles} files per action`);
        }
        const check = validateClientActionFile(file, totalBytes);
        if (!check.ok) {
            throw new Error(check.message);
        }
        const url = await readAsDataUrl(file);
        entries.push({
            id: `${file.name}-${file.size}-${file.lastModified}`,
            name: file.name,
            type: file.type,
            size: file.size,
            url
        });
        totalBytes += file.size;
    }
    return entries;
}

export function serializeActionFilesForApi(entries) {
    return entries.map((f) => ({
        url: f.url,
        filename: f.name,
        fileType: f.type,
        fileSize: f.size
    }));
}