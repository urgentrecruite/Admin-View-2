const DEFAULT_RECIPIENTS = {
  info: process.env.URGENT_RECRUITE_INFO_EMAIL || "info@urgentrecruite.com",
  intern: process.env.URGENT_RECRUITE_INTERN_EMAIL || "intern@urgentrecruite.com",
  careers: process.env.URGENT_RECRUITE_CAREERS_EMAIL || "careers@urgentrecruite.com",
  recruitment: process.env.URGENT_RECRUITE_RECRUITMENT_EMAIL || "recruitment@urgentrecruite.com"
};

const SENDERS = {
  info: process.env.URGENT_RECRUITE_INFO_SENDER || "Urgent Recruite <info@urgentrecruite.com>",
  intern: process.env.URGENT_RECRUITE_INTERN_SENDER || "Urgent Recruite Interns <intern@urgentrecruite.com>",
  careers: process.env.URGENT_RECRUITE_CAREERS_SENDER || "Urgent Recruite Careers <careers@urgentrecruite.com>",
  recruitment: process.env.URGENT_RECRUITE_RECRUITMENT_SENDER || "Urgent Recruite Recruitment <recruitment@urgentrecruite.com>"
};

const DAILY_FORM_LIMIT = 3;
const rateLimitStore = globalThis.__urgentRecruiteRateLimitStore || new Map();
globalThis.__urgentRecruiteRateLimitStore = rateLimitStore;

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function money(value) {
  const amount = Number(value) || 0;
  return amount
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)
    : "Not provided";
}

