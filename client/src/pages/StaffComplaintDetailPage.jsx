import { useCallback, useEffect, useId, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
    ArrowUpRight,
    CheckCircle2,
    UserPlus
} from 'lucide-react';
import { ComplaintDetailsView } from '../components/ComplaintDetailsView.jsx';
import { ComplaintRejectionModal } from '../components/ComplaintRejectionModal.jsx';
import { ComplaintCloseModal } from '../components/ComplaintCloseModal.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StaffComplaintActionModal } from '../components/StaffComplaintActionModal.jsx';
import { StaffActionField } from '../components/StaffComplaintActionCard.jsx';
import { isSafeInternalPath, resolveComplaintsListPath } from '../utils/navigationPaths.js';
import '../styles/complaint-detail.css';
import { ActionAttachmentUpload } from '../components/ActionAttachmentUpload.jsx';
import { complaintsApi, staffApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { serializeActionFilesForApi } from '../utils/complaintActionFiles.js';
import { notifyComplaintsDataChanged } from '../utils/complaintSync.js';
import { useComplaintsDataSync } from '../hooks/useComplaintsDataSync.js';

export function StaffComplaintDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const location = useLocation();
    const assignSelectId = useId();
    const assignRemarksId = useId();
    const escalateSelectId = useId();
    const escalateRemarksId = useId();
    const resolveNoteId = useId();

    const listPath = resolveComplaintsListPath(
        user?.role,
        location.pathname
    );
    const from = location.state?.from;
    const backTo =
        typeof from === 'string' && isSafeInternalPath(from)
            ? from
            : listPath;

    const [data, setData] = useState(null);
    const [canRevealContact, setCanRevealContact] = useState(false);
    const [assignable, setAssignable] = useState([]);
    const [escalationTargets, setEscalationTargets] = useState([]);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [modalError, setModalError] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [workflowModal, setWorkflowModal] = useState(null);

    const [assignRemarks, setAssignRemarks] = useState('');
    const [escalateRemarks, setEscalateRemarks] = useState('');
    const [resolveRemarks, setResolveRemarks] = useState('');
    const [assignToId, setAssignToId] = useState('');
    const [escalateToId, setEscalateToId] = useState('');
    const [rejectOpen, setRejectOpen] = useState(false);
    const [closeOpen, setCloseOpen] = useState(false);
    const [closeError, setCloseError] = useState('');
    const [assignFiles, setAssignFiles] = useState([]);
    const [escalateFiles, setEscalateFiles] = useState([]);
    const [resolveFiles, setResolveFiles] = useState([]);

    const role = user?.role;
    const isHod = role === 'hod';

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
        setLoading(true);
        setError('');
        }
        try {
            const res = await complaintsApi.getById(id);
            setData(res);
            setCanRevealContact(Boolean(res.canRevealContact));
            const dept = res.complaint?.department;
            if (
                dept &&
                (role === 'hod' || role === 'dean')
            ) {
                try {
                    const assignRes =
                        await staffApi.getAssignableUsers(dept);
                    const users = assignRes.users || [];
                    setAssignable(
                        role === 'hod'
                            ? users.filter((u) => u.role === 'advisor')
                            : role === 'dean'
                              ? users.filter((u) => u.role === 'hod')
                              : users
                    );
                } catch {
                    setAssignable([]);
                }
                if (role === 'hod' || role === 'dean') {
                    try {
                        const escRes =
                            await staffApi.getEscalationTargets(dept);
                        setEscalationTargets(escRes.users || []);
                    } catch {
                        setEscalationTargets([]);
                    }
                }
            }
        } catch (err) {
            if (!silent) {
            setError(err.message || 'Failed to load complaint');
            }
        } finally {
            if (!silent) {
            setLoading(false);
            }
        }
    }, [id, role]);

    useEffect(() => {
        load();
    }, [load]);

    useComplaintsDataSync(() => load({ silent: true }), Boolean(id));

    useEffect(() => {
        if (escalationTargets.length === 1) {
            setEscalateToId(escalationTargets[0]._id);
        }
    }, [escalationTargets]);

    useEffect(() => {
        const status = data?.complaint?.status;
        const locked =
            status === 'submitted' ||
            status === 'pending' ||
            (role === 'hod' &&
                ['assigned', 'escalated', 'resolved', 'rejected', 'withdrawn'].includes(
                    status
                ));
        if (locked) {
            setWorkflowModal(null);
        }
    }, [data?.complaint?.status, role]);

    const resetAssignFields = () => {
        setAssignRemarks('');
        setAssignToId('');
        setAssignFiles([]);
    };

    const resetEscalateFields = () => {
        setEscalateRemarks('');
        setEscalateFiles([]);
        if (escalationTargets.length !== 1) {
            setEscalateToId('');
        }
    };

    const resetResolveFields = () => {
        setResolveRemarks('');
        setResolveFiles([]);
    };

    const openWorkflowModal = (key) => {
        setModalError('');
        setActionError('');
        setWorkflowModal(key);
    };

    const closeWorkflowModal = () => {
        if (submitting) return;
        if (workflowModal === 'assign') resetAssignFields();
        if (workflowModal === 'escalate') resetEscalateFields();
        if (workflowModal === 'resolve') resetResolveFields();
        setModalError('');
        setWorkflowModal(null);
    };

    const runModalAction = async (fn) => {
        setModalError('');
        setActionError('');
        setSubmitting(true);
        try {
            const result = await fn();
            if (result?.complaint) {
                setData((prev) =>
                    prev
                        ? {
                              ...prev,
                              complaint: {
                                  ...prev.complaint,
                                  ...result.complaint
                              }
                          }
                        : prev
                );
            }
            setActionSuccess('Action completed successfully.');
            setWorkflowModal(null);
            resetAssignFields();
            resetEscalateFields();
            resetResolveFields();
            notifyComplaintsDataChanged({
                complaintId: id,
                status: result?.complaint?.status
            });
            await load({ silent: true });
        } catch (err) {
            const message = err.message || 'Action failed';
            setModalError(message);
            setActionError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const runAction = async (fn) => {
        setActionError('');
        setActionSuccess('');
        setSubmitting(true);
        try {
            const result = await fn();
            if (result?.complaint) {
                setData((prev) =>
                    prev
                        ? {
                              ...prev,
                              complaint: {
                                  ...prev.complaint,
                                  ...result.complaint
                              }
                          }
                        : prev
                );
            }
            setActionSuccess('Action completed successfully.');
            notifyComplaintsDataChanged({
                complaintId: id,
                status: result?.complaint?.status
            });
            await load({ silent: true });
        } catch (err) {
            setActionError(err.message || 'Action failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectConfirm = async (payload) => {
        setActionError('');
        setActionSuccess('');
        setSubmitting(true);
        try {
            await complaintsApi.updateStatus(id, {
                action: 'rejected',
                ...payload
            });
            setRejectOpen(false);
            setActionSuccess('Action completed successfully.');
            await load();
        } catch (err) {
            setActionError(err.message || 'Action failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssignConfirm = () => {
        if (!assignToId) {
            setModalError('Select an advisor.');
            return;
        }
        runModalAction(() =>
            complaintsApi.assign(id, {
                assignToId,
                remarks: assignRemarks.trim(),
                attachments: serializeActionFilesForApi(assignFiles)
            })
        );
    };

    const handleEscalateConfirm = () => {
        if (
            (role === 'hod' || role === 'dean') &&
            escalationTargets.length > 0 &&
            !escalateToId
        ) {
            setModalError('Select the escalation recipient.');
            return;
        }
        runModalAction(() =>
            complaintsApi.escalate(id, {
                remarks: escalateRemarks.trim(),
                escalateToId: escalateToId || undefined,
                attachments: serializeActionFilesForApi(escalateFiles)
            })
        );
    };

    const handleResolveConfirm = () => {
        if (!resolveRemarks.trim()) {
            setModalError('Resolution note is required.');
            return;
        }
        runModalAction(() =>
            complaintsApi.resolve(id, {
                remarks: resolveRemarks.trim(),
                attachments: serializeActionFilesForApi(resolveFiles)
            })
        );
    };

    const handleCloseConfirm = async () => {
        setCloseError('');
        setSubmitting(true);
        try {
            const result = await complaintsApi.close(id);
            setCloseOpen(false);
            setActionSuccess('Complaint closed successfully.');
            notifyComplaintsDataChanged({
                complaintId: id,
                status: result?.complaint?.status || 'closed'
            });
            await load({ silent: true });
        } catch (err) {
            setCloseError(err.message || 'Failed to close complaint');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <p className="panel__loading">Loading complaint…</p>;
    }

    if (error) {
        return (
            <div className="page-error">
                <p>{error}</p>
                <PageHeader
                    back={{ fallbackTo: listPath, label: 'Complaints' }}
                />
            </div>
        );
    }

    const c = data?.complaint;
    const logs = data?.logs || [];
    const terminal = ['resolved', 'closed', 'rejected', 'withdrawn'].includes(
        c?.status
    );
    const awaitingAcceptance =
        c?.status === 'submitted' || c?.status === 'pending';
    const workflowUnlocked = !terminal && !awaitingAcceptance;

    const canAcceptReject =
        awaitingAcceptance &&
        ['advisor', 'hod', 'dean', 'super_admin'].includes(role);
    const canAssign =
        workflowUnlocked && (role === 'hod' || role === 'dean');
    const canEscalate =
        workflowUnlocked && (role === 'hod' || role === 'dean');
    const canResolve =
        workflowUnlocked &&
        ['advisor', 'hod', 'dean', 'super_admin'].includes(role);

    const advisorActionStage =
        role === 'advisor' &&
        (c?.status === 'assigned' || c?.status === 'escalated');

    const hodWorkflowLauncherStage =
        role === 'hod' &&
        (c?.status === 'accepted' || c?.status === 'reopened');

    const nonHodWorkflowStage =
        role !== 'hod' && role !== 'advisor' && workflowUnlocked;

    const showWorkflowLaunchers =
        (hodWorkflowLauncherStage ||
            nonHodWorkflowStage ||
            advisorActionStage) &&
        (canAssign || canEscalate || canResolve);

    const escalateLaunchLabel =
        role === 'hod' ? 'Escalate complaint' : 'Escalate complaint';

    const userId = String(user?.id || user?._id || '');
    const authorizedCloseId = String(
        c?.closureAuthorizedHod?._id ||
            c?.closureAuthorizedHod ||
            c?.assignedBy?._id ||
            c?.assignedBy ||
            ''
    );
    const canCloseComplaint =
        role === 'hod' &&
        c?.status === 'resolved' &&
        authorizedCloseId &&
        authorizedCloseId === userId;

    return (
        <div className="page-stack">
            <ComplaintDetailsView
                complaint={c}
                logs={logs}
                backTo={backTo}
                backLabel="Complaints"
                canRevealContact={canRevealContact}
                currentUser={user}
                onMembershipChange={load}
            />

            {actionError && !workflowModal ? (
                <p className="form-error staff-actions__alert" role="alert">
                    {actionError}
                </p>
            ) : null}
            {actionSuccess ? (
                <p className="form-success staff-actions__alert" role="status">
                    {actionSuccess}
                </p>
            ) : null}

            {!terminal &&
            (canAcceptReject ||
                showWorkflowLaunchers ||
                (role === 'hod' &&
                    (c?.status === 'assigned' || c?.status === 'escalated'))) ? (
                <article className="staff-actions">
                    <header className="staff-actions__header">
                        <h2>Actions</h2>
                        <p>
                            {awaitingAcceptance
                                ? 'This complaint is newly submitted. Accept or reject it before other actions.'
                                : showWorkflowLaunchers
                                  ? 'Choose an action below. Each opens a focused form for that step only.'
                                  : role === 'hod' &&
                                      (c?.status === 'assigned' ||
                                          c?.status === 'escalated')
                                    ? 'This complaint has been forwarded. You will be notified when it is updated or resolved.'
                                    : null}
                        </p>
                    </header>

                        {canAcceptReject ? (
                        <div className="staff-actions__accept-row">
                            <p className="staff-actions__accept-hint">
                                Accept moves the complaint into review. Reject
                                opens a structured reason list.
                            </p>
                            <div className="staff-actions__buttons">
                                <button
                                    type="button"
                                    className="staff-actions__btn staff-actions__btn--primary"
                                        disabled={submitting}
                                        onClick={() =>
                                            runAction(() =>
                                                complaintsApi.updateStatus(
                                                    id,
                                                { action: 'accepted' }
                                            )
                                        )
                                    }
                                >
                                    {submitting ? 'Accepting…' : 'Accept'}
                                    </button>
                                    <button
                                        type="button"
                                    className="staff-actions__btn staff-actions__btn--secondary"
                                        disabled={submitting}
                                        onClick={() => {
                                        setActionError('');
                                        setRejectOpen(true);
                                        }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ) : null}

                    {showWorkflowLaunchers ? (
                    <div
                        key={c?.status || 'workflow'}
                        className="staff-actions__launchers staff-actions__launchers--enter"
                    >
                        {canAssign ? (
                                <button
                                    type="button"
                                className="staff-actions__launch"
                                disabled={submitting}
                                onClick={() => openWorkflowModal('assign')}
                            >
                                <UserPlus size={18} aria-hidden />
                                <span>Assign complaint</span>
                                </button>
                        ) : null}
                        {canEscalate ? (
                                <button
                                    type="button"
                                className="staff-actions__launch staff-actions__launch--secondary"
                                    disabled={submitting}
                                onClick={() => openWorkflowModal('escalate')}
                            >
                                <ArrowUpRight size={18} aria-hidden />
                                <span>{escalateLaunchLabel}</span>
                                </button>
                        ) : null}
                        {canResolve ? (
                            <button
                                type="button"
                                className="staff-actions__launch staff-actions__launch--resolve"
                                    disabled={submitting}
                                onClick={() => openWorkflowModal('resolve')}
                            >
                                <CheckCircle2 size={18} aria-hidden />
                                <span>Resolve complaint</span>
                            </button>
                        ) : null}
                    </div>
                    ) : null}
                </article>
            ) : null}

            {canCloseComplaint ? (
                <article className="staff-actions staff-actions--close">
                    <header className="staff-actions__header">
                        <h2>Actions</h2>
                        <p>
                            This complaint was resolved. Close it to complete the
                            workflow, or it will be closed automatically after 24
                            hours.
                        </p>
                    </header>
                    <div className="staff-actions__buttons">
                                <button
                                    type="button"
                            className="staff-actions__btn staff-actions__btn--primary"
                                    disabled={submitting}
                                    onClick={() => {
                                setCloseError('');
                                setCloseOpen(true);
                            }}
                        >
                            Close complaint
                                </button>
                            </div>
                    </article>
                ) : null}

            <StaffComplaintActionModal
                open={workflowModal === 'assign'}
                onClose={closeWorkflowModal}
                busy={submitting}
                title="Assign complaint"
                description={
                    role === 'dean'
                        ? 'Return the complaint to an HOD. They receive the complaint, your remarks, and any attachments.'
                        : 'Forward to an advisor in your department. They receive the complaint, your remarks, and any attachments.'
                }
                error={modalError}
                confirmLabel="Confirm assignment"
                confirmDisabled={!assignToId}
                onConfirm={handleAssignConfirm}
            >
                <StaffActionField
                    label={role === 'dean' ? 'HOD' : 'Advisor'}
                    hint={
                        role === 'dean'
                            ? 'Active HODs from all departments are listed.'
                            : 'Only advisors from your department are listed.'
                    }
                    htmlFor={assignSelectId}
                >
                    <select
                        id={assignSelectId}
                        className="staff-action-control"
                        value={assignToId}
                        onChange={(e) => setAssignToId(e.target.value)}
                        disabled={submitting}
                    >
                        <option value="">
                            {role === 'dean' ? 'Select HOD' : 'Select advisor'}
                        </option>
                        {assignable.map((u) => (
                            <option key={u._id} value={u._id}>
                                {role === 'dean'
                                    ? `${u.name} — ${u.department || 'Department not set'}`
                                    : `${u.name} — ${u.email}`}
                            </option>
                        ))}
                    </select>
                </StaffActionField>
                <StaffActionField label="Remarks" htmlFor={assignRemarksId}>
                    <textarea
                        id={assignRemarksId}
                        className="staff-action-control staff-action-control--textarea"
                        rows={3}
                        placeholder="Optional comments for the assignee"
                        value={assignRemarks}
                        onChange={(e) => setAssignRemarks(e.target.value)}
                        disabled={submitting}
                    />
                </StaffActionField>
                <ActionAttachmentUpload
                    files={assignFiles}
                    onChange={setAssignFiles}
                    disabled={submitting}
                    onError={(msg) => setModalError(msg)}
                    compact
                />
            </StaffComplaintActionModal>

            <StaffComplaintActionModal
                open={workflowModal === 'escalate'}
                onClose={closeWorkflowModal}
                busy={submitting}
                title={
                    role === 'advisor' ? 'Return to HOD' : 'Escalate complaint'
                }
                description={
                    role === 'hod'
                        ? 'Send to the authorized Dean with optional remarks and supporting documents.'
                        : role === 'advisor'
                          ? 'Return this complaint to your department HOD.'
                          : 'Escalate to the Vice Chancellor when required.'
                }
                error={modalError}
                confirmLabel={
                    role === 'advisor'
                        ? 'Confirm return'
                        : role === 'hod'
                          ? 'Confirm escalation'
                          : 'Confirm escalation'
                }
                confirmTone="secondary"
                confirmDisabled={
                    (role === 'hod' || role === 'dean') &&
                    escalationTargets.length > 0 &&
                    !escalateToId
                }
                onConfirm={handleEscalateConfirm}
            >
                {role === 'hod' || role === 'dean' ? (
                    <StaffActionField
                        label={role === 'hod' ? 'Dean' : 'Recipient'}
                        htmlFor={escalateSelectId}
                    >
                        <select
                            id={escalateSelectId}
                            className="staff-action-control"
                            value={escalateToId}
                            onChange={(e) => setEscalateToId(e.target.value)}
                            disabled={
                                submitting || escalationTargets.length <= 1
                            }
                        >
                            <option value="">Select recipient</option>
                            {escalationTargets.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.name} ({u.role})
                                </option>
                            ))}
                        </select>
                    </StaffActionField>
                ) : null}
                <StaffActionField
                    label="Remarks"
                    htmlFor={escalateRemarksId}
                >
                    <textarea
                        id={escalateRemarksId}
                        className="staff-action-control staff-action-control--textarea"
                        rows={3}
                        placeholder="Optional comments for escalation"
                        value={escalateRemarks}
                        onChange={(e) => setEscalateRemarks(e.target.value)}
                        disabled={submitting}
                    />
                </StaffActionField>
                <ActionAttachmentUpload
                    files={escalateFiles}
                    onChange={setEscalateFiles}
                    disabled={submitting}
                    onError={(msg) => setModalError(msg)}
                    compact
                />
            </StaffComplaintActionModal>

            <StaffComplaintActionModal
                open={workflowModal === 'resolve'}
                onClose={closeWorkflowModal}
                busy={submitting}
                title="Resolve complaint"
                description="Marks the complaint resolved and notifies the student who filed it. Attach proof or reports if needed."
                error={modalError}
                confirmLabel="Mark as resolved"
                confirmTone="primary"
                onConfirm={handleResolveConfirm}
            >
                <StaffActionField
                    label="Resolution note"
                    hint="Required. Shown to the complainant with any attachments."
                    htmlFor={resolveNoteId}
                    required
                >
                    <textarea
                        id={resolveNoteId}
                        className="staff-action-control staff-action-control--textarea"
                        rows={4}
                        placeholder="Describe how the complaint was resolved"
                        value={resolveRemarks}
                        onChange={(e) => setResolveRemarks(e.target.value)}
                        disabled={submitting}
                    />
                </StaffActionField>
                <ActionAttachmentUpload
                    files={resolveFiles}
                    onChange={setResolveFiles}
                    disabled={submitting}
                    onError={(msg) => setModalError(msg)}
                    compact
                />
            </StaffComplaintActionModal>

            <ComplaintRejectionModal
                open={rejectOpen}
                onClose={() => setRejectOpen(false)}
                onConfirm={handleRejectConfirm}
                busy={submitting}
            />

            <ComplaintCloseModal
                open={closeOpen}
                onClose={() => {
                    if (!submitting) setCloseOpen(false);
                }}
                onConfirm={handleCloseConfirm}
                busy={submitting}
                error={closeError}
            />
        </div>
    );
}