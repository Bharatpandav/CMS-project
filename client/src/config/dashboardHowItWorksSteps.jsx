import { Link } from 'react-router-dom';

/**
 * Role-specific “How it works” copy for dashboards (student, HOD, VC, advisor).
 */
export function getDashboardHowItWorksSteps(role, paths = {}) {
    const complaints = paths.complaints || null;
    const register = paths.register || null;

    if (role === 'student') {
        return [
            {
                title: 'Login',
                body: (
                    <p>
                        Use your URN and password to access the portal.
                    </p>
                )
            },
            {
                title: 'Raise complaint',
                body: (
                    <p>
                        {register ? (
                            <Link to={register} className="link-teal">
                                Submit details
                            </Link>
                        ) : (
                            'Submit details'
                        )}{' '}
                        and supporting information.
                    </p>
                )
            },
            {
                title: 'Track progress',
                body: (
                    <p>Follow status updates on your complaint list.</p>
                )
            },
            {
                title: 'Get resolution',
                body: (
                    <p>Receive outcomes from the responsible team.</p>
                )
            }
        ];
    }

    if (role === 'hod') {
        return [
            {
                title: 'Review queue',
                body: (
                    <p>
                        {complaints ? (
                            <>
                                Open{' '}
                                <Link to={complaints} className="link-teal">
                                    department complaints
                                </Link>{' '}
                                submitted to your department.
                            </>
                        ) : (
                            'Review new complaints submitted to your department.'
                        )}
                    </p>
                )
            },
            {
                title: 'Accept or reject',
                body: (
                    <p>
                        Accept valid cases or reject with clear remarks so
                        students know the next step.
                    </p>
                )
            },
            {
                title: 'Assign or escalate',
                body: (
                    <p>
                        Assign advisors within your department or escalate to
                        the Dean when institutional action is required.
                    </p>
                )
            },
            {
                title: 'Close the loop',
                body: (
                    <p>
                        Monitor progress, resolve or authorize closure, and
                        keep the audit trail complete.
                    </p>
                )
            }
        ];
    }

    if (role === 'dean') {
        return [
            {
                title: 'Review queue',
                body: (
                    <p>
                        {complaints ? (
                            <>
                                Open{' '}
                                <Link to={complaints} className="link-teal">
                                    dean-level complaints
                                </Link>{' '}
                                and escalations routed to your office.
                            </>
                        ) : (
                            'Review dean-level complaints and escalations routed to your office.'
                        )}
                    </p>
                )
            },
            {
                title: 'Accept or reject',
                body: (
                    <p>
                        Accept valid cases or reject with remarks so students
                        and staff know the next step.
                    </p>
                )
            },
            {
                title: 'Assign to HOD',
                body: (
                    <p>
                        Route complaints to the responsible department HOD for
                        investigation and departmental action.
                    </p>
                )
            },
            {
                title: 'Escalate or resolve',
                body: (
                    <p>
                        Escalate to the Vice Chancellor when needed, or resolve
                        and close with a complete audit trail.
                    </p>
                )
            }
        ];
    }

    if (role === 'super_admin') {
        return [
            {
                title: 'Institutional queue',
                body: (
                    <p>
                        {complaints ? (
                            <>
                                Review{' '}
                                <Link to={complaints} className="link-teal">
                                    VC-level and escalated
                                </Link>{' '}
                                complaints across the university.
                            </>
                        ) : (
                            'Review VC-level and escalated complaints across the university.'
                        )}
                    </p>
                )
            },
            {
                title: 'Accept and route',
                body: (
                    <p>
                        Accept cases and assign to the Dean or HOD, or
                        re-escalate per institutional policy.
                    </p>
                )
            },
            {
                title: 'Track handoffs',
                body: (
                    <p>
                        Monitor assignment history, deadlines, and responses
                        between Dean, HOD, and advisors.
                    </p>
                )
            },
            {
                title: 'Final decision',
                body: (
                    <p>
                        Resolve or authorize closure on the highest-level cases
                        and keep official records accurate.
                    </p>
                )
            }
        ];
    }

    if (role === 'advisor') {
        return [
            {
                title: 'Your assignments',
                body: (
                    <p>
                        {complaints ? (
                            <>
                                Open{' '}
                                <Link to={complaints} className="link-teal">
                                    complaints assigned to you
                                </Link>{' '}
                                by your HOD.
                            </>
                        ) : (
                            'Open complaints assigned to you by your HOD.'
                        )}
                    </p>
                )
            },
            {
                title: 'Investigate',
                body: (
                    <p>
                        Read the student submission, attachments, and prior
                        remarks before you act.
                    </p>
                )
            },
            {
                title: 'Record updates',
                body: (
                    <p>
                        Add investigation remarks and progress notes on the
                        complaint record.
                    </p>
                )
            },
            {
                title: 'Resolve or escalate',
                body: (
                    <p>
                        Resolve when the issue is addressed, or escalate back
                        to your HOD if you need a higher decision.
                    </p>
                )
            }
        ];
    }

    return null;
}