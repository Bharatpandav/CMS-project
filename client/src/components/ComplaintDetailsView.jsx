import { useCallback, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Calendar,
    Copy,
    Download,
    Eye,
    EyeOff,
    FileText,
    LogOut,
    MapPin,
    Printer,
    Undo2,
    UserRound,
    Users
} from 'lucide-react';
import { complaintSubject } from '../utils/complaintTitle.js';
import { complaintPublicId } from '../utils/complaintPublicId.js';
import { complaintAccessLabel } from '../utils/complaintAccess.js';
import { complaintsApi } from '../api/client.js';
import { BackButton } from './BackButton.jsx';
import { Dialog } from './ui/Dialog.jsx';
import { ImagePreview } from './ImagePreview.jsx';

const STAGES = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'review', label: 'Under Review' },
    { key: 'progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' }
];

function formatWhen(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function stageIndexForStatus(status) {
    switch (status) {
        case 'pending':
        case 'submitted':
            return 0;
        case 'accepted':
            return 1;
        case 'assigned':
        case 'escalated':
        case 'reopened':
            return 2;
        case 'resolved':
            return 3;
        case 'rejected':
            return 4;
        case 'withdrawn':
            return 4;
        default:
            return 0;
    }
}

function logTimeForStage(logs, index, status) {
    const matchers = {
        0: ['submitted', 'pending'],
        1: ['accepted'],
        2: ['assigned', 'escalated', 'reopened'],
        3: ['resolved'],
        4: ['rejected', 'withdrawn']
    }[index] || [];
    const hit = logs.find(
        (log) =>
            matchers.includes(log.newStatus) ||
            matchers.includes(log.action)
    );
    if (hit?.createdAt) return hit.createdAt;
    if (index === 0 && status) return null;
    return null;
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
    return (
        url.startsWith('data:image/') ||
        /\.(png|jpe?g|gif|webp)$/i.test(url)
    );
}

export function ComplaintDetailsView({
    complaint,
    logs = [],
    backTo,
    backLabel,
    canRevealContact = false,
    currentUser = null,
    onMembershipChange
}) {
    const navigate = useNavigate();
    const [membershipBusy, setMembershipBusy] = useState(false);
    const [withdrawBusy, setWithdrawBusy] = useState(false);
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [withdrawError, setWithdrawError] = useState('');
    const withdrawTitleId = useId();
    const withdrawDescId = useId();
    const [membershipMessage, setMembershipMessage] = useState('');
    const [membershipError, setMembershipError] = useState('');
    const [copied, setCopied] = useState(false);
    const [contact, setContact] = useState(null);
    const [contactOpen, setContactOpen] = useState(false);
    const [contactError, setContactError] = useState('');
    const [contactBusy, setContactBusy] = useState(false);
    const [preview, setPreview] = useState(null);

    const profile = complaint?.studentProfile || {};
    const assignee = complaint?.currentAssignee;
    const displayId = complaintPublicId(complaint) || '—';
    const currentIndex = stageIndexForStatus(complaint?.status);
    const rejected = complaint?.status === 'rejected';
    const withdrawn = complaint?.status === 'withdrawn';

    const stageTimes = useMemo(
        () =>
            STAGES.map((stage, index) => {
                if (index === 0) {
                    return (
                        logTimeForStage(logs, 0) ||
                        complaint?.createdAt ||
                        complaint?.Date
                    );
                }
                if (index > currentIndex) return null;
                return logTimeForStage(logs, index);
            }),
        [logs, complaint, currentIndex]
    );

    const files = [
        ...(complaint?.images || []).map((url, index) => ({
            url,
            filename: fileNameFromUrl(url, index),
            fileType: ''
        })),
        ...(complaint?.attachments || []).map((file, index) => ({
            url: file.url,
            filename: file.filename || fileNameFromUrl(file.url, index),
            fileType: file.fileType || ''
        }))
    ];

    const userId = String(currentUser?.id || currentUser?._id || '');
    const isStudent = currentUser?.role === 'student';
    const isGroup = complaint?.complaintType === 'group';
    const isOpen = !['resolved', 'rejected', 'withdrawn'].includes(
        complaint?.status
    );
    const isCreator =
        String(complaint?.raisedBy?._id || complaint?.raisedBy || '') === userId;
    const isMember = (complaint?.participants || []).some((person) => {
        const sid = person.student?._id || person.student;
        return String(sid || '') === userId;
    });
    const canJoin =
        isStudent &&
        complaint?.visibility === 'public' &&
        isOpen &&
        !isCreator &&
        !isMember;
    const canLeave = isStudent && isMember && !isCreator;
    const canWithdraw =
        isStudent &&
        isCreator &&
        !['resolved', 'withdrawn'].includes(complaint?.status);

    const changeMembership = async (action) => {
        if (action === 'leave' && !window.confirm('Leave this complaint?')) {
            return;
        }
        setMembershipBusy(true);
        setMembershipError('');
        setMembershipMessage('');
        try {
            const data =
                action === 'join'
                    ? await complaintsApi.join(complaint._id)
                    : await complaintsApi.leave(complaint._id);
            setMembershipMessage(data.message || 'Membership updated');
            await onMembershipChange?.();
        } catch (err) {
            setMembershipError(err.message || 'Membership update failed');
        } finally {
            setMembershipBusy(false);
        }
    };

    const closeWithdraw = useCallback(() => {
        if (!withdrawBusy) setWithdrawOpen(false);
    }, [withdrawBusy]);

    const withdrawComplaint = async () => {
        setWithdrawBusy(true);
        setWithdrawError('');
        try {
            const data = await complaintsApi.withdraw(complaint._id);
            setWithdrawOpen(false);
            setMembershipMessage(data.message || 'Complaint withdrawn');
            await onMembershipChange?.();
        } catch (err) {
            setWithdrawError(err.message || 'Unable to withdraw this complaint');
        } finally {
            setWithdrawBusy(false);
        }
    };

    const copyId = async () => {
        try {
            await navigator.clipboard.writeText(complaintPublicId(complaint));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    };

    const revealContact = async () => {
        if (contactOpen) {
            setContactOpen(false);
            return;
        }
        setContactBusy(true);
        setContactError('');
        try {
            const data = await complaintsApi.getContact(complaint._id);
            setContact(data.contact);
            setContactOpen(true);
        } catch (err) {
            setContactError(err.message || 'Unable to reveal contact details');
        } finally {
            setContactBusy(false);
        }
    };

    const email = contactOpen ? contact?.email : profile.email;
    const phone = contactOpen ? contact?.phone : profile.phone;

    return (
        <div className="cdetail">
            <div className="cdetail__top">
                <div>
                    <BackButton fallbackTo={backTo} label={`Back to ${backLabel}`} />
                    <h1>Complaint Details</h1>
                </div>
                <div className="cdetail__actions">
                    {canWithdraw ? (
                        <button
                            type="button"
                            className="cdetail__btn cdetail__btn--danger cms-btn-reflect"
                            disabled={withdrawBusy}
                            onClick={() => {
                                setWithdrawError('');
                                setWithdrawOpen(true);
                            }}
                        >
                            <Undo2 size={16} aria-hidden />
                            {withdrawBusy ? 'Please wait…' : 'Withdraw'}
                        </button>
                    ) : null}
                    {canJoin || canLeave ? (
                        <button
                            type="button"
                            className="cdetail__btn cdetail__btn--ghost cms-btn-reflect"
                            disabled={membershipBusy}
                            onClick={() =>
                                changeMembership(canLeave ? 'leave' : 'join')
                            }
                        >
                            {canLeave ? (
                                <LogOut size={16} aria-hidden />
                            ) : (
                                <Users size={16} aria-hidden />
                            )}
                            {membershipBusy
                                ? 'Please wait…'
                                : canLeave
                                  ? 'Leave Complaint'
                                  : 'Join Now'}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className="cdetail__btn cdetail__btn--primary cms-btn-reflect"
                        onClick={() =>
                            navigate(`/complaints/${complaint._id}/letter`)
                        }
                    >
                        <Printer size={16} aria-hidden />
                        Print / Download
                    </button>
                </div>
            </div>

            {withdrawError && !withdrawOpen ? (
                <p className="form-error" role="alert">{withdrawError}</p>
            ) : null}
            {membershipError ? (
                <p className="form-error" role="alert">{membershipError}</p>
            ) : null}
            {membershipMessage ? (
                <p className="form-success" role="status">{membershipMessage}</p>
            ) : null}

            <section className="cdetail__summary">
                <div>
                    <span className="cdetail__label">Complaint ID</span>
                    <p className="cdetail__id">
                        <span>{displayId}</span>
                        <button type="button" onClick={copyId} aria-label="Copy complaint ID">
                            <Copy size={14} aria-hidden />
                        </button>
                        {copied ? <em>Copied</em> : null}
                    </p>
                    <div className="cdetail__field">
                        <span className="cdetail__label">Category</span>
                        <strong>{complaint?.category || '—'}</strong>
                    </div>
                </div>
                <div>
                    <span className="cdetail__label">Status</span>
                    <p className={`cdetail__status cdetail__status--${complaint?.status || 'submitted'}`}>
                        {rejected
                            ? 'Rejected'
                            : withdrawn
                              ? 'Withdrawn'
                              : complaint?.status || '—'}
                    </p>
                    <div className="cdetail__field">
                        <span className="cdetail__label">
                            <Calendar size={14} aria-hidden />
                            Date of submission
                        </span>
                        <strong>{formatWhen(complaint?.createdAt || complaint?.Date) || '—'}</strong>
                    </div>
                    <div className="cdetail__field">
                        <span className="cdetail__label">Last updated</span>
                        <strong>{formatWhen(complaint?.updatedAt) || '—'}</strong>
                    </div>
                </div>
                <div>
                    <span className="cdetail__label">Assigned department</span>
                    <p className="cdetail__strong">
                        <Building2 size={16} aria-hidden />
                        <span>{complaint?.department || '—'}</span>
                    </p>
                    <div className="cdetail__field">
                        <span className="cdetail__label">
                            <UserRound size={14} aria-hidden />
                            Assigned to
                        </span>
                        <strong>
                            {assignee?.name || 'Not assigned'}
                            {assignee?.role ? ` · ${assignee.role}` : ''}
                        </strong>
                    </div>
                    <div className="cdetail__field">
                        <span className="cdetail__label">Expected resolution</span>
                        <strong>{formatWhen(complaint?.deadline) || 'Not scheduled'}</strong>
                    </div>
                </div>
            </section>

            <ol className="cdetail__timeline" aria-label="Complaint progress">
                {STAGES.map((stage, index) => {
                    const done = index < currentIndex;
                    const current = index === currentIndex;
                    const label =
                        rejected && index === 4
                            ? 'Rejected'
                            : withdrawn && index === 4
                              ? 'Withdrawn'
                              : stage.label;
                    return (
                        <li
                            key={stage.key}
                            className={
                                done
                                    ? 'is-done'
                                    : current
                                      ? 'is-current'
                                      : 'is-upcoming'
                            }
                        >
                            <span className="cdetail__dot" aria-hidden />
                            <strong>{label}</strong>
                            {stageTimes[index] && (done || current) ? (
                                <small>{formatWhen(stageTimes[index])}</small>
                            ) : null}
                        </li>
                    );
                })}
            </ol>

            <div className="cdetail__grid">
                <div>
                    <article className="cdetail__card">
                        <h2>
                            <FileText size={16} aria-hidden />
                            Complaint Description
                        </h2>
                        <h3>{complaintSubject(complaint?.title)}</h3>
                        <p className="cdetail__body">{complaint?.description}</p>
                        <div className="cdetail__facts">
                            <p>
                                <MapPin size={14} aria-hidden />
                                <span>Location</span>
                                <strong>{complaint?.location || 'Not provided'}</strong>
                            </p>
                            <p>
                                <span>Reported issue</span>
                                <strong>{complaint?.category || '—'}</strong>
                            </p>
                        </div>
                    </article>

                    <article className="cdetail__card">
                        <h2>Attachments ({files.length})</h2>
                        {files.length === 0 ? (
                            <p className="cdetail__empty">No attachments available.</p>
                        ) : (
                            <ul className="cdetail__files">
                                {files.map((file) => {
                                    const image = isImageSource(file.url, file.fileType);
                                    return (
                                        <li key={file.url}>
                                            {image ? (
                                                <button
                                                    type="button"
                                                    className="cdetail__thumb"
                                                    onClick={() => setPreview(file)}
                                                    aria-label={`Preview ${file.filename}`}
                                                >
                                                    <img src={file.url} alt="" />
                                                </button>
                                            ) : (
                                                <span className="cdetail__file-icon" aria-hidden>
                                                    <FileText size={18} />
                                                </span>
                                            )}
                                            {image ? (
                                                <button
                                                    type="button"
                                                    className="cdetail__filename cdetail__filename--preview"
                                                    onClick={() => setPreview(file)}
                                                >
                                                    {file.filename}
                                                </button>
                                            ) : (
                                                <span className="cdetail__filename">{file.filename}</span>
                                            )}
                                            <a href={file.url} download={file.filename}>
                                                <Download size={14} aria-hidden />
                                                Download
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </article>
                </div>

                <div>
                    <article className="cdetail__card">
                        <h2>
                            <UserRound size={16} aria-hidden />
                            Complainant details
                            {canRevealContact ? (
                                <button
                                    type="button"
                                    className="cdetail__eye"
                                    onClick={revealContact}
                                    disabled={contactBusy}
                                    aria-label={
                                        contactOpen
                                            ? 'Hide contact details'
                                            : 'Reveal contact details'
                                    }
                                >
                                    {contactOpen ? (
                                        <EyeOff size={16} aria-hidden />
                                    ) : (
                                        <Eye size={16} aria-hidden />
                                    )}
                                </button>
                            ) : null}
                        </h2>
                        {contactError ? (
                            <p className="form-error" role="alert">{contactError}</p>
                        ) : null}
                        <dl className="cdetail__pairs">
                            <div><dt>Name</dt><dd>{profile.name || complaint?.raisedByName || '—'}</dd></div>
                            <div><dt>URN / Roll number</dt><dd>{profile.rollNumber || '—'}</dd></div>
                            <div><dt>Branch</dt><dd>{profile.department || '—'}</dd></div>
                            <div><dt>Semester</dt><dd>{profile.semester ?? '—'}</dd></div>
                            <div><dt>Section</dt><dd>{profile.section || '—'}</dd></div>
                            {email ? <div><dt>Email</dt><dd>{email}</dd></div> : null}
                            {phone ? <div><dt>Phone</dt><dd>{phone}</dd></div> : null}
                        </dl>
                    </article>

                    {(complaint.participants || []).length > 0 ? (
                        <article className="cdetail__card">
                            <h2>
                                <Users size={16} aria-hidden />
                                {isGroup ? 'Group Members' : 'Members'}
                                <span className="cdetail__count">
                                    {complaint.participants?.length || 0}
                                </span>
                            </h2>
                            {(complaint.participants || []).length === 0 ? (
                                <p className="cdetail__empty">No members yet.</p>
                            ) : (
                                <ul className="cdetail__members">
                                    {complaint.participants.map((person, index) => {
                                        const sid = String(
                                            person.student?._id || person.student || ''
                                        );
                                        const raisedId = String(
                                            complaint.raisedBy?._id ||
                                                complaint.raisedBy ||
                                                ''
                                        );
                                        const memberRole =
                                            sid && sid === raisedId
                                                ? 'Complainant'
                                                : 'Member';
                                        const name =
                                            person.name ||
                                            person.student?.name ||
                                            'Member';
                                        const branch =
                                            person.student?.department ||
                                            person.department ||
                                            '—';
                                        const semester =
                                            person.student?.semester ?? '—';
                                        const roll =
                                            person.rollNumber ||
                                            person.student?.rollNumber ||
                                            '—';
                                        return (
                                            <li key={sid || roll || index}>
                                                <span className="cdetail__avatar" aria-hidden>
                                                    {name.charAt(0).toUpperCase()}
                                                </span>
                                                <span>
                                                    <strong>{name}</strong>
                                                    <small>
                                                        {branch}
                                                        {semester !== '—'
                                                            ? ` · Sem ${semester}`
                                                            : ''}
                                                        {person.student?.section
                                                            ? ` · ${person.student.section}`
                                                            : ''}
                                                        {` · ${roll}`}
                                                    </small>
                                                </span>
                                                <em>{memberRole}</em>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </article>
                    ) : null}

                    <article className="cdetail__card">
                        <h2>Additional information</h2>
                        <dl className="cdetail__pairs">
                            <div>
                                <dt>Type and visibility</dt>
                                <dd>{complaintAccessLabel(complaint)}</dd>
                            </div>
                            <div>
                                <dt>Current level</dt>
                                <dd>{complaint?.currentLevel || '—'}</dd>
                            </div>
                        </dl>
                    </article>
                </div>
            </div>
            <Dialog
                open={withdrawOpen}
                onClose={closeWithdraw}
                titleId={withdrawTitleId}
                descId={withdrawDescId}
                className="cdetail-confirm"
                backdropClassName="cdetail-confirm-backdrop"
                closeLabel="Close confirmation"
            >
                <div className="cdetail-confirm__mark" aria-hidden>
                    <Undo2 size={22} />
                </div>
                <h2 id={withdrawTitleId} className="cdetail-confirm__title">
                    Withdraw complaint
                </h2>
                <p id={withdrawDescId} className="cdetail-confirm__text">
                    Are you sure you want to withdraw this complaint?
                </p>
                <p className="cdetail-confirm__note">
                    This closes the complaint and removes it from public lists.
                    You can still find it in My Complaints.
                </p>
                {withdrawError ? (
                    <p className="form-error" role="alert">{withdrawError}</p>
                ) : null}
                <div className="cdetail-confirm__actions">
                    <button
                        type="button"
                        className="cdetail__btn cdetail-confirm__cancel cms-btn-reflect"
                        disabled={withdrawBusy}
                        onClick={closeWithdraw}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="cdetail__btn cdetail-confirm__submit cms-btn-reflect"
                        disabled={withdrawBusy}
                        onClick={withdrawComplaint}
                    >
                        {withdrawBusy ? 'Please wait…' : 'Withdraw'}
                    </button>
                </div>
            </Dialog>
            <ImagePreview file={preview} onClose={() => setPreview(null)} />
        </div>
    );
}
