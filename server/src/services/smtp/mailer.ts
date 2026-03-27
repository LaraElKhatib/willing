import nodemailer from 'nodemailer';

import config from '../../config.js';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = config;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

function indentLines(content: string): string {
  return content
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n');
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  if (config.NODE_ENV === 'production') {
    try {
      return transporter.sendMail({
        from: MAIL_FROM,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
    } catch (_error) {
      throw new Error('Something went wrong.');
    }
  } else {
    const timestamp = new Date().toISOString();
    const output = [
      '',
      '=========================== [DEV] SMTP EMAIL ===========================',
      `Time: ${timestamp}`,
      `From: ${MAIL_FROM ?? '(MAIL_FROM not set)'}`,
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      `Text length: ${opts.text.length} chars`,
      `HTML length: ${opts.html ? `${opts.html.length} chars` : 'none'} (preview hidden in dev logs)`,
      '------------------------------------------------------------------------',
      'Text preview:',
      indentLines(opts.text),
      '========================================================================',
      '',
    ].join('\n');

    console.log(output);
  }
}
