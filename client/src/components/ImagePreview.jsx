import { AttachmentPreviewDialog } from './AttachmentPreviewDialog.jsx';

/** @deprecated Use AttachmentPreviewDialog — kept for complaint registration images */
export function ImagePreview({ file, onClose }) {
    return (
        <AttachmentPreviewDialog
            file={
                file
                    ? {
                          url: file.url,
                          filename: file.filename,
                          fileType: file.fileType || 'image/png'
                      }
                    : null
            }
            onClose={onClose}
        />
    );
}
