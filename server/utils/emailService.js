import nodemailer from 'nodemailer';

function isEmailConfigured() {
    return Boolean(
        process.env.SMTP_HOST &&
            process.env.SMTP_USER &&
            process.env.SMTP_PASS &&
            process.env.EMAIL_FROM
    );
}

function getTransport() {
    if (!isEmailConfigured()) {
        return null;
    }
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

export function getEmailConfigError() {
    if (isEmailConfigured()) return null;
    return 'Email delivery is not configured on the server (SMTP). Contact your administrator.';
}

export async function sendMail({ to, subject, text, html }) {
    const transport = getTransport();
    if (!transport) {
        const err = new Error(getEmailConfigError());
        err.code = 'EMAIL_NOT_CONFIGURED';
        throw err;
    }
    await transport.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text,
        html
    });
}
