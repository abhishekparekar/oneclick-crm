const nodemailer = require("nodemailer");
const { sendWhatsAppNotification } = require("./whatsappService");

/**
 * Universal Service for handling external notification providers (Email, WhatsApp).
 */

const getTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });
  }
  return null;
};

exports.sendEmail = async (toOrOptions, subjectParam, bodyParam) => {
  let to, subject, text, html;

  if (typeof toOrOptions === "object" && toOrOptions !== null) {
    to = toOrOptions.to;
    subject = toOrOptions.subject;
    text = toOrOptions.text;
    html = toOrOptions.html || toOrOptions.text;
  } else {
    to = toOrOptions;
    subject = subjectParam;
    text = bodyParam;
    html = bodyParam;
  }

  console.log(`\n==========================================`);
  console.log(`[EMAIL DISPATCH]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body/Link:\n${text || html}`);
  console.log(`==========================================\n`);

  const transporter = getTransporter();
  if (transporter) {
    try {
      const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || '"One Click HRMS" <noreply@oneclickhrms.com>';
      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        text,
        html,
      });
      console.log(`[EMAIL SENT] MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[EMAIL ERROR]: Failed to send via SMTP:`, err.message);
      // Don't crash the caller; email logged above in console
      return { success: false, error: err.message, fallbackLogged: true };
    }
  }

  return { success: true, message: "Email simulated and logged to console" };
};

exports.sendPasswordResetEmail = async (to, name, resetUrl, temporaryPassword = null) => {
  const subject = "Password Reset Request - One Click HRMS";
  const userName = name || "User";

  const text = `Hello ${userName},\n\nYou requested a password reset for your One Click HRMS account.\nClick the link below to set a new password:\n${resetUrl}\n\n${
    temporaryPassword ? `Temporary Password: ${temporaryPassword}\n\n` : ""
  }This link is valid for 1 hour.\nIf you did not request this, please disregard this message.`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">ONE CLICK HRMS</h1>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 600;">Account Security & Recovery</p>
      </div>

      <div style="padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #edf2f7;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 800;">Password Reset Request</h3>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Hello <strong>${userName}</strong>,
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          We received a request to reset your password for your account associated with <strong>${to}</strong>.
        </p>

        ${
          temporaryPassword
            ? `<div style="background-color: #eff6ff; border: 1px dashed #3b82f6; border-radius: 8px; padding: 12px 16px; margin: 18px 0; font-size: 13px;">
                <span style="color: #1d4ed8; font-weight: 700;">Temporary System Password:</span> 
                <code style="background: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #1e40af;">${temporaryPassword}</code>
               </div>`
            : ""
        }

        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 13px 32px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
            Reset Password
          </a>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 20px;">
          If the button doesn't work, copy and paste this URL into your browser:<br/>
          <a href="${resetUrl}" style="color: #2563eb; word-break: break-all; font-weight: 500;">${resetUrl}</a>
        </p>

        <p style="color: #e11d48; font-size: 12px; margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-weight: 600;">
          ⏳ Note: This link will expire in <strong>1 hour</strong>. If you did not make this request, you can safely ignore this email.
        </p>
      </div>

      <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 11px;">
        &copy; ${new Date().getFullYear()} One Click HRMS Enterprise. All rights reserved.
      </div>
    </div>
  `;

  return exports.sendEmail({ to, subject, text, html });
};

exports.sendWhatsApp = async (phone, message, companyId = null) => {
  try {
    const result = await sendWhatsAppNotification({
      companyId,
      recipient: phone,
      messageType: "HR_ALERT",
      payload: { text: message },
    });

    if (!result.success) {
      console.log(`[WHATSAPP NOTICE] ${result.error || "Simulated dispatch"}`);
    }
    return result;
  } catch (err) {
    console.warn(`[WHATSAPP DISPATCH ERROR]: ${err.message}`);
    return { success: false, error: err.message };
  }
};
