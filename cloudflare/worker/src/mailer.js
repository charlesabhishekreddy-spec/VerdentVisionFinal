const normalizeProvider = (value = "") => String(value || "").trim().toLowerCase();
const trim = (value = "") => String(value || "").trim();

const getBaseUrl = (env) => trim(env.APP_BASE_URL || env.PUBLIC_APP_URL || "").replace(/\/+$/, "");
const getAppName = (env) => trim(env.APP_NAME || "Aerovanta");

const buildResetEmailHtml = ({ appName, recipientName, resetUrl }) => {
  const safeName = trim(recipientName) || "there";
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f4ff;padding:24px;color:#111827;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #ede9fe;box-shadow:0 18px 50px rgba(91,33,182,0.08);">
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#111827;">Reset your ${appName} password</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">Hi ${safeName},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">We received a request to reset your password. Use the button below to choose a new password. This link expires soon and invalidates older sessions after a successful reset.</p>
        <p style="margin:0 0 24px;">
          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#d946ef);color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;">Reset password</a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">If the button does not work, open this link:</p>
        <p style="margin:0 0 16px;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${resetUrl}" style="color:#7c3aed;">${resetUrl}</a></p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">If you did not request this, you can ignore this email.</p>
      </div>
    </div>
  `;
};

const buildResetEmailText = ({ appName, resetUrl }) => `Reset your ${appName} password:\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`;

const sendViaResend = async (env, payload) => {
  const apiKey = trim(env.RESEND_API_KEY || "");
  const from = trim(env.RESET_EMAIL_FROM || env.EMAIL_FROM || "");
  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured", provider: "resend" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.toEmail],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      ...(trim(env.RESET_EMAIL_REPLY_TO || "") ? { reply_to: trim(env.RESET_EMAIL_REPLY_TO || "") } : {}),
    }),
  });

  const bodyText = await response.text();
  let body = null;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = null;
  }

  if (!response.ok) {
    return {
      sent: false,
      reason: "provider_error",
      provider: "resend",
      status: response.status,
      message: body?.message || bodyText || "Resend request failed.",
    };
  }

  return {
    sent: true,
    provider: "resend",
    messageId: body?.id || "",
  };
};

export const sendPasswordResetEmail = async (env, { toEmail, recipientName, token }) => {
  const provider = normalizeProvider(env.EMAIL_PROVIDER || "");
  const baseUrl = getBaseUrl(env);
  if (!provider || !baseUrl || !token) {
    return { sent: false, reason: "not_configured", provider: provider || "none" };
  }

  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(String(token || ""))}`;
  const appName = getAppName(env);
  const payload = {
    toEmail: trim(toEmail),
    subject: `${appName} password reset`,
    html: buildResetEmailHtml({ appName, recipientName, resetUrl }),
    text: buildResetEmailText({ appName, resetUrl }),
  };

  if (provider === "resend") {
    return sendViaResend(env, payload);
  }

  return { sent: false, reason: "unsupported_provider", provider };
};
