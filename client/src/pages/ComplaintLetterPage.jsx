import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { complaintsApi } from '../api/client.js';
import { complaintPublicId } from '../utils/complaintPublicId.js';
import {
    buildClosureReportModel,
    fileTypeLabel,
    isClosureReportAvailable
} from '../utils/complaintClosureReport.js';
import { downloadClosureReportPdf } from '../utils/closureReportPdf.js';
import { ComplaintNoticeLetter } from '../components/ComplaintNoticeLetter.jsx';
import '../styles/complaint-letter.css';

function CompactField({ label, value }) {
    const text = (value ?? '').toString().trim();
    if (!text) return null;
    return (
        <tr>
            <th scope="row">{label}</th>
            <td>{text}</td>
        </tr>
    );
}

const AttachmentSheet = forwardRef(function AttachmentSheet(
    { file, index, total },
    ref
) {
    const type = fileTypeLabel(file.fileType);
    return (
        <section
            ref={ref}
            className="closure-page closure-page--attachment"
            data-attachment-index={index}
            aria-label={`Attachment ${index + 1} of ${total}`}
        >
            <header className="closure-attach-sheet__head">
                <span className="closure-attach-sheet__brand">UCMS</span>
                <span className="closure-attach-sheet__index">
                    Attachment {index + 1} of {total}
                </span>
            </header>
            <p className="closure-attach-sheet__meta">
                <strong>{file.filename}</strong>
                <span>{type}</span>
            </p>
            <div className="closure-attach-sheet__body">
                {file.kind === 'image' && file.url ? (
                    <img
                        src={file.url}
                        alt=""
                        className="closure-attach-sheet__image"
                    />
                ) : null}
                {file.kind === 'pdf' && file.url ? (
                    <iframe
                        title={file.filename}
                        src={file.url}
                        className="closure-attach-sheet__pdf"
                    />
                ) : null}
                {file.kind !== 'image' && file.kind !== 'pdf' ? (
                    <div className="closure-attach-sheet__fallback">
                        {file.kind === 'excel' ? (
                            <FileSpreadsheet size={48} aria-hidden />
                        ) : (
                            <FileText size={48} aria-hidden />
                        )}
                        <p>
                            Original document attached during resolution.
                            Open the digital complaint record to download this
                            file.
                        </p>
                        {file.url ? (
                            <a href={file.url} download={file.filename}>
                                Download original
                            </a>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </section>
    );
});

export function ComplaintLetterPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const summaryRef = useRef(null);
    const attachmentRefs = useRef([]);
    const [complaint, setComplaint] = useState(null);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [pdfBusy, setPdfBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const res = await complaintsApi.getById(id);
                if (!cancelled) {
                    setComplaint(res.complaint || null);
                    setLogs(res.logs || []);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'Unable to load complaint report');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    const closureMode =
        complaint && isClosureReportAvailable(complaint);

    useLayoutEffect(() => {
        if (!closureMode) return undefined;
        const el = summaryRef.current;
        if (!el) return undefined;
        el.style.setProperty('--summary-scale', '1');
        const limit = el.offsetHeight || 0;
        const content = el.scrollHeight;
        if (content > limit && limit > 0) {
            const scale = Math.max(0.82, limit / content);
            el.style.setProperty('--summary-scale', String(scale));
        }
        return undefined;
    }, [complaint, logs, loading, closureMode]);

    const handlePrint = () => {
        window.print();
    };

    const handleNoticeDownload = () => {
        const prevTitle = document.title;
        const ref = complaintPublicId(complaint) || id;
        document.title = `${ref}-complaint-letter`;
        window.print();
        window.setTimeout(() => {
            document.title = prevTitle;
        }, 400);
    };

    const handleDownloadPdf = async () => {
        if (!closureMode || !summaryRef.current || pdfBusy) return;
        setPdfBusy(true);
        setError('');
        try {
            const ref = complaintPublicId(complaint) || id;
            const files = buildClosureReportModel(
                complaint,
                logs
            ).resolutionAttachments;
            const elements = files.map(
                (_, i) => attachmentRefs.current[i]
            );
            await downloadClosureReportPdf({
                summaryElement: summaryRef.current,
                attachmentElements: elements,
                imageAttachments: files.map((f) => ({
                    ...f,
                    fileTypeLabel: fileTypeLabel(f.fileType)
                })),
                filename: `${ref}-resolution-closure-report.pdf`
            });
        } catch (err) {
            setError(err.message || 'PDF generation failed');
        } finally {
            setPdfBusy(false);
        }
    };

    if (loading) {
        return <p className="letter-status">Preparing document…</p>;
    }

    if (error && !complaint) {
        return (
            <div className="letter-status">
                <p>{error}</p>
                <button type="button" onClick={() => navigate(-1)}>
                    Back
                </button>
            </div>
        );
    }

    if (!complaint) {
        return (
            <div className="letter-status">
                <p>Complaint not found</p>
                <button type="button" onClick={() => navigate(-1)}>
                    Back
                </button>
            </div>
        );
    }

    if (!closureMode) {
        const publicId = complaintPublicId(complaint);
        return (
            <div className="letter-screen">
                <div className="letter-toolbar no-print">
                    <button type="button" onClick={() => navigate(-1)}>
                        Back
                    </button>
                    <button type="button" onClick={handlePrint}>
                        Print
                    </button>
                    <button
                        type="button"
                        className="letter-toolbar__primary"
                        onClick={handleNoticeDownload}
                    >
                        Print / Save as PDF
                    </button>
                </div>
                <ComplaintNoticeLetter
                    complaint={complaint}
                    publicId={publicId}
                />
            </div>
        );
    }

    const report = buildClosureReportModel(complaint, logs);
    const { complaint: c, complainant, processing, participants } = report;
    const attachments = report.resolutionAttachments;
    attachmentRefs.current = [];

    return (
        <div className="letter-screen closure-report-screen">
            {error ? (
                <p className="letter-status letter-status--inline no-print">
                    {error}
                </p>
            ) : null}
            <div className="letter-toolbar no-print">
                <button type="button" onClick={() => navigate(-1)}>
                    Back
                </button>
                <button type="button" onClick={handlePrint}>
                    Print
                </button>
                <button
                    type="button"
                    className="letter-toolbar__primary"
                    onClick={handleDownloadPdf}
                    disabled={pdfBusy}
                >
                    {pdfBusy ? 'Generating PDF…' : 'Download PDF'}
                </button>
            </div>

            <div className="closure-doc">
                <section
                    ref={summaryRef}
                    className="closure-page closure-page--summary letter-sheet"
                >
                    <header className="closure-summary__head">
                        <span className="letter-mark" aria-hidden>
                            SB
                        </span>
                        <div>
                            <strong>University Complaint Management System</strong>
                            <span>Official complaint record</span>
                    </div>
                </header>

                    <h1 className="closure-summary__title">
                        COMPLAINT RESOLUTION &amp; CLOSURE REPORT
                    </h1>

                    <div className="closure-summary__ids">
                        <p>
                            <span>Complaint ID</span>
                            <strong>{report.publicId}</strong>
                        </p>
                        <p className="closure-summary__status" role="status">
                            {report.statusBanner}
                    </p>
                    <p>
                            <span>Generated</span>
                            <strong>{report.generatedAt}</strong>
                    </p>
                </div>

                    <div className="closure-summary__columns">
                        <div className="closure-summary__col">
                            <h2>Complaint</h2>
                            <table className="closure-summary__table">
                        <tbody>
                                    <CompactField
                                        label="Submitted"
                                        value={c.submittedAt}
                                    />
                                    <CompactField
                                        label="Category"
                                        value={c.category}
                                    />
                                    <CompactField label="Type" value={c.type} />
                                    <CompactField
                                        label="Visibility"
                                        value={c.visibility}
                                    />
                                    <CompactField
                                        label="Department"
                                        value={c.department}
                                    />
                                    <CompactField label="Issue" value={c.issue} />
                                    <CompactField
                                        label="Location"
                                        value={c.location}
                                    />
                                    <CompactField
                                        label="Final status"
                                        value={c.finalStatus}
                                    />
                        </tbody>
                    </table>
                            <h3>Description</h3>
                            <p className="closure-summary__text">
                                {c.description || '—'}
                            </p>
                            {c.title ? (
                                <>
                                    <h3>Subject</h3>
                                    <p className="closure-summary__text">
                                        {c.title}
                                    </p>
                                </>
                            ) : null}
                        </div>

                        <div className="closure-summary__col">
                            <h2>Complainant</h2>
                            <table className="closure-summary__table">
                                <tbody>
                                    <CompactField
                                        label="Name"
                                        value={complainant.name}
                                    />
                                    <CompactField
                                        label="URN / Roll"
                                        value={complainant.roll}
                                    />
                                    <CompactField
                                        label="Branch"
                                        value={complainant.branch}
                                    />
                                    <CompactField
                                        label="Semester"
                                        value={complainant.semester}
                                    />
                                    <CompactField
                                        label="Section"
                                        value={complainant.section}
                                    />
                                </tbody>
                            </table>
                            {participants.length > 0 ? (
                                <>
                                    <h3>Group members</h3>
                                    <p className="closure-summary__text closure-summary__text--compact">
                                        {participants
                                .map(
                                                (p) =>
                                                    `${p.name}${
                                                        p.roll
                                                            ? ` (${p.roll})`
                                                : ''
                                        }`
                                )
                                            .join('; ')}
                        </p>
                                </>
                ) : null}

                            <h2>Processing</h2>
                            <table className="closure-summary__table">
                                <tbody>
                                    <CompactField
                                        label="HOD accepted"
                                        value={processing.acceptedAt}
                                    />
                                    <CompactField
                                        label="Advisor"
                                        value={processing.advisor}
                                    />
                                    <CompactField
                                        label="Assign remarks"
                                        value={processing.assignRemarks}
                                    />
                                    <CompactField
                                        label="Escalated to"
                                        value={processing.escalatedTo}
                                    />
                                    <CompactField
                                        label="Escalation remarks"
                                        value={processing.escalateRemarks}
                                    />
                                    <CompactField
                                        label="Resolved"
                                        value={processing.resolvedAt}
                                    />
                                    <CompactField
                                        label="Resolved by"
                                        value={processing.resolvedBy}
                                    />
                                    <CompactField
                                        label="Closed"
                                        value={processing.closedAt}
                                    />
                                    <CompactField
                                        label="Closure"
                                        value={processing.closureDetails}
                                    />
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <h2 className="closure-summary__note-head">
                        Resolution note
                    </h2>
                    <p className="closure-summary__note">
                        {processing.resolutionNote || 'Not recorded.'}
                    </p>

                    <footer className="closure-summary__footer">
                        {attachments.length > 0
                            ? `${attachments.length} resolution attachment${
                                  attachments.length > 1 ? 's' : ''
                              } on separate page${
                                  attachments.length > 1 ? 's' : ''
                              }.`
                            : 'No resolution attachments.'}
                        <span>UCMS — Confidential</span>
                    </footer>
                </section>

                {attachments.map((file, index) => (
                    <AttachmentSheet
                        key={file.url || file.filename || index}
                        file={file}
                        index={index}
                        total={attachments.length}
                        ref={(node) => {
                            attachmentRefs.current[index] = node;
                        }}
                    />
                ))}
            </div>
        </div>
    );
}