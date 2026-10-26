import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { complaintsApi } from '../api/client.js';
import { complaintSubject } from '../utils/complaintTitle.js';
import { complaintAccessLabel } from '../utils/complaintAccess.js';
import { getStaffRoleLabel } from '../utils/staffRoles.js';
import { ImagePreview } from '../components/ImagePreview.jsx';
import '../styles/complaint-letter.css';

const STATUS_LABELS = {
    submitted: 'Submitted',
    pending: 'Pending',
    accepted: 'Accepted',
    assigned: 'Assigned',
    rejected: 'Rejected',
    resolved: 'Resolved',
    escalated: 'Escalated',
    reopened: 'Reopened',
    withdrawn: 'Withdrawn'
};

function escapeText(value) {
    return value == null ? '' : String(value);
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dataUrlSize(url) {
    if (typeof url !== 'string' || !url.startsWith('data:')) return '';
    const comma = url.indexOf(',');
    if (comma < 0) return '';
    const body = url.slice(comma + 1);
    const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
    return formatBytes(Math.floor((body.length * 3) / 4) - padding);
}

function fileNameFromUrl(url, index) {
    if (typeof url !== 'string') return `attachment-${index + 1}`;
    if (url.startsWith('data:')) {
        const type = url.slice(5, url.indexOf(';')) || 'file';
        const ext = type.split('/')[1] || 'bin';
        return `attachment-${index + 1}.${ext}`;
    }
    const part = url.split('/').pop() || `attachment-${index + 1}`;
    return decodeURIComponent(part.split('?')[0]);
}

function isImageSource(url, fileType = '') {
    if (fileType.startsWith('image/')) return true;
    if (typeof url !== 'string') return false;
    return url.startsWith('data:image/') || /\.(png|jpe?g|gif|webp)$/i.test(url);
}

function statusLabel(status) {
    const key = String(status || '').toLowerCase();
    return STATUS_LABELS[key] || (status ? String(status) : '');
}

function recipientLines(complaint) {
    const assignee = complaint?.currentAssignee;
    const named = assignee && typeof assignee === 'object' ? assignee : null;
    const department = complaint?.department || '';
    const lines = [];
    if (named?.name) {
        lines.push(named.name);
        const designation = getStaffRoleLabel(named.role);
        if (designation) lines.push(designation);
        if (named.department || department) {
            lines.push(named.department || department);
        }
    } else if (department) {
        lines.push(`${department} Department`);
    } else {
        lines.push('Responsible department');
    }
    lines.push('University Complaint Management System');
    return lines;
}

function detailRows(complaint) {
    const assignee = complaint?.currentAssignee;
    const officer =
        assignee && typeof assignee === 'object' && assignee.name
            ? [assignee.name, getStaffRoleLabel(assignee.role)]
                  .filter(Boolean)
                  .join(', ')
            : '';
    const rows = [
        ['Complaint ID', complaint?.publicId || ''],
        ['Complaint title', complaintSubject(complaint?.title)],
        ['Category', complaint?.category],
        ['Current status', statusLabel(complaint?.status)],
        ['Date of submission', formatDateTime(complaint?.createdAt || complaint?.Date)],
        ['Last updated', formatDateTime(complaint?.updatedAt)],
        ['Assigned department', complaint?.department],
        ['Assigned officer', officer],
        ['Location', complaint?.location],
        [
            'Expected resolution date',
            formatDateTime(complaint?.deadline)
        ],
        [
            'Complaint type',
            complaintAccessLabel(complaint)
        ],
    ];
    return rows.filter(([, value]) => escapeText(value).trim());
}

function attachmentItems(complaint) {
    const images = (complaint?.images || []).map((url, index) => ({
        url,
        filename: fileNameFromUrl(url, index),
        fileType: '',
        size: dataUrlSize(url)
    }));
    const files = (complaint?.attachments || []).map((file, index) => ({
        url: file.url,
        filename: file.filename || fileNameFromUrl(file.url, index),
        fileType: file.fileType || '',
        size: dataUrlSize(file.url)
    }));
    return [...images, ...files].filter((file) => file.url || file.filename);
}

export function ComplaintLetterPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [complaint, setComplaint] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [hiddenImages, setHiddenImages] = useState({});
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const res = await complaintsApi.getById(id);
                if (!cancelled) setComplaint(res.complaint || null);
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'Unable to open this complaint letter');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return <p className="letter-status">Preparing complaint letter…</p>;
    }

    if (error || !complaint) {
        return (
            <div className="letter-status">
                <p>{error || 'Complaint not found'}</p>
                <button type="button" onClick={() => navigate(-1)}>
                    Back
                </button>
            </div>
        );
    }

    const profile = complaint.studentProfile || {};
    const raisedBy =
        complaint.raisedBy && typeof complaint.raisedBy === 'object'
            ? complaint.raisedBy
            : null;
    const studentName = profile.name || complaint.raisedByName || raisedBy?.name || '';
    const roll = profile.rollNumber || raisedBy?.rollNumber || '';
    const branch = profile.department || raisedBy?.department || '';
    const semester = profile.semester ?? '';
    const section = profile.section || '';
    const programme = profile.programme || '';
    const files = attachmentItems(complaint);
    const members = (complaint.participants || []).filter(
        (person) =>
            String(person.student?._id || person.student || '') !==
            String(complaint.raisedBy?._id || complaint.raisedBy || '')
    );
    const rows = detailRows(complaint);

    return (
        <div className="letter-screen">
            <div className="letter-toolbar">
                <button type="button" onClick={() => navigate(-1)}>
                    Back
                </button>
                <button type="button" onClick={() => window.print()}>
                    Print / Save as PDF
                </button>
            </div>
            <article className="letter-sheet">
                <header className="letter-head">
                    <div className="letter-brand">
                        <span className="letter-mark" aria-hidden>SB</span>
                        <div>
                            <strong>University Complaint Management System</strong>
                            <span>Complaint record</span>
                        </div>
                    </div>
                </header>

                <h1>COMPLAINT LETTER</h1>
                <p className="letter-subtitle">
                    Generated from the University Complaint Management System
                </p>

                <div className="letter-meta">
                    <p>
                        <span>Date</span>
                        <strong>{formatDate(new Date())}</strong>
                    </p>
                    <p>
                        <span>Reference No.</span>
                        <strong>{complaint.publicId || '—'}</strong>
                    </p>
                </div>

                <section className="letter-to">
                    <span>To,</span>
                    {recipientLines(complaint).map((line, index) => (
                        <strong key={`${line}-${index}`}>{line}</strong>
                    ))}
                </section>

                <p className="letter-subject">
                    Subject: Complaint Regarding {complaintSubject(complaint.title) || 'a registered complaint'}
                </p>

                <p className="letter-greeting">Dear Sir/Madam,</p>
                <p className="letter-intro">
                    This letter records a complaint registered in the University Complaint Management System.
                </p>

                <section>
                    <h2>Complaint Details</h2>
                    <table>
                        <tbody>
                            {Array.from({ length: Math.ceil(rows.length / 2) }, (_, index) => {
                                const left = rows[index * 2];
                                const right = rows[index * 2 + 1];
                                return (
                                    <tr key={left[0]}>
                                        <th scope="row">{left[0]}</th>
                                        <td>{left[1]}</td>
                                        {right ? (
                                            <>
                                                <th scope="row">{right[0]}</th>
                                                <td>{right[1]}</td>
                                            </>
                                        ) : (
                                            <>
                                                <th />
                                                <td />
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>

                <section>
                    <h2>Description of the Complaint</h2>
                    <p className="letter-description">
                        {complaint.description || 'No description was recorded.'}
                    </p>
                </section>

                <section>
                    <h2>Attachments</h2>
                    {files.length === 0 ? (
                        <p className="letter-muted">No attachments submitted.</p>
                    ) : (
                        <ul className="letter-files">
                            {files.slice(0, 3).map((file) => (
                                <li key={`${file.filename}-${file.url}`}>
                                    {isImageSource(file.url, file.fileType) &&
                                    !hiddenImages[file.url] ? (
                                        <button
                                            type="button"
                                            className="letter-preview-btn"
                                            onClick={() => setPreview(file)}
                                            aria-label={`Preview ${file.filename}`}
                                        >
                                            <img
                                                src={file.url}
                                                alt=""
                                                onError={() =>
                                                    setHiddenImages((current) => ({
                                                        ...current,
                                                        [file.url]: true
                                                    }))
                                                }
                                            />
                                        </button>
                                    ) : null}
                                    <span>{file.filename}</span>
                                </li>
                            ))}
                            {files.length > 3 ? (
                                <li className="letter-more">+{files.length - 3} more</li>
                            ) : null}
                        </ul>
                    )}
                </section>

                {members.length > 0 ? (
                    <section>
                        <h2>Members</h2>
                        <p className="letter-members">
                            {members
                                .slice(0, 4)
                                .map(
                                    (person) =>
                                        `${person.name || person.student?.name || 'Member'}${
                                            person.rollNumber || person.student?.rollNumber
                                                ? ` (${person.rollNumber || person.student.rollNumber})`
                                                : ''
                                        }`
                                )
                                .join(', ')}
                            {members.length > 4 ? `, and ${members.length - 4} more` : ''}
                        </p>
                    </section>
                ) : null}

                <p>Thank you for your attention to this matter.</p>
                <p className="letter-signoff">Yours faithfully,</p>
                <div className="letter-signature" aria-hidden />
                {studentName ? <p className="letter-name">{studentName}</p> : null}
                <ul className="letter-identity">
                    {programme ? <li>{programme}</li> : null}
                    {branch ? <li>{branch}</li> : null}
                    {roll ? <li>URN: {roll}</li> : null}
                    {semester !== '' && semester != null ? (
                        <li>
                            Semester: {semester}
                            {section ? ` | Section: ${section}` : ''}
                        </li>
                    ) : section ? (
                        <li>Section: {section}</li>
                    ) : null}
                </ul>
            </article>
            <ImagePreview file={preview} onClose={() => setPreview(null)} />
        </div>
    );
}
