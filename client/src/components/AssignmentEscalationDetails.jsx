import { UserRound } from 'lucide-react';
import { AttachmentFileList } from './AttachmentFileList.jsx';
import {
    authorityLine,
    buildAssignmentEscalationHistory,
    isUserAuthoredRoutingRemark
} from '../utils/complaintRoutingHistory.js';

function fileNameFromUrl(url, index) {
    if (typeof url !== 'string') return `attachment-${index + 1}`;
    const part = url.split('/').pop() || `attachment-${index + 1}`;
    return decodeURIComponent(part.split('?')[0]);
}

function formatWhen(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

export function AssignmentEscalationDetails({
    complaint: _complaint,
    logs = [],
    onOpenAttachment
}) {
    const history = buildAssignmentEscalationHistory(logs);

    if (history.length === 0) {
        return null;
    }

    return (
        <section
            className="cdetail__routing"
            aria-labelledby="cdetail-routing-title"
        >
            <header className="cdetail__routing-header">
                <div className="cdetail__routing-header-group">
                    <UserRound
                        size={20}
                        className="cdetail__routing-header-icon"
                        aria-hidden
                    />
                    <h2 id="cdetail-routing-title">
                        Assignment &amp; Escalation Details
                    </h2>
                </div>
            </header>

            <ol className="cdetail__routing-timeline">
                {history.map((entry, index) => {
                    const title =
                        entry.kind === 'assignment'
                            ? 'Assignment'
                            : 'Escalation';
                    const byLine =
                        authorityLine(entry.actor, entry.actorRole) ||
                        'Name not recorded';
                    const fromLine = authorityLine(entry.previousAssignee);
                    const toLine =
                        authorityLine(
                            entry.recipient,
                            entry.recipientRole
                        ) || '—';
                    const showRemarks = isUserAuthoredRoutingRemark(
                        entry.remarks
                    );
                    const key = `${entry.kind}-${entry.at || index}`;

                    return (
                        <li
                            key={key}
                            className={`cdetail__routing-entry cdetail__routing-entry--${entry.kind}`}
                        >
                            <span className="cdetail__routing-badge">
                                {title}
                            </span>
                            <dl className="cdetail__routing-facts">
                                {entry.kind === 'assignment' ? (
                                    <>
                                        <div>
                                            <dt>Assigned by</dt>
                                            <dd>{byLine}</dd>
                                        </div>
                                        <div>
                                            <dt>Assigned to</dt>
                                            <dd>{toLine}</dd>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <dt>Escalated by</dt>
                                            <dd>{byLine}</dd>
                                        </div>
                                        {fromLine ? (
                                            <div>
                                                <dt>Escalated from</dt>
                                                <dd>{fromLine}</dd>
                                            </div>
                                        ) : null}
                                        <div>
                                            <dt>Escalated to</dt>
                                            <dd>{toLine}</dd>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <dt>Date</dt>
                                    <dd>{formatWhen(entry.at)}</dd>
                                </div>
                            </dl>

                            {showRemarks ? (
                                <p className="cdetail__routing-remarks">
                                    <strong>Remarks:</strong> {entry.remarks}
                                </p>
                            ) : null}

                            {entry.attachments.length > 0 ? (
                                <div className="cdetail__routing-files">
                                    <span className="cdetail__label">
                                        Attachments ({entry.attachments.length})
                                    </span>
                                    <AttachmentFileList
                                        files={entry.attachments.map(
                                            (file, i) => ({
                                                ...file,
                                                filename:
                                                    file.filename ||
                                                    fileNameFromUrl(
                                                        file.url,
                                                        i
                                                    )
                                            })
                                        )}
                                        onOpen={onOpenAttachment}
                                        showDownload
                                        compact
                                    />
                                </div>
                            ) : null}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}