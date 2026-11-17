import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const A4_W_MM = 210;
const A4_H_MM = 297;
const PAGE_MARGIN = 12;

function imageFormatFromUrl(url) {
    if (typeof url !== 'string') return 'PNG';
    if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg'))
        return 'JPEG';
    if (url.startsWith('data:image/png')) return 'PNG';
    if (url.startsWith('data:image/webp')) return 'WEBP';
    if (/\.jpe?g(\?|$)/i.test(url)) return 'JPEG';
    return 'PNG';
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
    });
}

async function captureElementPage(pdf, element, { isFirst = false } = {}) {
    const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    if (!isFirst) {
        pdf.addPage();
    }
    const imgW = A4_W_MM;
    const imgH = (canvas.height * imgW) / canvas.width;
    const height = Math.min(imgH, A4_H_MM);
    pdf.addImage(imgData, 'JPEG', 0, 0, imgW, height);
}

async function addImageAttachmentPage(pdf, file) {
    pdf.addPage();
    const label = file.filename || 'Attachment';
    pdf.setFontSize(10);
    pdf.setTextColor(40, 60, 90);
    pdf.text(label, PAGE_MARGIN, 14);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
        `Resolution attachment · ${file.fileTypeLabel || 'Image'}`,
        PAGE_MARGIN,
        20
    );

    try {
        const img = await loadImage(file.url);
        const maxW = A4_W_MM - PAGE_MARGIN * 2;
        const maxH = A4_H_MM - 32;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = PAGE_MARGIN + (maxW - w) / 2;
        const y = 26 + (maxH - h) / 2;
        const format = imageFormatFromUrl(file.url);
        if (format === 'WEBP') {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', x, y, w, h);
        } else {
            pdf.addImage(file.url, format, x, y, w, h);
        }
    } catch {
        pdf.setFontSize(9);
        pdf.text(
            'Image could not be embedded. Use the digital record for the original file.',
            PAGE_MARGIN,
            40
        );
    }
}

/**
 * Build one combined A4 PDF: page 1 summary + one page per attachment.
 */
export async function downloadClosureReportPdf({
    summaryElement,
    attachmentElements = [],
    imageAttachments = [],
    filename
}) {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    if (summaryElement) {
        await captureElementPage(pdf, summaryElement, { isFirst: true });
    }

    const count = Math.max(
        attachmentElements.length,
        imageAttachments.length
    );

    for (let i = 0; i < count; i += 1) {
        const file = imageAttachments[i];
        const element = attachmentElements[i];
        if (file?.kind === 'image' && file?.url) {
            await addImageAttachmentPage(pdf, file);
        } else if (element) {
            await captureElementPage(pdf, element);
        }
    }

    pdf.save(filename);
}

export { A4_W_MM, A4_H_MM };