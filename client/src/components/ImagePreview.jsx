import { useId } from 'react';
import { Dialog } from './ui/Dialog.jsx';
import '../styles/image-preview.css';

export function ImagePreview({ file, onClose }) {
    const titleId = useId();
    const open = Boolean(file?.url);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            titleId={titleId}
            ariaLabel="Image preview"
            className="image-preview"
            backdropClassName="image-preview-backdrop"
            closeLabel="Close image preview"
        >
            <h2 id={titleId} className="image-preview__title">
                {file?.filename || 'Attachment'}
            </h2>
            {open ? (
                <img src={file.url} alt={file.filename || 'Attachment preview'} />
            ) : null}
        </Dialog>
    );
}
