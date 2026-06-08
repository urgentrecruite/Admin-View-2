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
    return [{
      from: SENDERS.careers,
      to: clean(payload.email),
      subject: "Your profile has been received",
      text: `Hello ${name},\n\nThank you for submitting your profile. We will contact you as soon as we find an organization requesting your profile or expertise.\n\nUrgent Recruite Careers`
    }];
  }

  if (type === "intern-application-confirmation") {
    return [{
      from: SENDERS.intern,
      to: clean(payload.email),
      subject: "Your intern profile has been received",
      text: `Hello ${name},\n\nThank you for submitting your intern profile. Our intern placement team will review your interests, field, and CV, and we will contact you when we find an organization looking for an intern profile like yours.\n\nUrgent Recruite Interns`
    }];
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
      text: `Dear ${company} Team,\n\nThank you for requesting a shortlist from Urgent Recruite.\n\nKindly note that we hold candidate profiles in high confidence. In line with our policy, candidate contact details remain hidden until you request specific profiles.\n\nPlease use the secure link below to review the redacted shortlist, view candidate experience summaries, and indicate the profiles you are interested in.\n\n${clean(payload.secureLink)}\n\nKind regards,\nUrgent Recruite Team`
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
      results.push(await sendResendEmail(apiKey, email));
    }

    response.status(200).json({ ok: true, sent: results.length });
  } catch (error) {
    response.status(502).json({ error: error.message || "Could not send email." });
  }
};
