import { useId, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { AppIcon } from './AppIcon.jsx';
import { AttachmentFileList } from './AttachmentFileList.jsx';
import { AttachmentPreviewDialog } from './AttachmentPreviewDialog.jsx';
import {
    ACTION_ATTACHMENT_ACCEPT,
    ACTION_ATTACHMENT_LIMITS,
    buildActionFileEntries,
    formatBytes
} from '../utils/complaintActionFiles.js';

export function ActionAttachmentUpload({
    files,
    onChange,
    disabled = false,
    onError,
    compact = false
}) {
    const inputId = useId();
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [busy, setBusy] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);

    const addFiles = async (fileList) => {
        if (!fileList?.length || disabled || busy) return;
        setBusy(true);
        try {
            const next = await buildActionFileEntries(fileList, files);
            onChange(next);
        } catch (err) {
            onError?.(err.message || 'Could not add files');
        } finally {
            setBusy(false);
        }
    };

    const removeFile = (file) => {
        if (disabled || busy) return;
        onChange(files.filter((f) => f.id !== file.id));
        if (previewFile?.id === file.id) setPreviewFile(null);
    };

    const openPreview = (file) => {
        setPreviewFile({
            url: file.url,
            filename: file.name,
            fileType: file.type,
            fileSize: file.size
        });
    };

    return (
        <div
            className={
                compact ? 'action-attach action-attach--compact' : 'action-attach'
            }
        >
            <span className="action-attach__label">
                <Paperclip size={15} aria-hidden />
                Attach files <em>(optional)</em>
            </span>
            <div
                className={`action-attach__drop${dragOver ? ' is-dragover' : ''}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    addFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        inputRef.current?.click();
                    }
                }}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled || busy}
            >
                <AppIcon
                    name="upload-cloud"
                    size={compact ? 'md' : 'lg'}
                />
                <p>
                    {compact
                        ? 'Add files'
                        : 'Drag & drop or click to choose files'}
                </p>
                <small>
                    PDF, Word, Excel, or images. Up to{' '}
                    {ACTION_ATTACHMENT_LIMITS.maxFiles} files,{' '}
                    {formatBytes(ACTION_ATTACHMENT_LIMITS.maxFileBytes)} each.
                </small>
            </div>
            <input
                ref={inputRef}
                id={inputId}
                type="file"
                hidden
                multiple
                accept={ACTION_ATTACHMENT_ACCEPT}
                disabled={
                    disabled ||
                    busy ||
                    files.length >= ACTION_ATTACHMENT_LIMITS.maxFiles
                }
                onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                }}
            />
            {busy ? (
                <p className="action-attach__hint">Reading files…</p>
            ) : null}
            {files.length > 0 ? (
                <AttachmentFileList
                    files={files.map((f) => ({
                        id: f.id,
                        url: f.url,
                        name: f.name,
                        type: f.type,
                        size: f.size
                    }))}
                    onOpen={openPreview}
                    onRemove={removeFile}
                    removable={!disabled && !busy}
                    showDownload={false}
                    compact
                />
            ) : null}
            <AttachmentPreviewDialog
                file={previewFile}
                onClose={() => setPreviewFile(null)}
            />
        </div>
    );
}