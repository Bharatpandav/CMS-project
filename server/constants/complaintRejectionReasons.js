export const COMPLAINT_REJECTION_REASONS = [
    {
        code: 'insufficient_information',
        label: 'Insufficient information or incomplete details'
    },
    {
        code: 'not_university_jurisdiction',
        label: 'Not under university / department jurisdiction'
    },
    {
        code: 'duplicate_complaint',
        label: 'Duplicate or previously addressed complaint'
    },
    {
        code: 'invalid_or_frivolous',
        label: 'Invalid, frivolous, or unsupported claim'
    },
    {
        code: 'policy_not_applicable',
        label: 'University policy does not apply to this matter'
    },
    { code: 'other', label: 'Other (explain below)' }
];

const REASON_BY_CODE = Object.fromEntries(
    COMPLAINT_REJECTION_REASONS.map((r) => [r.code, r])
);

export function validateRejectionPayload({
    rejectionReasonCode,
    rejectionReasonOther,
    remarks
}) {
    const code = (rejectionReasonCode || '').trim();
    const other = (rejectionReasonOther || remarks || '').trim();

    if (!code) {
        return {
            ok: false,
            message: 'Select a rejection reason'
        };
    }

    const reason = REASON_BY_CODE[code];
    if (!reason) {
        return {
            ok: false,
            message: 'Invalid rejection reason'
        };
    }

    if (code === 'other' && !other) {
        return {
            ok: false,
            message: 'Provide a short explanation when selecting Other'
        };
    }

    const note =
        code === 'other'
            ? other
            : other
              ? `${reason.label} — ${other}`
              : reason.label;

    return {
        ok: true,
        note,
        rejectionReasonCode: code,
        rejectionReasonText: code === 'other' ? other : other || reason.label
    };
}