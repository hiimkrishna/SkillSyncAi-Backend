// src/utils/email.js
// Central email sender for SkillSync AI (supervisor mods: interview
// notifications + 24h reminders + reschedule flow).
//
// Config via env:
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ("true"/"false"),
//   SMTP_USER, SMTP_PASS, EMAIL_FROM (default "SkillSync AI <no-reply@skillsync.ai>")
//
// When SMTP_HOST is missing, sending is skipped gracefully: the email is
// logged and a `{ delivered: false, preview }` result is returned so API
// responses can surface a dev preview instead of failing.

import nodemailer from "nodemailer";

const isSmtpConfigured = () => Boolean(process.env.SMTP_HOST);

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth:
      process.env.SMTP_USER || process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  return transporter;
};

export const isEmailConfigured = () => isSmtpConfigured();

const wrapHtml = (title, bodyHtml) => `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;">
<div style="border-bottom:3px solid #B79A6A;padding-bottom:12px;margin-bottom:20px;">
<div style="font-family:Georgia,serif;font-size:22px;color:#0f172a;">SkillSync AI</div>
<div style="font-size:12px;color:#64748b;">${title}</div>
</div>
${bodyHtml}
<div style="margin-top:28px;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;">
This is an automated message from SkillSync AI. Please do not reply directly.
</div>
</body></html>`;

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    throw new Error("Email recipient (to) is required");
  }

  const fullHtml = wrapHtml(subject, html);

  if (!isSmtpConfigured()) {
    console.log(`[email:dev] To=${to} Subject=${subject}`);
    return {
      delivered: false,
      reason: "SMTP not configured (set SMTP_HOST/PORT/USER/PASS)",
      preview: { to, subject, html: fullHtml, text: text ?? "" },
    };
  }

  const info = await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || "SkillSync AI <no-reply@skillsync.ai>",
    to,
    subject,
    html: fullHtml,
    text: text ?? subject,
  });

  return { delivered: true, messageId: info?.messageId ?? null };
};

const formatWhen = (scheduledAt, durationMinutes) => {
  const date = new Date(scheduledAt);
  const dateStr = Number.isNaN(date.getTime())
    ? String(scheduledAt)
    : date.toLocaleString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  return durationMinutes ? `${dateStr} (${durationMinutes} min)` : dateStr;
};

const interviewDetailsHtml = ({ jobTitle, company, when, type, meetingLink, location, notes }) => `
<p><strong>Position:</strong> ${jobTitle ?? "—"}${company ? ` at ${company}` : ""}</p>
<p><strong>When:</strong> ${when}</p>
<p><strong>Mode:</strong> ${type ?? "—"}</p>
${meetingLink ? `<p><strong>Meeting link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ""}
${location ? `<p><strong>Location:</strong> ${location}</p>` : ""}
${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}`;

export const sendInterviewScheduledEmail = async ({
  to,
  candidateName,
  jobTitle,
  company,
  scheduledAt,
  durationMinutes,
  type,
  meetingLink,
  location,
  notes,
}) =>
  sendEmail({
    to,
    subject: `Interview scheduled — ${jobTitle ?? "your application"}`,
    html: `<p>Hi ${candidateName ?? "there"},</p>
<p>Your interview has been scheduled:</p>
${interviewDetailsHtml({ jobTitle, company, when: formatWhen(scheduledAt, durationMinutes), type, meetingLink, location, notes })}
<p>Good luck!</p>`,
  });

export const sendInterviewUpdatedEmail = async ({
  to,
  candidateName,
  jobTitle,
  company,
  scheduledAt,
  durationMinutes,
  type,
  meetingLink,
  location,
  notes,
}) =>
  sendEmail({
    to,
    subject: `Interview rescheduled — ${jobTitle ?? "your application"}`,
    html: `<p>Hi ${candidateName ?? "there"},</p>
<p>Your interview has been <strong>rescheduled</strong>. New details:</p>
${interviewDetailsHtml({ jobTitle, company, when: formatWhen(scheduledAt, durationMinutes), type, meetingLink, location, notes })}`,
  });

export const sendInterviewCancelledEmail = async ({ to, candidateName, jobTitle, company }) =>
  sendEmail({
    to,
    subject: `Interview cancelled — ${jobTitle ?? "your application"}`,
    html: `<p>Hi ${candidateName ?? "there"},</p>
<p>Your interview for <strong>${jobTitle ?? "the position"}</strong>${company ? ` at ${company}` : ""} has been <strong>cancelled</strong> by the recruiter.</p>
<p>The recruiter will contact you if a new slot is arranged.</p>`,
  });

export const sendInterviewReminderEmail = async ({
  to,
  candidateName,
  jobTitle,
  company,
  scheduledAt,
  durationMinutes,
  type,
  meetingLink,
  location,
}) =>
  sendEmail({
    to,
    subject: `Reminder: interview tomorrow — ${jobTitle ?? "your application"}`,
    html: `<p>Hi ${candidateName ?? "there"},</p>
<p>This is a friendly reminder that your interview is <strong>within the next 24 hours</strong>:</p>
${interviewDetailsHtml({ jobTitle, company, when: formatWhen(scheduledAt, durationMinutes), type, meetingLink, location })}
<p>Please join on time. Good luck!</p>`,
  });

export const sendRescheduleRequestEmail = async ({
  to,
  recruiterName,
  candidateName,
  jobTitle,
  currentAt,
  proposedAt,
  reason,
}) =>
  sendEmail({
    to,
    subject: `Reschedule requested — ${candidateName ?? "candidate"} (${jobTitle ?? "interview"})`,
    html: `<p>Hi ${recruiterName ?? "there"},</p>
<p><strong>${candidateName ?? "A candidate"}</strong> requested to reschedule their interview for <strong>${jobTitle ?? "the position"}</strong>.</p>
<p><strong>Current slot:</strong> ${formatWhen(currentAt)}</p>
<p><strong>Proposed slot:</strong> ${formatWhen(proposedAt)}</p>
${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
<p>Open the Interviews page to approve or decline the request.</p>`,
  });

export const sendRescheduleDecisionEmail = async ({
  to,
  candidateName,
  jobTitle,
  company,
  decision,
  scheduledAt,
  durationMinutes,
  type,
  meetingLink,
  location,
}) =>
  sendEmail({
    to,
    subject:
      decision === "approved"
        ? `Reschedule approved — ${jobTitle ?? "your interview"}`
        : `Reschedule declined — ${jobTitle ?? "your interview"}`,
    html:
      decision === "approved"
        ? `<p>Hi ${candidateName ?? "there"},</p>
<p>Your reschedule request was <strong>approved</strong>. New interview details:</p>
${interviewDetailsHtml({ jobTitle, company, when: formatWhen(scheduledAt, durationMinutes), type, meetingLink, location })}`
        : `<p>Hi ${candidateName ?? "there"},</p>
<p>Your reschedule request for <strong>${jobTitle ?? "the interview"}</strong>${company ? ` at ${company}` : ""} was <strong>declined</strong>. The original schedule stands — please contact the recruiter if you need another slot.</p>`,
  });
