const nodemailer = require("nodemailer");

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number.parseInt(String(process.env.SMTP_PORT || ""), 10);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!host || !Number.isFinite(port) || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
    auth: {
      user,
      pass,
    },
  };
}

function getMailFrom() {
  return String(process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@example.com").trim();
}

function isEmailDeliveryConfigured() {
  return Boolean(getSmtpConfig());
}

async function sendPasswordResetEmail({ to, resetUrl, role, expiresAt }) {
  const smtpConfig = getSmtpConfig();
  if (!smtpConfig) {
    return {
      sent: false,
      reason: "SMTP is not configured.",
    };
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  const roleLabel = role === "teacher" ? "teacher" : "student";
  const expiresLabel = expiresAt ? new Date(expiresAt).toLocaleString("en-US") : "soon";

  await transporter.sendMail({
    from: getMailFrom(),
    to,
    subject: "Reset your IELTS Platform password",
    text: [
      `Use this link to reset your ${roleLabel} password:`,
      resetUrl,
      "",
      `This link expires at ${expiresLabel}.`,
      "If you did not request this reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <p>Use this link to reset your ${roleLabel} password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires at ${expiresLabel}.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      </div>
    `,
  });

  return {
    sent: true,
    reason: "",
  };
}

module.exports = {
  isEmailDeliveryConfigured,
  sendPasswordResetEmail,
};
