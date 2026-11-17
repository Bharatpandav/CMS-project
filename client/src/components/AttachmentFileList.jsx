import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import '../styles/attachment-preview.css';
import {
    attachmentDisplayName,
    attachmentPreviewKind
} from '../utils/attachmentPreview.js';
import { fileTypeLabel, formatBytes } from '../utils/complaintActionFiles.js';

function ThumbButton({ file, onOpen, label }) {
    const kind = attachmentPreviewKind(file);
    const name = attachmentDisplayName(file);

    if (kind === 'image') {
        return (
            <button
                type="button"
                className="attach-file__thumb attach-file__thumb--image"
                onClick={() => onOpen?.(file)}
                aria-label={label || `Preview ${name}`}
            >
                <img src={file.url} alt="" />
            </button>
        );
    }

    if (kind === 'pdf') {
        return (
            <button
                type="button"
                className="attach-file__thumb attach-file__thumb--pdf"
                onClick={() => onOpen?.(file)}
                aria-label={label || `Preview PDF ${name}`}
            >
                <span className="attach-file__pdf-mark">PDF</span>
                <FileText size={22} aria-hidden />
            </button>
        );
    }

    const Icon = kind === 'excel' ? FileSpreadsheet : FileText;
    return (
        <button
            type="button"
            className={`attach-file__thumb attach-file__thumb--${kind}`}
            onClick={() => onOpen?.(file)}
            aria-label={label || `Open details for ${name}`}
        >
            <Icon size={24} aria-hidden />
        </button>
    );
}

export function AttachmentFileList({
    files = [],
    onOpen,
    onRemove,
    removable = false,
    showDownload = true,
    compact = false,
    openActionLabel = 'Preview'
}) {
    if (!files.length) return null;

    return (
        <ul
            className={
                compact ? 'attach-file-list attach-file-list--compact' : 'attach-file-list'
            }
        >
            {files.map((file, index) => {
                const name = attachmentDisplayName(file);
                const type = file.fileType || file.type || '';
                const size = file.fileSize ?? file.size;
                const key = file.id || `${name}-${index}`;
                const canPreview = Boolean(file.url && onOpen);

                return (
                    <li key={key} className="attach-file">
                        {canPreview ? (
                            <ThumbButton
                                file={file}
                                onOpen={onOpen}
                            />
                        ) : (
                            <span
                                className="attach-file__thumb attach-file__thumb--static"
                                aria-hidden
                            >
                                <FileText size={22} />
                            </span>
                        )}
                        <div className="attach-file__body">
                            <span className="attach-file__name">{name}</span>
                            <span className="attach-file__meta">
                                {fileTypeLabel(type)}
                                {size ? ` · ${formatBytes(size)}` : ''}
                            </span>
                        </div>
                        <div className="attach-file__actions">
                            {canPreview ? (
                                <button
                                    type="button"
                                    className="attach-file__link"
                                    onClick={() => onOpen(file)}
                                >
                                    {openActionLabel}
                                </button>
                            ) : null}
                            {showDownload && file.url ? (
                                <a
                                    className="attach-file__link"
                                    href={file.url}
                                    download={name}
                                >
                                    <Download size={14} aria-hidden />
                                    Download
                                </a>
                            ) : null}
                            {removable && onRemove ? (
                                <button
                                    type="button"
                                    className="attach-file__remove"
                                    onClick={() => onRemove(file)}
                                >
                                    Remove
                                </button>
                            ) : null}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}