function getSiteUrl() {
  return clean(process.env.URGENT_RECRUITE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://urgentrecruite.com").replace(/\/$/, "");
}

function getLogoUrl() {
  return clean(process.env.URGENT_RECRUITE_LOGO_URL || `${getSiteUrl()}/assets/logo.jpeg`);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(text, hiddenUrl = "") {
  return String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && paragraph !== hiddenUrl)
    .map((paragraph) => `<p style="margin:0 0 16px;color:#314247;font-size:15px;line-height:1.65;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function buildBrandedHtml(email) {
  const action = email.actionUrl
    ? `<p style="margin:22px 0 24px;"><a href="${escapeHtml(email.actionUrl)}" style="display:inline-block;padding:13px 18px;border-radius:8px;background:#1f6feb;color:#ffffff;font-weight:800;text-decoration:none;">${escapeHtml(email.actionLabel || "View profile brief")}</a></p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f7f8;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f8;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8ea;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #e2e8ea;background:#ffffff;">
                <img src="${escapeHtml(getLogoUrl())}" width="170" alt="Urgent Recruite" style="display:block;max-width:170px;height:auto;">
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 18px;">
                ${textToHtml(email.text, email.actionUrl)}
                ${action}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 28px;border-top:1px solid #e2e8ea;background:#fbfcfd;">
                <p style="margin:0 0 6px;color:#102426;font-size:15px;font-weight:800;">Urgent Recruite Team</p>
                <p style="margin:0;color:#5d6b70;font-size:13px;line-height:1.55;">The right people, exactly when you need them.</p>
                <p style="margin:14px 0 0;color:#7a878b;font-size:12px;line-height:1.55;">This email was sent by Urgent Recruite as part of a recruitment, callback, or shortlist request workflow.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function prepareEmailForProvider(email) {
  const { actionUrl, actionLabel, ...providerEmail } = email;
  return {
    ...providerEmail,
    html: email.html || buildBrandedHtml({ ...email, actionUrl, actionLabel })
  };
}

function parseBody(request) {
  if (!request.body) return {};
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }
  return request.body;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getRateLimitTarget(type, payload = {}) {
  if (type === "contact-confirmation") return { form: "contact", email: clean(payload.email).toLowerCase() };
  if (type === "cv-submission-confirmation") return { form: "cv", email: clean(payload.email).toLowerCase() };
  if (type === "intern-application-confirmation") return { form: "intern", email: clean(payload.email).toLowerCase() };
  if (type === "employer-request-confirmation") return { form: "employer", email: clean(payload.workEmail || payload.email).toLowerCase() };
  if (type === "profile-request") return { form: "profile-request", email: clean(payload.clientEmail).toLowerCase() };
  return null;
}

function checkRateLimit(type, payload = {}) {
  const target = getRateLimitTarget(type, payload);
  if (!target?.email) return;

  const key = `${todayKey()}|${target.form}|${target.email}`;
  const count = rateLimitStore.get(key) || 0;
  if (count >= DAILY_FORM_LIMIT) {
    const error = new Error("This email address has reached the daily submission limit for this form.");
    error.statusCode = 429;
    throw error;
  }
  rateLimitStore.set(key, count + 1);
}

async function sendResendEmail(apiKey, email) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(email)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Email provider rejected the request.");
  }

  return data;
}

function buildEmails(type, payload = {}) {
  const name = clean(payload.fullName || payload.name || payload.contactName || "there");
  const company = clean(payload.companyName || payload.organization || "your organization");
  const jobTitle = clean(payload.jobTitle || payload.shortlistTitle || "your request");

  if (type === "contact-confirmation") {
    return [{
      from: SENDERS.info,
      to: clean(payload.email),
      subject: "We received your message",
      text: `Hello ${name},\n\nThank you for your request to speak with us. Our contact person will communicate with you soon.\n\nUrgent Recruite`
    }, {
      from: SENDERS.info,
      to: DEFAULT_RECIPIENTS.info,
      subject: "New website contact request",
      text: `New contact request\n\nName: ${name}\nEmail: ${clean(payload.email)}\nPhone: ${clean(payload.phone)}\nMessage: ${clean(payload.message)}`
    }];
  }

  if (type === "cv-submission-confirmation") {
    return [];
  }

  if (type === "intern-application-confirmation") {
    return [];
  }

  if (type === "employer-request-confirmation") {
    return [{
      from: SENDERS.recruitment,
      to: clean(payload.workEmail || payload.email),
      subject: "We received your shortlist request",
      text: `Hello ${name},\n\nThank you for requesting a shortlist for ${company}. We have received the role details for ${jobTitle}, and our recruitment team will review the request and prepare the next step.\n\nUrgent Recruite Recruitment`
    }, {
      from: SENDERS.recruitment,
      to: DEFAULT_RECIPIENTS.recruitment,
      subject: `New shortlist request from ${company}`,
      text: `New employer request\n\nCompany: ${company}\nContact: ${name}\nEmail: ${clean(payload.workEmail || payload.email)}\nRole: ${jobTitle}\nRequest type: ${clean(payload.source || "shortlist")}`
    }];
  }

  if (type === "shortlist-link") {
    return [{
      from: SENDERS.recruitment,
      to: clean(payload.to || payload.clientEmail),
      subject: `Secure shortlist link for ${company}`,
      text: `Dear ${company} Team,\n\nThank you for requesting a shortlist from Urgent Recruite.\n\nKindly note that we hold candidate profiles in high confidence. In line with our policy, candidate contact details remain hidden until you request specific profiles.\n\nPlease use the secure profile brief link to review the redacted shortlist, view candidate experience summaries, and indicate the profiles you are interested in.\n\n${clean(payload.secureLink)}\n\nKind regards,\nUrgent Recruite Team`,
      actionUrl: clean(payload.secureLink),
      actionLabel: "View profile brief"
    }];
  }

  if (type === "profile-request") {
    const selectedRefs = Array.isArray(payload.selectedProfileReferences)
      ? payload.selectedProfileReferences.map((item) => `- ${clean(item)}`).join("\n")
      : "Not provided";
    const internalEmail = {
      from: SENDERS.recruitment,
      to: DEFAULT_RECIPIENTS.recruitment,
      subject: `Client requested profiles for ${company}`,
      text: `A client requested shortlisted profiles.\n\nCompany: ${company}\nClient email: ${clean(payload.clientEmail)}\nShortlist ID: ${clean(payload.shortlistId)}\nShortlist: ${clean(payload.shortlistTitle)}\nSelected profiles: ${clean(payload.selectedCount)}\nAnnual gross pay: ${money(payload.grossPay)}\nCalculated fee: ${money(payload.calculatedFee)}\n\nSelected profile references:\n${selectedRefs}\n\nNo candidate contact details were included in this notification.`
    };
    const clientEmail = clean(payload.clientEmail)
      ? [{
        from: SENDERS.recruitment,
        to: clean(payload.clientEmail),
        subject: "Your profile request has been received",
        text: `Hello,\n\nThank you. We have received your request for the selected profiles in ${clean(payload.shortlistTitle)}. Our recruitment team will contact you shortly with the next step.\n\nUrgent Recruite Recruitment`
      }]
      : [];

    return [internalEmail, ...clientEmail];
  }

  return [];
}

module.exports = async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    response.status(501).json({ configured: false, error: "RESEND_API_KEY is not configured." });
    return;
  }

  const { type, payload } = parseBody(request);
  try {
    checkRateLimit(type, payload);
  } catch (error) {
    response.status(error.statusCode || 429).json({ error: error.message });
    return;
  }

  const emails = buildEmails(type, payload).filter((email) => clean(email.to));

  if (!emails.length) {
    response.status(400).json({ error: "No valid email could be built for this request." });
    return;
  }

  try {
    const results = [];
    for (const email of emails) {
      results.push(await sendResendEmail(apiKey, prepareEmailForProvider(email)));
    }

    response.status(200).json({ ok: true, sent: results.length });
  } catch (error) {
    response.status(502).json({ error: error.message || "Could not send email." });
  }
};
