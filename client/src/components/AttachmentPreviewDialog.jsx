import { useId } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Dialog } from './ui/Dialog.jsx';
import {
    attachmentDisplayName,
    attachmentPreviewKind
} from '../utils/attachmentPreview.js';
import '../styles/attachment-preview.css';

export function AttachmentPreviewDialog({ file, onClose }) {
    const titleId = useId();
    const open = Boolean(file?.url);
    const filename = attachmentDisplayName(file);
    const kind = open ? attachmentPreviewKind(file) : 'document';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            titleId={titleId}
            ariaLabel="File preview"
            className={`attachment-preview attachment-preview--${kind}`}
            backdropClassName="attachment-preview-backdrop"
            closeLabel="Close preview"
        >
            <h2 id={titleId} className="attachment-preview__title">
                {filename}
            </h2>
            <div className="attachment-preview__body">
            {open && kind === 'image' ? (
                <img
                    src={file.url}
                    alt={filename}
                    className="attachment-preview__image"
                />
            ) : null}
            {open && kind === 'pdf' ? (
                <iframe
                    title={filename}
                    src={file.url}
                    className="attachment-preview__pdf"
                />
            ) : null}
            {open && kind !== 'image' && kind !== 'pdf' ? (
                <div className="attachment-preview__fallback">
                    {kind === 'excel' ? (
                        <FileSpreadsheet size={40} aria-hidden />
                    ) : (
                        <FileText size={40} aria-hidden />
                    )}
                    <p>
                        In-browser preview is not available for this file
                        type. Download the original file to open it locally.
                    </p>
                    <a
                        className="attachment-preview__download"
                        href={file.url}
                        download={filename}
                    >
                        <Download size={16} aria-hidden />
                        Download {filename}
                    </a>
                </div>
            ) : null}
            {open && (kind === 'image' || kind === 'pdf') ? (
                <a
                    className="attachment-preview__download attachment-preview__download--inline"
                    href={file.url}
                    download={filename}
                >
                    <Download size={16} aria-hidden />
                    Download original
                </a>
            ) : null}
            </div>
        </Dialog>
    );
}