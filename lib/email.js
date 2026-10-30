'use strict';

/**
 * Worth The Trip — email sending (verification links).
 * Configure via .env:
 *   SMTP_HOST         (default smtp.sendgrid.net)
 *   SMTP_PORT         (default 587, use 465 for TLS/SSL)
 *   SMTP_USER
 *   SMTP_PASS
 *   SMTP_FROM         (default "Worth The Trip" <no-reply@worththetripapp.com>)
 *
 * Never block a signup/apply on email delivery: a failed SMTP send is logged,
 * never returned as an error to the browser.
 */

const nodemailer = require('nodemailer');

let transporter = null;

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.sendgrid.net';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
    return transporter;
  } catch (e) {
    console.error('WTT email: could not create SMTP transporter:', e.message);
    return null;
  }
}

function getTransporter() {
  if (!transporter) createTransporter();
  return transporter;
}

async function sendVerificationEmail(to, { name, token, kind, baseUrl }) {
  const verifyUrl = `${baseUrl.replace(/\/$/, '')}/verify?token=${encodeURIComponent(token)}`;
  const subject = kind === 'apply'
    ? 'Confirm your Worth The Trip creator application'
    : 'Verify your Worth The Trip account';
  const intro = kind === 'apply'
    ? 'You applied to become a creator on Worth The Trip. Please confirm your application by clicking the link below.'
    : 'You just created a Worth The Trip account. Please confirm your email address by clicking the link below.';
  const text = [
    `Hi ${name || 'there'},`,
    '',
    intro,
    '',
    `Open this link: ${verifyUrl}`,
    '',
    'If you did not request this, you can safely ignore this email.',
    ''
  ].join('\n');

  const html = `
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1f2937; line-height: 1.6;">
      <p style="margin:0 0 8px;">Hi ${name || 'there'},</p>
      <p style="margin:0 0 12px;">${intro}</p>
      <p style="margin:0 0 16px; word-break: break-all;">
        <a href="${verifyUrl}" style="display:inline-block; background:#d32f2f; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:600;">Verify my account</a>
      </p>
      <p style="margin:0 0 8px; color:#6b7280; font-size:13px;">If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  const info = await getTransporter().sendMail({
    from: `"Worth The Trip" <${process.env.SMTP_FROM || 'no-reply@worththetripapp.com'}>`,
    to,
    subject,
    text,
    html,
    headers: {
      'List-Unsubscribe': '<mailto:unsubscribe@worththetripapp.com>, <https://worththetripapp.com/unsubscribe>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
  console.log('[WTT email] sent kind=' + kind + ' to=' + to + ' htmlLength=' + (html || '').length + ' subject=' + subject);
  return info;
}

module.exports = { sendVerificationEmail, getTransporter };
