const MAX_FILES_PER_ACTION = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;

const ALLOWED_MIME = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
]);

const EXT_FOR_MIME = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        '.docx'
    ],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx'
    ],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/jpg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp']
};

const BLOCKED_EXT = new Set([
    '.exe',
    '.bat',
    '.cmd',
    '.com',
    '.msi',
    '.js',
    '.jar',
    '.sh',
    '.ps1',
    '.vbs',
    '.scr',
    '.dll',
    '.php',
    '.html',
    '.htm'
]);

function decodeDataUrlPayload(url) {
    if (typeof url !== 'string' || !url.startsWith('data:')) {
        return { ok: false, message: 'Invalid attachment payload' };
    }
    const comma = url.indexOf(',');
    if (comma === -1) {
        return { ok: false, message: 'Invalid attachment encoding' };
    }
    const header = url.slice(0, comma);
    const body = url.slice(comma + 1);
    const isBase64 = /;base64/i.test(header);
    if (!isBase64) {
        return { ok: false, message: 'Attachments must use base64 encoding' };
    }
    const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
    const bytes = Math.floor((body.length * 3) / 4) - padding;
    return { ok: true, bytes };
}

function extensionOf(name) {
    const n = String(name || '').toLowerCase();
    const dot = n.lastIndexOf('.');
    return dot >= 0 ? n.slice(dot) : '';
}

export function validateActionAttachments(raw) {
    if (raw == null) {
        return { ok: true, files: [] };
    }
    if (!Array.isArray(raw)) {
        return {
            ok: false,
            message: 'Attachments must be an array'
        };
    }
    if (raw.length === 0) {
        return { ok: true, files: [] };
    }
    if (raw.length > MAX_FILES_PER_ACTION) {
        return {
            ok: false,
            message: `You can attach up to ${MAX_FILES_PER_ACTION} files per action`
        };
    }

    const files = [];
    let totalBytes = 0;

    for (const item of raw) {
        const url = String(item?.url || '').trim();
        const filename = String(item?.filename || 'attachment').trim();
        const fileType = String(item?.fileType || '').trim().toLowerCase();
        const ext = extensionOf(filename);

        if (BLOCKED_EXT.has(ext)) {
            return {
                ok: false,
                message: `File type not allowed: ${filename}`
            };
        }

        if (!ALLOWED_MIME.has(fileType)) {
            return {
                ok: false,
                message: `Unsupported file type for ${filename}`
            };
        }

        const allowedExt = EXT_FOR_MIME[fileType] || [];
        if (allowedExt.length && ext && !allowedExt.includes(ext)) {
            return {
                ok: false,
                message: `File extension does not match type for ${filename}`
            };
        }

        const decoded = decodeDataUrlPayload(url);
        if (!decoded.ok) {
            return decoded;
        }
        if (decoded.bytes > MAX_FILE_BYTES) {
            return {
                ok: false,
                message: `Each file must be ${MAX_FILE_BYTES / (1024 * 1024)} MB or smaller`
            };
        }
        totalBytes += decoded.bytes;
        if (totalBytes > MAX_TOTAL_BYTES) {
            return {
                ok: false,
                message: 'Total attachment size exceeds the limit for this action'
            };
        }

        files.push({
            url,
            filename: filename.slice(0, 200),
            fileType,
            fileSize: decoded.bytes
        });
    }

    return { ok: true, files };
}

export function stampActionAttachments(
    files,
    actor,
    { intendedRecipient = null, actionType = '' } = {}
) {
    const uploadedAt = new Date();
    const recipientId = intendedRecipient?._id || intendedRecipient || null;
    return files.map((file) => ({
        ...file,
        uploadedBy: actor?._id || null,
        uploadedByName: actor?.name || '',
        uploadedAt,
        intendedRecipient: recipientId,
        actionType: actionType || ''
    }));
}

export function mergeIntoComplaintAttachments(complaint, stamped, actionKey) {
    if (!stamped.length) return;
    if (!Array.isArray(complaint.attachments)) {
        complaint.attachments = [];
    }
    for (const file of stamped) {
        complaint.attachments.push({
            url: file.url,
            filename: file.filename,
            fileType: file.fileType,
            fileSize: file.fileSize,
            source: 'action',
            action: actionKey,
            uploadedBy: file.uploadedBy,
            uploadedByName: file.uploadedByName,
            uploadedAt: file.uploadedAt,
            intendedRecipient: file.intendedRecipient,
            actionType: file.actionType || actionKey
        });
    }
}

export const ACTION_ATTACHMENT_LIMITS = {
    maxFiles: MAX_FILES_PER_ACTION,
    maxFileBytes: MAX_FILE_BYTES,
    maxTotalBytes: MAX_TOTAL_BYTES
};