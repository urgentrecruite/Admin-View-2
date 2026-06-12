const requests = [
  {
    id: 1,
    organization: "Acme Healthcare",
    contact: "Nadia Brooks",
    role: "Operations Manager",
    requested: "May 28, 2026",
    annualGrossPay: 85000,
    viewed: true,
    intakeComplete: true,
    pushedProfileIds: [101, 102, 103],
    linkSharedCount: 0,
    clientResponse: null,
    paymentStatus: "unpaid"
  },
  {
    id: 2,
    organization: "Northline Logistics",
    contact: "Samuel Okoro",
    role: "Fleet HR Coordinator",
    requested: "May 27, 2026",
    annualGrossPay: 62000,
    viewed: true,
    intakeComplete: true,
    pushedProfileIds: [102],
    linkSharedCount: 0,
    clientResponse: null,
    paymentStatus: "unpaid"
  },
  {
    id: 3,
    organization: "BrightPath Schools",
    contact: "Elena Walsh",
    role: "Talent Acquisition Lead",
    requested: "May 25, 2026",
    annualGrossPay: 54000,
    viewed: false,
    intakeComplete: false,
    pushedProfileIds: [],
    linkSharedCount: 0,
    clientResponse: null,
    paymentStatus: "unpaid"
  }
];

let profiles = [
  {
    id: 101,
    name: "Amara Cole",
    role: "Operations Manager",
    location: "London, UK",
    experience: "9 years",
    skills: ["Healthcare ops", "Workforce planning", "Compliance"],
    source: "intent",
    submittedAt: "May 29, 2026",
    summary: "Senior operations profile with healthcare workforce planning, compliance oversight, and strong team coordination experience.",
    contact: "amara.cole@example.com / +44 7000 000111 / linkedin.com/in/amara-cole",
    notes: "Strong healthcare background. Available in two weeks."
  },
  {
    id: 102,
    name: "Daniel Mensah",
    role: "HR Operations Lead",
    location: "Accra, Ghana",
    experience: "7 years",
    skills: ["HRIS", "Onboarding", "Policy rollout"],
    source: "cv",
    submittedAt: "May 28, 2026",
    summary: "HR operations lead with systems, onboarding, and policy implementation experience across distributed teams.",
    contact: "daniel.mensah@example.com / +233 20 000 1111 / linkedin.com/in/daniel-mensah",
    notes: "Excellent systems experience. Open to remote-first roles."
  },
  {
    id: 103,
    name: "Priya Raman",
    role: "Recruitment Partner",
    location: "Manchester, UK",
    experience: "6 years",
    skills: ["Shortlisting", "Interview design", "Stakeholder management"],
    source: "cv",
    submittedAt: "May 28, 2026",
    summary: "Recruitment partner focused on shortlisting, interview design, and stakeholder communication for urgent hiring needs.",
    contact: "priya.raman@example.com / +44 7000 000222 / linkedin.com/in/priya-raman",
    notes: "Best fit for fast-moving recruitment projects."
  },
  {
    id: 104,
    name: "Daniel Mensah",
    role: "HR Operations Lead",
    location: "Accra, Ghana",
    experience: "7 years",
    skills: ["HRIS", "Employee records", "Onboarding"],
    source: "intent",
    submittedAt: "May 30, 2026",
    summary: "Likely duplicate submission from Daniel Mensah. Intent source should be reviewed before merging or deleting.",
    contact: "daniel.mensah@example.com / +233 20 000 1111 / linkedin.com/in/daniel-mensah",
    notes: "Duplicate check triggered by matching name and contact."
  }
];

let selectedProfileIds = [];
let activeProfileId = 101;
let deletedProfiles = [];
let selectedDeletedProfileIds = [];
let currentShortlist = {
  token: "sl-acme-7f42",
  requestId: 1,
  accessMode: "standard",
  organization: "Acme Healthcare",
  title: "Operations Manager shortlist",
  annualGrossPay: 85000,
  feeRate: 0.005,
  profileIds: [],
  clientSelectedProfileIds: [],
  paymentComplete: false,
  requestSubmitted: false,
  redactedProfiles: []
};

const pageTitle = document.querySelector("#page-title");
const sections = document.querySelectorAll(".section");
const navItems = document.querySelectorAll(".nav-item");
const toast = document.querySelector("#toast");
const shareUrl = document.querySelector("#share-url");
const topbarActions = document.querySelectorAll(".topbar-action");
const clientPaymentButton = document.querySelector("#client-payment-button");
const authPanel = document.querySelector("#auth-panel");
const authForm = document.querySelector("#auth-form");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const signOutButton = document.querySelector("#sign-out");
let supabaseSession = null;

const titles = {
  dashboard: "Admin dashboard",
  requests: "Shortlist requests",
  profiles: "Profile bucket",
  shortlists: "Shortlist builder",
  preview: "Client shortlist view",
  deleted: "Deleted bucket"
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function getSupabaseClient() {
  return window.urgentRecruiteSupabase || null;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function toIsoDateLabel(value) {
  return value ? new Date(value).toLocaleDateString() : "Supabase";
}

function sanitizeFileName(fileName) {
  return String(fileName || "upload")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function hasUploadedFile(file) {
  return file instanceof File && Boolean(file.name);
}

async function uploadSupabaseFile(file, bucket, folder) {
  const client = getSupabaseClient();
  if (!client || !hasUploadedFile(file)) return { path: "", name: file?.name || "" };

  const path = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { data, error } = await client.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (error) throw error;
  return { path: data.path, name: file.name };
}

function parseMoney(value) {
  const amount = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function countWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function redactContactText(value) {
  return String(value || "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email hidden]")
    .replace(/\b(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s,;]+/gi, "[LinkedIn hidden]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[phone hidden]")
    .split(/\n+/)
    .filter((line) => !/^\s*(email|e-mail|phone|mobile|telephone|tel|address|linkedin|contact)\b\s*[:,-]/i.test(line))
    .join("\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function clientSafeText(value, fallback = "Details are being prepared by the recruitment team.") {
  return redactContactText(value) || fallback;
}

function clientSafeSkills(skills) {
  return (Array.isArray(skills) ? skills : [])
    .map((skill) => clientSafeText(skill, ""))
    .filter(Boolean);
}

function isWeakClientText(value) {
  const text = String(value || "").trim().toLowerCase();
  return !text
    || text.includes("being prepared")
    || text.includes("to be confirmed")
    || text.includes("will be extracted")
    || text.includes("will be expanded")
    || text.includes("cv parsing is required")
    || text.includes("no profile summary")
    || text.includes("not provided");
}

function professionalSourceText(profile = {}) {
  return [
    profile.clientBrief,
    profile.summary,
    profile.experienceDetails,
    profile.cvTextExcerpt,
    profile.projects,
    profile.certifications,
    profile.education,
    profile.achievements,
    Array.isArray(profile.skills) ? profile.skills.join(", ") : profile.skills
  ]
    .map((value) => redactContactText(value))
    .filter((value) => value && !isWeakClientText(value))
    .join("\n\n");
}

function isLikelyHeading(line) {
  const normalized = String(line || "").trim();
  return normalized.length > 2
    && normalized.length < 70
    && /^[A-Z0-9 &/().'-]+$/.test(normalized)
    && /[A-Z]/.test(normalized);
}

function extractSectionFromText(text, headings) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const normalizedHeadings = headings.map((heading) => heading.toLowerCase());
  const startIndex = lines.findIndex((line) => {
    const normalized = line.replace(/[:\-]+$/, "").toLowerCase();
    return normalizedHeadings.some((heading) => normalized === heading || normalized.includes(heading));
  });

  if (startIndex < 0) return "";

  const output = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (output.length && isLikelyHeading(lines[index])) break;
    output.push(lines[index]);
  }

  return clientSafeText(output.join("\n"), "");
}

function firstUsefulSentences(text, maximumSentences = 3) {
  const source = clientSafeText(text, "");
  if (!source) return "";
  const sentences = source
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, maximumSentences);
  return sentences.join(" ");
}

function redactedDetail(profile, directValue, headings, fallback, sentenceLimit = 4) {
  const direct = clientSafeText(directValue, "");
  if (direct && !isWeakClientText(direct)) return direct;

  const source = professionalSourceText(profile);
  const extracted = extractSectionFromText(source, headings);
  if (extracted && !isWeakClientText(extracted)) return extracted;

  const excerpt = firstUsefulSentences(source, sentenceLimit);
  if (excerpt && !isWeakClientText(excerpt)) return excerpt;

  return fallback;
}

function limitWords(value, maximumWords = 300) {
  const words = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (words.length <= maximumWords) return words.join(" ");
  return `${words.slice(0, maximumWords).join(" ")}...`;
}

function briefLine(label, value) {
  const cleanValue = clientSafeText(value, "");
  if (!cleanValue || isWeakClientText(cleanValue)) return "";
  return `${label}: ${cleanValue}`;
}

function getClientCandidateBrief(profile) {
  const direct = clientSafeText(profile?.clientBrief, "");
  if (direct && !isWeakClientText(direct)) return limitWords(direct, 300);

  const experienceBrief = redactedDetail(
    profile,
    profile?.experienceDetails,
    ["work experience", "employment history", "professional experience", "experience"],
    "",
    8
  );
  const summaryBrief = redactedDetail(
    profile,
    profile?.summary,
    ["objective", "profile summary", "professional summary", "summary"],
    "",
    4
  );

  const brief = [
    briefLine("Professional profile", summaryBrief),
    briefLine("Experience brief", experienceBrief || profile?.experience),
    briefLine("Academic and certification summary", [profile?.education, profile?.certifications].filter(Boolean).join("\n")),
    briefLine("Projects and achievements", [profile?.projects, profile?.achievements].filter(Boolean).join("\n")),
    briefLine("Core skills", clientSafeSkills(profile?.skills || []).join(", "))
  ].filter(Boolean).join("\n\n");

  if (brief) return limitWords(brief, 300);

  const source = professionalSourceText(profile);
  const sourceBrief = firstUsefulSentences(source, 8);
  if (sourceBrief && !isWeakClientText(sourceBrief)) return limitWords(sourceBrief, 300);

  return "CV parsing is required before a complete redacted candidate profile brief can be shown.";
}

function formatMoney(amount) {
  const value = Number(amount) || 0;
  if (!value) return "Not provided";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

function getRelatedRequestForShortlist() {
  return requests.find((request) => String(request.id) === String(currentShortlist.requestId))
    || requests.find((request) => request.organization === currentShortlist.organization)
    || null;
}

function getRequestEmail(request) {
  const candidates = [request?.workEmail, request?.email, request?.contact].filter(Boolean);
  return candidates.find((value) => String(value).includes("@")) || "";
}

function isFreeInternRequest(request) {
  const status = String(request?.paymentStatus || request?.accessMode || "").toLowerCase();
  const role = String(request?.role || request?.title || "").toLowerCase();
  return status === "free_intern"
    || status === "intern"
    || status === "free-intern"
    || role.includes("intern shortlist")
    || role.includes("internship");
}

function getShortlistAccessMode() {
  if (currentShortlist.accessMode) return currentShortlist.accessMode;
  return isFreeInternRequest(getRelatedRequestForShortlist()) ? "intern" : "standard";
}

function isInternShortlist() {
  return getShortlistAccessMode() === "intern";
}

function getGrossPayBasis() {
  const relatedRequest = getRelatedRequestForShortlist();
  return Number(currentShortlist.annualGrossPay || relatedRequest?.annualGrossPay || 0);
}

function calculateShortlistFee(selectedCount, grossPay = getGrossPayBasis(), accessMode = getShortlistAccessMode()) {
  if (accessMode === "intern") {
    return {
      feePerProfile: 0,
      totalFee: 0,
      appliedRate: 0
    };
  }

  const count = Math.max(0, Number(selectedCount) || 0);
  const pay = Math.max(0, Number(grossPay) || 0);
  const appliedProfiles = Math.min(count, 5);
  const feePerProfile = pay * 0.001;

  return {
    feePerProfile,
    totalFee: feePerProfile * appliedProfiles,
    appliedRate: appliedProfiles * 0.001
  };
}

function getClientSafeSummary(profile) {
  return getClientCandidateBrief(profile);
}

function getRedactedParsedSections(profile) {
  return [
    ["Experience details", profile.experienceDetails || profile.cvTextExcerpt],
    ["Companies and roles", profile.achievements],
    ["Certifications", profile.certifications],
    ["Projects", profile.projects],
    ["Education", profile.education],
    ["Skills", Array.isArray(profile.skills) ? profile.skills.join(", ") : profile.skills]
  ]
    .map(([label, value]) => [label, clientSafeText(value, "")])
    .filter(([, value]) => value);
}

function redactProfile(profile, index = 0) {
  const safeSummary = getClientSafeSummary(profile);

  return {
    id: profile.id,
    safeForClient: true,
    name: `Profile ${index + 1}`,
    role: clientSafeText(profile.role, "Candidate profile"),
    location: clientSafeText(profile.location, "Location not provided"),
    experience: clientSafeText(profile.experience, "Experience not provided"),
    skills: clientSafeSkills(profile.skills),
    clientBrief: safeSummary,
    summary: safeSummary,
    experienceDetails: redactedDetail(profile, profile.experienceDetails, ["work experience", "experience", "employment history"], safeSummary, 6),
    certifications: redactedDetail(profile, profile.certifications, ["certifications", "certificates", "training", "qualifications"], "", 4),
    projects: redactedDetail(profile, profile.projects, ["projects", "campaigns", "initiatives", "portfolio"], "", 4),
    education: redactedDetail(profile, profile.education, ["education", "academic background", "qualifications"], "", 5),
    achievements: redactedDetail(profile, profile.achievements, ["skills and competencies", "competencies", "additional strengths", "languages", "achievements"], "", 5),
    notes: "Contact details are hidden until payment is confirmed."
  };
}

function buildClientProfile(profile, index = 0, accessMode = getShortlistAccessMode()) {
  if (accessMode !== "intern") {
    return redactProfile(profile, index);
  }

  const profileSummary = redactedDetail(
    profile,
    profile.summary,
    ["objective", "profile summary", "professional summary", "summary"],
    "Intern profile summary is available after CV parsing in the admin.",
    3
  );

  return {
    id: profile.id,
    safeForClient: true,
    accessMode: "intern",
    fullProfileAvailable: true,
    name: `Intern Profile ${index + 1}`,
    role: clientSafeText(profile.role, "Intern profile"),
    location: clientSafeText(profile.location, "Location not provided"),
    experience: clientSafeText(profile.experience, "Experience not provided"),
    skills: clientSafeSkills(profile.skills),
    clientBrief: profileSummary,
    summary: profileSummary,
    experienceDetails: redactedDetail(profile, profile.experienceDetails, ["work experience", "experience", "employment history"], profileSummary, 6),
    certifications: redactedDetail(profile, profile.certifications, ["certifications", "certificates", "training", "qualifications"], "", 4),
    projects: redactedDetail(profile, profile.projects, ["projects", "campaigns", "initiatives", "portfolio"], "", 4),
    education: redactedDetail(profile, profile.education, ["education", "academic background", "qualifications"], "", 5),
    achievements: redactedDetail(profile, profile.achievements, ["skills and competencies", "competencies", "additional strengths", "languages", "achievements"], "", 5),
    notes: "Full intern profile shared for organization review. Direct candidate contact details are handled by Urgent Recruite."
  };
}

function getShortlistProfiles() {
  return currentShortlist.profileIds
    .map((id) => profiles.find((profile) => String(profile.id) === String(id)))
    .filter(Boolean);
}

function getDuplicateIds() {
  const seen = new Map();
  const duplicateIds = new Set();

  profiles.forEach((profile) => {
    const key = `${String(profile.name || "").toLowerCase()}|${String(profile.contact || "").toLowerCase()}`;
    if (seen.has(key)) {
      duplicateIds.add(profile.id);
      duplicateIds.add(seen.get(key));
    } else {
      seen.set(key, profile.id);
    }
  });

  return duplicateIds;
}

function getRequestActivity(request) {
  return {
    pushedProfiles: request.pushedProfileIds?.length || 0,
    sharedLinks: request.linkSharedCount || 0,
    viewed: Boolean(request.viewed),
    intakeComplete: Boolean(request.intakeComplete),
    clientResponse: request.clientResponse || null,
    paymentStatus: request.paymentStatus || "unpaid"
  };
}

function getRequestStatus(request) {
  const activity = getRequestActivity(request);

  if (!activity.viewed) return "Not viewed yet";
  if (activity.paymentStatus === "paid") return "Payment received";
  if (activity.clientResponse === "responded") return "Client responded";
  if (activity.sharedLinks > 0) return "Shortlist sent";
  if (activity.pushedProfiles >= 3) return "Ready to share";
  if (activity.pushedProfiles > 0 || activity.intakeComplete) return "Sourcing";
  return "Awaiting intake";
}

function getRequestActivityText(request) {
  const activity = getRequestActivity(request);
  return `${activity.pushedProfiles} profiles pushed / ${activity.sharedLinks} links shared`;
}

function getOpenRequests() {
  return requests.filter((request) => !["closed", "completed", "archived"].includes(String(request.workflowState || "").toLowerCase()));
}

function mapSupabaseProfile(row) {
  return {
    id: row.id,
    name: row.full_name || "Unnamed candidate",
    role: row.role || "Candidate profile",
    location: row.location || "Location not provided",
    experience: row.experience || "Experience not provided",
    skills: Array.isArray(row.skills) && row.skills.length ? row.skills : [row.role || "General profile"].filter(Boolean),
    source: row.source === "intent" ? "intent" : "cv",
    submittedAt: toIsoDateLabel(row.created_at),
    summary: row.summary || "No profile summary provided yet.",
    clientBrief: row.client_brief || "",
    contact: row.contact_details || [row.email, row.phone, row.linkedin].filter(Boolean).join(" / ") || "No contact details provided",
    notes: row.notes || (row.cv_file_name ? `Uploaded file: ${row.cv_file_name}` : "Saved in Supabase"),
    cvFilePath: row.cv_file_path || "",
    cvFileName: row.cv_file_name || "",
    wordCount: row.word_count || 0,
    parseStatus: row.parse_status || "pending",
    parserError: row.parser_error || "",
    parsedAt: row.parsed_at ? toIsoDateLabel(row.parsed_at) : "",
    atsScore: row.ats_score || 0,
    experienceDetails: row.experience_details || "",
    certifications: row.certifications || "",
    projects: row.projects || "",
    education: row.education || "",
    achievements: row.achievements || "",
    cvTextExcerpt: row.cv_text_excerpt || ""
  };
}

function mapSupabaseRequest(row) {
  return {
    id: row.id,
    organization: row.organization || "Unnamed organization",
    contact: row.contact_name || row.work_email || "No contact provided",
    contactName: row.contact_name || "",
    workEmail: row.work_email || "",
    role: row.job_title || "Shortlist request",
    requested: toIsoDateLabel(row.created_at),
    annualGrossPay: Number(row.annual_gross_pay || 0),
    jobDescription: row.job_description || "",
    jobSpecification: row.job_specification || "",
    generatedBrief: row.generated_brief || "",
    jobDocument: row.job_document_name || "",
    viewed: Boolean(row.viewed),
    intakeComplete: Boolean(row.intake_complete),
    pushedProfileIds: [],
    linkSharedCount: row.link_shared_count || 0,
    clientResponse: row.client_response || null,
    paymentStatus: row.payment_status || "unpaid",
    accessMode: row.payment_status === "free_intern" ? "intern" : "standard",
    workflowState: row.workflow_state || "open"
  };
}

function mapDeletedProfile(row) {
  return {
    id: row.id,
    name: row.full_name || "Unnamed candidate",
    role: row.role || "Candidate profile",
    location: row.location || "Location not provided",
    experience: row.experience || "Experience not provided",
    source: row.source === "intent" ? "Intern" : "CV submit",
    summary: row.summary || "No profile summary provided.",
    clientBrief: row.client_brief || "",
    contact: row.contact_details || [row.email, row.phone, row.linkedin].filter(Boolean).join(" / ") || "No contact details provided",
    notes: row.notes || "",
    reason: row.deletion_reason || "Deleted from admin",
    wordCount: row.word_count || 0,
    deletedAt: toIsoDateLabel(row.deleted_at || row.created_at),
    deleteAfter: toIsoDateLabel(row.delete_after),
    parseStatus: row.parse_status || "rejected",
    parserError: row.parser_error || "",
    atsScore: row.ats_score || 0,
    experienceDetails: row.experience_details || "",
    certifications: row.certifications || "",
    projects: row.projects || "",
    education: row.education || "",
    achievements: row.achievements || "",
    cvFileName: row.cv_file_name || "",
    cvFilePath: row.cv_file_path || ""
  };
}

function profileToSupabaseRow(profile) {
  const contactParts = String(profile.contact || "").split("/").map((part) => part.trim());
  return {
    full_name: profile.name || "Unnamed candidate",
    role: profile.role || "Candidate profile",
    location: profile.location || "",
    experience: profile.experience || "",
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    source: profile.source === "intent" ? "intent" : "cv",
    summary: profile.summary || "",
    client_brief: profile.clientBrief || "",
    contact_details: profile.contact || "",
    email: contactParts.find((part) => part.includes("@")) || "",
    phone: contactParts.find((part) => part.startsWith("+")) || "",
    linkedin: contactParts.find((part) => part.includes("linkedin")) || "",
    notes: profile.notes || "",
    cv_file_name: profile.cvFileName || "",
    cv_file_path: profile.cvFilePath || "",
    word_count: profile.wordCount || 0,
    parse_status: profile.parseStatus || (profile.cvFilePath ? "pending" : "failed"),
    parser_error: profile.parserError || "",
    ats_score: profile.atsScore || 0,
    experience_details: profile.experienceDetails || "",
    certifications: profile.certifications || "",
    projects: profile.projects || "",
    education: profile.education || "",
    achievements: profile.achievements || "",
    cv_text_excerpt: profile.cvTextExcerpt || ""
  };
}

async function loadSupabaseData() {
  const client = getSupabaseClient();
  if (!client || !supabaseSession) return false;

  const [profileResult, requestResult, pushedResult, deletedResult] = await Promise.all([
    client.from("profiles").select("*").order("created_at", { ascending: false }),
    client.from("shortlist_requests").select("*").order("created_at", { ascending: false }),
    client.from("request_profiles").select("*"),
    client.from("deleted_profiles").select("*").order("deleted_at", { ascending: false })
  ]);

  if (profileResult.error) throw profileResult.error;
  if (requestResult.error) throw requestResult.error;
  if (pushedResult.error) throw pushedResult.error;
  if (deletedResult.error) throw deletedResult.error;

  if (Array.isArray(profileResult.data)) {
    profiles = profileResult.data.map(mapSupabaseProfile);
    activeProfileId = profiles[0]?.id || null;
    selectedProfileIds = [];
  }

  if (requestResult.data) {
    requests.length = 0;
    requests.push(...requestResult.data.map(mapSupabaseRequest));
  }

  if (pushedResult.data?.length) {
    requests.forEach((request) => {
      request.pushedProfileIds = pushedResult.data
        .filter((row) => String(row.request_id) === String(request.id))
        .map((row) => row.profile_id);
    });
  }

  deletedProfiles = (deletedResult.data || []).map(mapDeletedProfile);

  if (requests.length) {
    const request = requests[0];
    const accessMode = isFreeInternRequest(request) ? "intern" : "standard";
    selectedProfileIds = request.pushedProfileIds || [];
    currentShortlist = {
      ...currentShortlist,
      requestId: request.id,
      organization: request.organization,
      title: `${request.role} shortlist`,
      accessMode,
      annualGrossPay: request.annualGrossPay || 0,
      feeRate: accessMode === "intern" ? 0 : 0.005,
      profileIds: selectedProfileIds,
      clientSelectedProfileIds: [],
      paymentComplete: accessMode === "intern",
      redactedProfiles: []
    };
  }

  return true;
}

function profileMatchesFilters(profile) {
  const filters = {
    name: document.querySelector("#filter-name")?.value.trim().toLowerCase() || "",
    location: document.querySelector("#filter-location")?.value.trim().toLowerCase() || "",
    experience: document.querySelector("#filter-experience")?.value.trim().toLowerCase() || "",
    keyword: document.querySelector("#filter-keyword")?.value.trim().toLowerCase() || ""
  };

  const searchable = [
    profile.name,
    profile.role,
    profile.location,
    profile.experience,
    profile.summary,
    profile.experienceDetails,
    profile.certifications,
    profile.projects,
    profile.education,
    profile.achievements,
    profile.cvTextExcerpt,
    profile.notes,
    profile.skills.join(" ")
  ].join(" ").toLowerCase();

  return (!filters.name || profile.name.toLowerCase().includes(filters.name))
    && (!filters.location || profile.location.toLowerCase().includes(filters.location))
    && (!filters.experience || profile.experience.toLowerCase().includes(filters.experience))
    && (!filters.keyword || searchable.includes(filters.keyword));
}

function getParseStatusLabel(profile) {
  if (!profile.cvFilePath && !profile.parseStatus) return "No CV file";
  const status = String(profile.parseStatus || "pending").toLowerCase();
  if (status === "parsed") return "Parsed";
  if (status === "processing") return "Parsing";
  if (status === "rejected") return "Rejected";
  if (status === "failed") return "Parse failed";
  return "Pending parse";
}

function getParseStatusClass(profile) {
  if (!profile.cvFilePath && !profile.parseStatus) return "pending";
  const status = String(profile.parseStatus || "pending").toLowerCase();
  if (status === "parsed") return "parsed";
  if (status === "processing") return "processing";
  if (status === "rejected") return "failed";
  if (status === "failed") return "failed";
  return "pending";
}

function loadFrontendSubmissions() {
  const storedProfiles = JSON.parse(localStorage.getItem("urgentRecruiteProfiles") || "[]");
  const storedRequests = JSON.parse(localStorage.getItem("urgentRecruiteShortlistRequests") || "[]");
  const storedDeletedProfiles = JSON.parse(localStorage.getItem("urgentRecruiteDeletedProfiles") || "[]");

  storedProfiles.forEach((submission, index) => {
    const id = `frontend-profile-${submission.submittedAt || index}`;
    if (profiles.some((profile) => profile.id === id)) return;

    profiles.push({
      id,
      name: submission.fullName || "Unnamed candidate",
      role: submission.field || "Candidate profile",
      location: submission.country || "Location not provided",
      experience: submission.experience || "Experience not provided",
      skills: [submission.field || "General profile"].filter(Boolean),
      source: submission.source === "intent" ? "intent" : "cv",
      submittedAt: submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "Frontend submission",
      summary: submission.summary || "No profile summary provided yet.",
      clientBrief: submission.clientBrief || submission.client_brief || "",
      contact: [submission.email, submission.phone, submission.linkedin].filter(Boolean).join(" / ") || "No contact details provided",
      notes: submission.cvFile ? `Uploaded file: ${submission.cvFile}` : "Submitted from landing page"
    });
  });

  storedRequests.forEach((submission, index) => {
    const id = `frontend-request-${submission.submittedAt || index}`;
    if (requests.some((request) => request.id === id)) return;

    requests.push({
      id,
      organization: submission.companyName || "Unnamed organization",
      contact: submission.contactName || submission.workEmail || "No contact provided",
      contactName: submission.contactName || "",
      workEmail: submission.workEmail || "",
      role: submission.jobTitle || "Shortlist request",
      requested: submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "Frontend submission",
      annualGrossPay: parseMoney(submission.annualPay),
      jobDescription: submission.jobDescription || "",
      jobSpecification: submission.jobSpecification || "",
      generatedBrief: submission.generatedBrief || "",
      jobDocument: submission.jobDocument || "",
      viewed: false,
      intakeComplete: false,
      pushedProfileIds: [],
      linkSharedCount: 0,
      clientResponse: null,
      paymentStatus: submission.source === "intern-request" ? "free_intern" : "unpaid",
      accessMode: submission.source === "intern-request" ? "intern" : "standard"
    });
  });

  storedDeletedProfiles.forEach((submission, index) => {
    const id = `frontend-deleted-${submission.submittedAt || index}`;
    if (deletedProfiles.some((profile) => profile.id === id)) return;

    deletedProfiles.push({
      id,
      name: submission.full_name || "Unnamed candidate",
      role: submission.role || "Candidate profile",
      location: submission.location || "Location not provided",
      experience: submission.experience || "Experience not provided",
      source: submission.source === "intent" ? "Intern" : "CV submit",
      summary: submission.summary || "No profile summary provided.",
      clientBrief: submission.clientBrief || submission.client_brief || "",
      contact: submission.contact_details || "No contact details provided",
      notes: submission.notes || "",
      reason: submission.deletion_reason || "Less than 200 written profile words",
      wordCount: submission.word_count || 0,
      deletedAt: submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "Frontend",
      deleteAfter: submission.delete_after ? new Date(submission.delete_after).toLocaleDateString() : "90 days"
    });
  });
}

function encodeSharePayload(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeSharePayload(value) {
  const base64 = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function getClientVisibleProfiles() {
  if (currentShortlist.redactedProfiles?.length) {
    return currentShortlist.redactedProfiles;
  }

  return getShortlistProfiles().map((profile, index) => buildClientProfile(profile, index));
}

function buildSharePayload() {
  const relatedRequest = getRelatedRequestForShortlist();
  const accessMode = getShortlistAccessMode();
  const redactedProfiles = getShortlistProfiles().map((profile, index) => buildClientProfile(profile, index, accessMode));

  return {
    token: currentShortlist.token,
    requestId: currentShortlist.requestId || relatedRequest?.id || "",
    accessMode,
    clientEmail: currentShortlist.clientEmail || getRequestEmail(relatedRequest),
    organization: currentShortlist.organization,
    title: currentShortlist.title,
    annualGrossPay: getGrossPayBasis(),
    feeRate: accessMode === "intern" ? 0 : 0.005,
    paymentComplete: accessMode === "intern",
    profiles: redactedProfiles
  };
}

function storeSharedShortlist(payload = buildSharePayload()) {
  const stored = JSON.parse(localStorage.getItem("urgentRecruiteSharedShortlists") || "{}");
  stored[payload.token] = payload;
  localStorage.setItem("urgentRecruiteSharedShortlists", JSON.stringify(stored));
  return payload;
}

async function saveCurrentShortlistToSupabase() {
  const client = getSupabaseClient();
  if (!client || !supabaseSession) return false;

  const payload = buildSharePayload();
  const requestId = isUuid(currentShortlist.requestId) ? currentShortlist.requestId : null;
  const { data: shortlist, error: shortlistError } = await client
    .from("shortlists")
    .upsert({
      token: payload.token,
      request_id: requestId,
      organization: payload.organization,
      title: payload.title,
      annual_gross_pay: payload.annualGrossPay || null,
      fee_rate: payload.feeRate ?? 0.005,
      payment_complete: Boolean(payload.paymentComplete)
    }, { onConflict: "token" })
    .select("id")
    .single();

  if (shortlistError) throw shortlistError;

  await client.from("shortlist_profiles").delete().eq("shortlist_id", shortlist.id);

  const profileRows = currentShortlist.profileIds
    .filter((profileId) => isUuid(profileId))
    .map((profileId) => ({
      shortlist_id: shortlist.id,
      profile_id: profileId
    }));

  if (profileRows.length) {
    const { error: profileError } = await client.from("shortlist_profiles").insert(profileRows);
    if (profileError) throw profileError;
  }

  if (requestId) {
    await client
      .from("shortlist_requests")
      .update({
        viewed: true,
        intake_complete: true,
        link_shared_count: getRelatedRequestForShortlist()?.linkSharedCount || 1
      })
      .eq("id", requestId);
  }

  return true;
}

async function loadPublicShortlistFromSupabase(token) {
  const client = getSupabaseClient();
  if (!client || !token) return false;

  const { data, error } = await client.rpc("get_public_shortlist", {
    public_token: token
  });

  if (error || !data || !data.token) return false;

  currentShortlist = {
    ...currentShortlist,
    token: data.token,
    organization: data.organization || "Client shortlist",
    title: data.title || "Shared profiles",
    accessMode: data.accessMode || "standard",
    clientEmail: data.clientEmail || "",
    annualGrossPay: Number(data.annualGrossPay || 0),
    feeRate: Number(data.feeRate ?? 0.005),
    profileIds: (data.profiles || []).map((profile) => profile.id),
    clientSelectedProfileIds: [],
    paymentComplete: Boolean(data.paymentComplete || data.accessMode === "intern"),
    requestSubmitted: false,
    redactedProfiles: data.profiles || []
  };

  return true;
}

function getStoredShortlist(token) {
  const stored = JSON.parse(localStorage.getItem("urgentRecruiteSharedShortlists") || "{}");
  return stored[token] || null;
}

function buildShareUrl() {
  const payload = buildSharePayload();
  const encoded = encodeSharePayload(payload);
  return `${window.location.href.split("#")[0]}#shortlist=${encodeURIComponent(payload.token)}&payload=${encoded}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    shareUrl.select();
    showToast("Link selected for copying");
  }
}

async function sendEmailNotification(type, payload) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.configured === false) {
    throw new Error(result.error || "Email service is not configured.");
  }

  return result;
}

function setSection(sectionId) {
  sections.forEach((section) => section.classList.toggle("active", section.id === sectionId));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.section === sectionId));
  topbarActions.forEach((action) => {
    action.hidden = action.dataset.visibleSection !== sectionId;
  });
  pageTitle.textContent = titles[sectionId];
}

function renderMetrics() {
  document.querySelector("#metric-requests").textContent = getOpenRequests().length;
  document.querySelector("#metric-profiles").textContent = profiles.length;
  document.querySelector("#metric-shortlists").textContent = requests.reduce((total, request) => total + (request.linkSharedCount || 0), 0);
  document.querySelector("#metric-intents").textContent = profiles.filter((profile) => profile.source === "intent").length;
  document.querySelector("#metric-deleted").textContent = deletedProfiles.length;
  shareUrl.value = buildShareUrl();
}

function requestText(value, fallback = "Not provided") {
  const cleanValue = String(value ?? "").trim();
  return cleanValue || fallback;
}

function renderRequestDetailItem(label, value) {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(requestText(value))}</strong>
    </div>
  `;
}

function renderRequestLongDetail(label, value) {
  const cleanValue = requestText(value, "");
  if (!cleanValue) return "";
  return `
    <section class="request-detail-text">
      <h4>${escapeHtml(label)}</h4>
      <p>${escapeHtml(cleanValue)}</p>
    </section>
  `;
}

function renderRequestCard(request) {
  const status = getRequestStatus(request);
  const pushedCount = request.pushedProfileIds?.length || 0;
  const requestType = isFreeInternRequest(request) ? "Free intern request" : "Paid shortlist request";
  const detailBlocks = [
    renderRequestLongDetail("Job description", request.jobDescription),
    renderRequestLongDetail("Job specification", request.jobSpecification),
    renderRequestLongDetail("Generated advert / brief", request.generatedBrief),
    renderRequestLongDetail("Uploaded JD / document", request.jobDocument)
  ].join("");

  return `
    <details class="request-card request-card-expandable">
      <summary class="request-card-summary">
        <div>
          <h3>${escapeHtml(request.organization)}</h3>
          <div class="meta">${escapeHtml(request.role)} / ${escapeHtml(request.contact)}<br>Requested ${escapeHtml(request.requested)}<br>${escapeHtml(getRequestActivityText(request))}</div>
        </div>
        <span class="status-pill">${escapeHtml(status)}</span>
      </summary>
      <div class="request-card-details">
        <div class="request-detail-grid">
          ${renderRequestDetailItem("Request type", requestType)}
          ${renderRequestDetailItem("Contact name", request.contactName || request.contact)}
          ${renderRequestDetailItem("Work email", request.workEmail)}
          ${renderRequestDetailItem("Annual gross pay", formatMoney(request.annualGrossPay))}
          ${renderRequestDetailItem("Profiles pushed", pushedCount)}
          ${renderRequestDetailItem("Links shared", request.linkSharedCount || 0)}
          ${renderRequestDetailItem("Payment status", request.paymentStatus)}
          ${renderRequestDetailItem("Workflow state", request.workflowState || "open")}
        </div>
        ${detailBlocks || `<p class="meta">No additional request brief has been supplied yet.</p>`}
      </div>
    </details>
  `;
}

function renderRequests() {
  const dashboardRequests = document.querySelector("#dashboard-requests");
  const requestsTable = document.querySelector("#requests-table");

  dashboardRequests.innerHTML = requests.map(renderRequestCard).join("");
  requestsTable.innerHTML = requests.map(renderRequestCard).join("");
}

function renderStatusSummary() {
  const summary = document.querySelector("#status-summary");
  const statusCounts = requests.reduce((counts, request) => {
    const status = getRequestStatus(request);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  const preferredOrder = [
    "Not viewed yet",
    "Awaiting intake",
    "Sourcing",
    "Ready to share",
    "Shortlist sent",
    "Client responded",
    "Payment received"
  ];

  summary.innerHTML = preferredOrder
    .filter((status) => statusCounts[status])
    .map((status) => `
      <div class="status-summary-row">
        <strong>${escapeHtml(status)}</strong>
        <span>${statusCounts[status]}</span>
      </div>
    `).join("");
}

async function openCvForProfile(profileId) {
  const profile = profiles.find((item) => String(item.id) === String(profileId));
  if (!profile) return;

  activeProfileId = profile.id;
  renderProfileSummary();

  if (!profile.cvFilePath) {
    showToast("Profile summary opened. No CV file is attached yet.");
    return;
  }

  const client = getSupabaseClient();
  if (!client || !supabaseSession) {
    showToast("Sign in to open private CV files.");
    return;
  }

  const { data, error } = await client.storage
    .from("candidate-cvs")
    .createSignedUrl(profile.cvFilePath, 300);

  if (error || !data?.signedUrl) {
    showToast("Could not open CV file. Check storage permissions.");
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener");
}

async function moveProfileToDeleted(profileId, reason = "Deleted from admin") {
  const profile = profiles.find((item) => String(item.id) === String(profileId));
  if (!profile) return;

  const deletedProfile = {
    id: `deleted-${profile.id}-${Date.now()}`,
    name: profile.name,
    role: profile.role,
    location: profile.location,
    experience: profile.experience,
    source: profile.source === "intent" ? "Intern" : "CV submit",
    summary: profile.summary,
    clientBrief: profile.clientBrief || "",
    contact: profile.contact,
    notes: profile.notes,
    reason,
    wordCount: profile.wordCount || countWords(profile.summary),
    deletedAt: new Date().toLocaleDateString(),
    deleteAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    parseStatus: profile.parseStatus || "rejected",
    parserError: profile.parserError || "",
    atsScore: profile.atsScore || 0,
    experienceDetails: profile.experienceDetails || "",
    certifications: profile.certifications || "",
    projects: profile.projects || "",
    education: profile.education || "",
    achievements: profile.achievements || "",
    cvFileName: profile.cvFileName || "",
    cvFilePath: profile.cvFilePath || ""
  };

  const client = getSupabaseClient();
  if (client && supabaseSession) {
    const { error: insertError } = await client.from("deleted_profiles").insert({
      full_name: profile.name,
      email: "",
      phone: "",
      linkedin: "",
      role: profile.role,
      location: profile.location,
      experience: profile.experience,
      source: profile.source === "intent" ? "intent" : "cv",
      summary: profile.summary,
      client_brief: profile.clientBrief || "",
      word_count: deletedProfile.wordCount,
      contact_details: profile.contact,
      notes: profile.notes,
      deletion_reason: reason,
      delete_after: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      cv_file_name: profile.cvFileName || "",
      cv_file_path: profile.cvFilePath || "",
      parse_status: profile.parseStatus || "rejected",
      parser_error: profile.parserError || "",
      ats_score: profile.atsScore || 0,
      experience_details: profile.experienceDetails || "",
      certifications: profile.certifications || "",
      projects: profile.projects || "",
      education: profile.education || "",
      achievements: profile.achievements || "",
      cv_text_excerpt: profile.cvTextExcerpt || ""
    });

    if (insertError) {
      showToast("Could not move profile to deleted bucket.");
      return;
    }

    if (isUuid(profile.id)) {
      await client.from("request_profiles").delete().eq("profile_id", profile.id);
      await client.from("profiles").delete().eq("id", profile.id);
    }
  }

  deletedProfiles = [deletedProfile, ...deletedProfiles];
  profiles = profiles.filter((item) => String(item.id) !== String(profileId));
  requests.forEach((request) => {
    request.pushedProfileIds = (request.pushedProfileIds || []).filter((id) => String(id) !== String(profileId));
  });
  selectedProfileIds = selectedProfileIds.filter((id) => String(id) !== String(profileId));
  if (String(activeProfileId) === String(profileId)) {
    activeProfileId = profiles[0]?.id || null;
  }
  renderAll();
  showToast("Profile moved to deleted bucket");
}

async function parseProfileCv(profileId) {
  const profile = profiles.find((item) => String(item.id) === String(profileId));
  if (!profile) return false;

  const client = getSupabaseClient();
  if (!client || !supabaseSession) {
    showToast("Sign in to parse CV files.");
    return false;
  }

  if (!profile.cvFilePath) {
    showToast("No CV file is attached to this profile.");
    return false;
  }

  profile.parseStatus = "processing";
  renderProfiles();
  renderProfileSummary();
  showToast(`Parsing CV for ${profile.name}...`);

  const { data, error } = await client.functions.invoke("parse-profile", {
    body: { profileId: profile.id }
  });

  if (error) {
    profile.parseStatus = "failed";
    profile.parserError = error.message || "CV parsing failed.";
    renderProfiles();
    renderProfileSummary();
    showToast("CV parser failed. Check Edge Function deployment and secrets.");
    return false;
  }

  await loadSupabaseData();
  renderAll();

  if (data?.status === "rejected") {
    showToast(`Rejected: CV has ${data.wordCount || 0} words, below the ${data.minimumWords || 200}-word minimum.`);
  } else {
    showToast(`CV parsed: ${data?.wordCount || 0} words, ATS ${data?.atsScore || 0}/100.`);
  }

  return true;
}

async function parsePendingProfiles() {
  const pending = profiles.filter((profile) =>
    profile.cvFilePath && !["parsed", "processing"].includes(String(profile.parseStatus || "pending").toLowerCase())
  );

  if (!pending.length) {
    showToast("No pending CVs to parse.");
    return;
  }

  let parsedCount = 0;
  for (const profile of pending) {
    const parsed = await parseProfileCv(profile.id);
    if (parsed) parsedCount += 1;
  }

  showToast(`${parsedCount} pending CV${parsedCount === 1 ? "" : "s"} processed.`);
}

function renderProfiles() {
  const profileList = document.querySelector("#profile-list");
  const duplicateIds = getDuplicateIds();
  const openRequests = getOpenRequests();
  const visibleProfiles = profiles.filter(profileMatchesFilters);

  if (!visibleProfiles.length) {
    profileList.innerHTML = `<article class="profile-card"><p class="meta">No profiles match the current filters.</p></article>`;
    renderProfileSummary();
    return;
  }

  profileList.innerHTML = visibleProfiles.map((profile) => `
    <article class="profile-card ${String(profile.id) === String(activeProfileId) ? "selected" : ""}">
      <div class="profile-card-top">
        <div>
          <h3>${escapeHtml(profile.name)}</h3>
          <div class="meta">${escapeHtml(profile.role)} / ${escapeHtml(profile.location)} / ${escapeHtml(profile.experience)}<br>Submitted ${escapeHtml(profile.submittedAt)}</div>
        </div>
        <div class="profile-actions compact">
          <button class="ghost-button small profile-open" type="button" data-profile-id="${profile.id}">Open</button>
          <button class="ghost-button small profile-parse" type="button" data-profile-id="${profile.id}" ${profile.cvFilePath ? "" : "disabled"}>AI brief</button>
          <button class="danger-button small profile-delete" type="button" data-profile-id="${profile.id}">Delete</button>
        </div>
      </div>
      <div class="tag-list">${profile.skills.map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join("")}</div>
      <div class="flag-list">
        ${profile.source === "intent" ? `<span class="flag intent">Intern</span>` : ""}
        ${duplicateIds.has(profile.id) ? `<span class="flag duplicate">Duplicate</span>` : ""}
        <span class="flag ${getParseStatusClass(profile)}">${escapeHtml(getParseStatusLabel(profile))}</span>
        ${profile.wordCount ? `<span class="flag cv">${escapeHtml(profile.wordCount)} CV words</span>` : ""}
      </div>
      <div class="private-line">Private: ${escapeHtml(profile.contact)}</div>
      <div class="push-row">
        <select class="push-target" data-profile-id="${profile.id}" aria-label="Select shortlist request">
          ${openRequests.map((request) => `<option value="${request.id}">${escapeHtml(request.organization)} / ${escapeHtml(request.role)}</option>`).join("")}
        </select>
        <button class="primary-button small profile-push" type="button" data-profile-id="${profile.id}" ${openRequests.length ? "" : "disabled"}>Push</button>
      </div>
    </article>
  `).join("");

  profileList.querySelectorAll(".profile-open").forEach((button) => {
    button.addEventListener("click", async () => {
      activeProfileId = button.dataset.profileId;
      renderProfiles();
      await openCvForProfile(button.dataset.profileId);
    });
  });

  profileList.querySelectorAll(".profile-delete").forEach((button) => {
    button.addEventListener("click", async () => {
      await moveProfileToDeleted(button.dataset.profileId, "Deleted by admin");
    });
  });

  profileList.querySelectorAll(".profile-parse").forEach((button) => {
    button.addEventListener("click", async () => {
      await parseProfileCv(button.dataset.profileId);
    });
  });

  profileList.querySelectorAll(".profile-push").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.profileId;
      const select = profileList.querySelector(`.push-target[data-profile-id="${id}"]`);
      const requestId = select?.value;
      await pushProfileToRequest(id, requestId);
    });
  });

  renderProfileSummary();
}

async function pushProfileToRequest(profileId, requestId) {
  const profile = profiles.find((item) => String(item.id) === String(profileId));
  const request = requests.find((item) => String(item.id) === String(requestId));

  if (!profile || !request) {
    showToast("Select an open shortlist request first");
    return;
  }

  request.viewed = true;
  request.intakeComplete = true;
  request.pushedProfileIds = [...new Set([...(request.pushedProfileIds || []), profile.id])];

  const client = getSupabaseClient();
  if (client && supabaseSession && isUuid(request.id) && isUuid(profile.id)) {
    const { error } = await client.from("request_profiles").upsert({
      request_id: request.id,
      profile_id: profile.id
    }, { onConflict: "request_id,profile_id" });

    if (error) {
      showToast("Could not save push to Supabase.");
      return;
    }

    await client.from("shortlist_requests").update({
      viewed: true,
      intake_complete: true
    }).eq("id", request.id);
  }

  selectedProfileIds = request.pushedProfileIds;
  const accessMode = isFreeInternRequest(request) ? "intern" : "standard";
  currentShortlist = {
    ...currentShortlist,
    requestId: request.id,
    organization: request.organization,
    title: `${request.role} shortlist`,
    accessMode,
    annualGrossPay: request.annualGrossPay || 0,
    feeRate: accessMode === "intern" ? 0 : 0.005,
    profileIds: selectedProfileIds,
    clientSelectedProfileIds: [],
    paymentComplete: accessMode === "intern",
    redactedProfiles: []
  };

  renderAll();
  showToast(`${profile.name} pushed to ${request.organization}`);
}

function openNextNewRequest() {
  const request = requests.find((item) => !item.viewed) || requests.find((item) => getRequestStatus(item) === "Awaiting intake") || requests[0];

  if (!request) {
    showToast("No shortlist requests available");
    return;
  }

  request.viewed = true;
  const accessMode = isFreeInternRequest(request) ? "intern" : "standard";
  currentShortlist = {
    ...currentShortlist,
    requestId: request.id,
    organization: request.organization,
    title: `${request.role} shortlist`,
    accessMode,
    annualGrossPay: request.annualGrossPay || 0,
    feeRate: accessMode === "intern" ? 0 : 0.005,
    profileIds: request.pushedProfileIds || [],
    clientSelectedProfileIds: [],
    paymentComplete: accessMode === "intern",
    redactedProfiles: []
  };
  selectedProfileIds = currentShortlist.profileIds;
  renderAll();
  setSection("shortlists");
  showToast(`Opened ${request.organization} request`);
}

function downloadProfiles() {
  const blob = new Blob([JSON.stringify(profiles, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `urgent-recruite-profiles-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Profiles downloaded");
}

function formatFileSize(size) {
  if (!size) return "size not available";
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function inferProfileNameFromFileName(fileName) {
  const stem = String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(cv|resume|profile|candidate|urgent|recruite)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return titleCase(stem || "Uploaded Candidate");
}

function isJsonUpload(file) {
  return file.type.includes("json") || /\.json$/i.test(file.name);
}

async function normalizeUploadedFileProfile(file, index) {
  const isTextFile = file.type.startsWith("text/") || /\.(txt|rtf)$/i.test(file.name);
  let excerpt = "";

  if (isTextFile) {
    excerpt = (await file.text()).replace(/\s+/g, " ").trim().slice(0, 280);
  }

  return {
    id: `uploaded-file-${Date.now()}-${index}`,
    name: inferProfileNameFromFileName(file.name),
    role: "Uploaded CV",
    location: "Location not provided",
    experience: "Experience not provided",
    skills: ["Uploaded CV"],
    source: "cv",
    submittedAt: new Date().toLocaleDateString(),
    summary: excerpt
      ? `Uploaded text profile excerpt: ${excerpt}`
      : "Profile file uploaded from admin. Review the CV, then update the summary when backend parsing is connected.",
    clientBrief: "",
    contact: "Contact details are inside the uploaded file",
    notes: `Uploaded file: ${file.name} (${formatFileSize(file.size)})`,
    cvFileName: file.name,
    cvFilePath: "",
    wordCount: 0,
    parseStatus: "pending",
    _fileObject: file
  };
}

function normalizeUploadedProfile(profile, index) {
  return {
    id: profile.id || `uploaded-${Date.now()}-${index}`,
    name: profile.name || profile.fullName || "Unnamed candidate",
    role: profile.role || profile.field || "Candidate profile",
    location: profile.location || profile.country || "Location not provided",
    experience: profile.experience || "Experience not provided",
    skills: Array.isArray(profile.skills)
      ? profile.skills
      : String(profile.skills || profile.field || "General profile").split(",").map((skill) => skill.trim()).filter(Boolean),
    source: profile.source === "intent" ? "intent" : "cv",
    submittedAt: profile.submittedAt || new Date().toLocaleDateString(),
    summary: profile.summary || profile.notes || "No profile summary provided yet.",
    clientBrief: profile.clientBrief || profile.client_brief || "",
    contact: profile.contact || [profile.email, profile.phone, profile.linkedin].filter(Boolean).join(" / ") || "No contact details provided",
    notes: profile.notes || "Uploaded from admin",
    cvFileName: profile.cvFileName || profile.cv_file_name || "",
    cvFilePath: profile.cvFilePath || profile.cv_file_path || "",
    wordCount: profile.wordCount || profile.word_count || 0,
    parseStatus: profile.parseStatus || profile.parse_status || "pending",
    atsScore: profile.atsScore || profile.ats_score || 0,
    experienceDetails: profile.experienceDetails || profile.experience_details || "",
    certifications: profile.certifications || "",
    projects: profile.projects || "",
    education: profile.education || "",
    achievements: profile.achievements || ""
  };
}

function getProfilesFromJsonUpload(uploaded) {
  if (Array.isArray(uploaded)) return uploaded;
  if (Array.isArray(uploaded.profiles)) return uploaded.profiles;
  if (uploaded.name || uploaded.fullName || uploaded.role || uploaded.field) return [uploaded];
  return [];
}

function upsertUploadedProfiles(incomingProfiles) {
  incomingProfiles.forEach((profile) => {
    const existingIndex = profiles.findIndex((item) => String(item.id) === String(profile.id));
    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.push(profile);
    }
  });
}

async function saveUploadedProfilesToSupabase(incomingProfiles) {
  const client = getSupabaseClient();
  if (!client || !supabaseSession || !incomingProfiles.length) return false;

  const rows = [];
  for (const profile of incomingProfiles) {
    if (profile._fileObject) {
      const upload = await uploadSupabaseFile(profile._fileObject, "candidate-cvs", "admin-uploads");
      profile.cvFileName = upload.name;
      profile.cvFilePath = upload.path;
      profile.notes = `Uploaded file: ${upload.name}`;
    }

    rows.push(profileToSupabaseRow(profile));
  }

  const { data, error } = await client.from("profiles").insert(rows).select("*");
  if (error) throw error;

  if (data?.length) {
    const savedProfiles = data.map(mapSupabaseProfile);
    upsertUploadedProfiles(savedProfiles);
    activeProfileId = savedProfiles[0].id;
  }

  return true;
}

async function uploadProfiles(fileInput) {
  const fileList = Array.isArray(fileInput)
    ? fileInput
    : fileInput?.length !== undefined && !fileInput.name
      ? Array.from(fileInput)
      : [fileInput].filter(Boolean);

  if (!fileList.length) return;

  const normalizedProfiles = [];

  for (const [fileIndex, file] of fileList.entries()) {
    if (isJsonUpload(file)) {
      try {
        const uploaded = JSON.parse(await file.text());
        const incomingProfiles = getProfilesFromJsonUpload(uploaded);

        if (!incomingProfiles.length) {
          showToast("JSON upload did not include profile records");
          continue;
        }

        incomingProfiles
          .map((profile, profileIndex) => normalizeUploadedProfile(profile, `${fileIndex}-${profileIndex}`))
          .forEach((profile) => normalizedProfiles.push(profile));
      } catch {
        showToast("Could not read that JSON profile file");
      }
    } else {
      normalizedProfiles.push(await normalizeUploadedFileProfile(file, fileIndex));
    }
  }

  if (!normalizedProfiles.length) return;

  try {
    const savedToSupabase = await saveUploadedProfilesToSupabase(normalizedProfiles);
    if (!savedToSupabase) {
      upsertUploadedProfiles(normalizedProfiles);
      activeProfileId = normalizedProfiles[0].id;
    }
  } catch (error) {
    showToast("Upload saved locally. Check Supabase storage setup.");
    upsertUploadedProfiles(normalizedProfiles);
    activeProfileId = normalizedProfiles[0].id;
  }

  renderAll();
  showToast(`${normalizedProfiles.length} profile${normalizedProfiles.length === 1 ? "" : "s"} uploaded`);
}

function renderProfileSummary() {
  const summary = document.querySelector("#profile-summary");
  if (!summary) return;

  const profile = profiles.find((item) => String(item.id) === String(activeProfileId));
  if (!profile) {
    summary.innerHTML = `
      <p class="eyebrow">Selected profile</p>
      <h3>No profile selected</h3>
      <p class="meta">Click Open on any profile to see the admin summary here.</p>
    `;
    return;
  }

  const duplicateIds = getDuplicateIds();
  const clientBrief = getClientCandidateBrief(profile);
  const parsedDetailBlocks = [
    ["Experience details", profile.experienceDetails],
    ["Certifications", profile.certifications],
    ["Projects", profile.projects],
    ["Education", profile.education],
    ["Achievements", profile.achievements]
  ].filter(([, value]) => value);

  summary.innerHTML = `
    <p class="eyebrow">AI English summary</p>
    <h3>${escapeHtml(profile.name)}</h3>
    <p class="meta">${escapeHtml(profile.role)} / ${escapeHtml(profile.location)} / ${escapeHtml(profile.experience)}</p>
    <p>${escapeHtml(clientBrief)}</p>
    <div class="summary-grid">
      <span>Source</span><strong>${profile.source === "intent" ? "Intern" : "CV submit"}</strong>
      <span>Duplicate</span><strong>${duplicateIds.has(profile.id) ? "Yes" : "No"}</strong>
      <span>Submitted</span><strong>${escapeHtml(profile.submittedAt)}</strong>
      <span>Parser</span><strong>${escapeHtml(getParseStatusLabel(profile))}</strong>
      <span>CV words</span><strong>${escapeHtml(profile.wordCount || 0)}</strong>
      <span>ATS score</span><strong>${escapeHtml(profile.atsScore ? `${profile.atsScore}/100` : "Pending")}</strong>
    </div>
    ${profile.parserError ? `<p class="parser-error">${escapeHtml(profile.parserError)}</p>` : ""}
    ${parsedDetailBlocks.length ? `
      <div class="parsed-profile-detail">
        ${parsedDetailBlocks.map(([label, value]) => `
          <section>
            <h4>${escapeHtml(label)}</h4>
            <p>${escapeHtml(value)}</p>
          </section>
        `).join("")}
      </div>
    ` : ""}
    <div class="private-line">Admin contact: ${escapeHtml(profile.contact)}</div>
    <p class="meta">${escapeHtml(profile.notes)}</p>
    <div class="summary-actions">
      <button class="primary-button small" type="button" id="summary-open-cv">${profile.cvFilePath ? "Open CV file" : "Open profile summary"}</button>
      <button class="ghost-button small" type="button" id="summary-parse-cv" ${profile.cvFilePath ? "" : "disabled"}>Generate AI brief</button>
    </div>
  `;

  document.querySelector("#summary-open-cv")?.addEventListener("click", () => {
    openCvForProfile(profile.id);
  });

  document.querySelector("#summary-parse-cv")?.addEventListener("click", () => {
    parseProfileCv(profile.id);
  });
}

function renderOrganizationOptions() {
  const select = document.querySelector("#organization-select");
  select.innerHTML = requests.map((request) => `
    <option value="${escapeHtml(request.id)}">${escapeHtml(request.organization)} / ${escapeHtml(request.role)}${isFreeInternRequest(request) ? " / free interns" : ""}</option>
  `).join("");
  const relatedRequest = getRelatedRequestForShortlist();
  select.value = relatedRequest?.id || requests[0]?.id || "";
}

function selectRequestForShortlist(requestId) {
  const request = requests.find((item) => String(item.id) === String(requestId));
  if (!request) return;

  const accessMode = isFreeInternRequest(request) ? "intern" : "standard";
  selectedProfileIds = request.pushedProfileIds || [];
  currentShortlist = {
    ...currentShortlist,
    requestId: request.id,
    organization: request.organization,
    title: `${request.role} shortlist`,
    accessMode,
    annualGrossPay: request.annualGrossPay || 0,
    feeRate: accessMode === "intern" ? 0 : 0.005,
    profileIds: selectedProfileIds,
    clientSelectedProfileIds: [],
    paymentComplete: accessMode === "intern",
    redactedProfiles: []
  };
  renderSelectableProfiles();
  renderShortlistOutput();
  renderClientPreview();
}

function renderSelectableProfiles() {
  const selectableProfiles = document.querySelector("#selectable-profiles");
  const request = getRelatedRequestForShortlist();
  const pushedIds = new Set((request?.pushedProfileIds || []).map(String));
  const pushedProfiles = profiles.filter((profile) => pushedIds.has(String(profile.id)));

  if (!pushedProfiles.length) {
    selectableProfiles.innerHTML = `<p class="meta">No profiles have been pushed to this organization yet. Push profiles from the Profile bucket first.</p>`;
    selectedProfileIds = [];
    currentShortlist.profileIds = [];
    return;
  }

  selectableProfiles.innerHTML = pushedProfiles.map((profile) => `
    <label class="select-row">
      <input type="checkbox" value="${profile.id}" ${selectedProfileIds.some((id) => String(id) === String(profile.id)) ? "checked" : ""}>
      <span>
        <strong>${escapeHtml(profile.name)}</strong>
        <span class="meta">${escapeHtml(profile.role)} / ${escapeHtml(profile.location)} / ${escapeHtml(profile.experience)}</span>
      </span>
    </label>
  `).join("");

  selectableProfiles.querySelectorAll("input").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.value;
      if (checkbox.checked) {
        selectedProfileIds = [...new Set([...selectedProfileIds, id])];
      } else {
        selectedProfileIds = selectedProfileIds.filter((profileId) => String(profileId) !== String(id));
      }
      currentShortlist.profileIds = selectedProfileIds;
      renderShortlistOutput();
    });
  });
}

function renderShortlistOutput() {
  const output = document.querySelector("#shortlist-output");
  const selected = selectedProfileIds
    .map((id) => profiles.find((profile) => String(profile.id) === String(id)))
    .filter(Boolean);

  if (!selected.length) {
    output.innerHTML = `<p class="meta">Select one or more profiles to prepare the client view.</p>`;
    return;
  }

  output.innerHTML = selected.map((profile) => `
    <article class="profile-card">
      <h3>${escapeHtml(profile.name)}</h3>
      <div class="meta">${escapeHtml(profile.role)} / ${escapeHtml(profile.experience)}</div>
      <div class="tag-list">${profile.skills.map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join("")}</div>
    </article>
  `).join("");
}

function renderClientPreview() {
  const clientProfiles = document.querySelector("#client-profiles");
  const redactedProfiles = getClientVisibleProfiles();
  const selectedIds = new Set((currentShortlist.clientSelectedProfileIds || []).map(String));
  const internMode = isInternShortlist();
  document.querySelector("#client-title").textContent = `${currentShortlist.organization}: ${currentShortlist.title}`;
  document.querySelector("#client-summary").textContent = internMode
    ? `${redactedProfiles.length} full intern profiles shared for review. Select the intern profiles you want to download.`
    : `${redactedProfiles.length} redacted profiles shared for review. Contact details and direct CV files stay hidden until payment is confirmed.`;
  document.querySelector("#client-link-id").textContent = `Link ID: ${currentShortlist.token || "not generated yet"}`;
  document.querySelector(".client-hero .status-pill").textContent = internMode ? "Free intern view" : "Redacted view";

  if (!redactedProfiles.length) {
    clientProfiles.innerHTML = `
      <article class="client-card">
        <h3>No profiles shared yet</h3>
        <p class="meta">Add profiles to this shortlist from the admin builder, then generate a secure link.</p>
      </article>
    `;
    renderClientBilling();
    return;
  }

  if (currentShortlist.requestSubmitted) {
    clientProfiles.innerHTML = `
      <article class="client-card selected">
        <h3>Thank you.</h3>
        <p>Thank you. Your profile request has been received. Our recruitment team will contact you shortly.</p>
      </article>
    `;
    renderClientBilling();
    return;
  }

  clientProfiles.innerHTML = redactedProfiles.map((profile, index) => {
    const isSelected = selectedIds.has(String(profile.id));
    const profileInternMode = internMode || profile.accessMode === "intern";
    const profileLabel = profileInternMode ? `Intern Profile ${index + 1}` : `Profile ${index + 1}`;
    const clientReady = profileInternMode || profile.safeForClient === true;
    const safeSummary = clientReady
      ? getClientCandidateBrief(profile)
      : "CV parsing is required before a complete redacted candidate profile brief can be shown.";
    const redactedNote = profileInternMode
      ? "Candidate contact details are handled by Urgent Recruite."
      : "Contact details are hidden until payment is confirmed.";

    return `
      <article class="client-card ${isSelected ? "selected" : ""}" data-client-card-id="${escapeHtml(profile.id)}">
        <label class="client-select-row">
          <input type="checkbox" data-client-profile-id="${escapeHtml(profile.id)}" ${isSelected ? "checked" : ""}>
          <span>
            <strong>${escapeHtml(profileLabel)}</strong>
            <span class="meta">${escapeHtml(clientSafeText(profile.role, "Candidate profile"))} / ${escapeHtml(clientSafeText(profile.location, "Location not provided"))} / ${escapeHtml(clientSafeText(profile.experience, "Experience not provided"))}</span>
          </span>
        </label>
        <p>${escapeHtml(safeSummary)}</p>
        <div class="tag-list">${clientSafeSkills(profile.skills || []).map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join("")}</div>
        <button class="ghost-button small client-open-profile" type="button" data-client-open-id="${escapeHtml(profile.id)}">${profileInternMode ? "Open intern profile" : "Open redacted profile"}</button>
        <p class="redacted-note">${escapeHtml(redactedNote)}</p>
      </article>
    `;
  }).join("");

  clientProfiles.querySelectorAll("[data-client-profile-id]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const ids = new Set((currentShortlist.clientSelectedProfileIds || []).map(String));
      if (checkbox.checked) {
        ids.add(checkbox.dataset.clientProfileId);
      } else {
        ids.delete(checkbox.dataset.clientProfileId);
      }
      currentShortlist.clientSelectedProfileIds = Array.from(ids);
      renderClientPreview();
    });
  });

  clientProfiles.querySelectorAll("[data-client-open-id]").forEach((button) => {
    button.addEventListener("click", () => openClientProfileModal(button.dataset.clientOpenId));
  });

  clientProfiles.querySelectorAll("[data-client-card-id]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("input, label, button")) return;
      openClientProfileModal(card.dataset.clientCardId);
    });
  });

  renderClientBilling();
}

function getClientProfileDisplayLabel(profile, index) {
  return (profile.accessMode === "intern" || isInternShortlist())
    ? `Intern Profile ${index + 1}`
    : `Profile ${index + 1}`;
}

function getClientProfileSections(profile) {
  const skills = clientSafeSkills(profile.skills || []).join(", ");
  const source = professionalSourceText(profile);
  const clientBrief = getClientCandidateBrief(profile);
  const sections = [
    ["CLIENT CANDIDATE PROFILE BRIEF", clientBrief],
    ["EXPERIENCE", redactedDetail(profile, profile.experience, ["experience overview", "experience"], firstUsefulSentences(profile.experienceDetails || source, 2), 2)],
    ["WORK EXPERIENCE", redactedDetail(profile, profile.experienceDetails, ["work experience", "employment history", "professional experience"], firstUsefulSentences(source, 6), 6)],
    ["PROJECTS", redactedDetail(profile, profile.projects, ["projects", "campaigns", "initiatives", "portfolio"], "", 4)],
    ["CERTIFICATIONS", redactedDetail(profile, profile.certifications, ["certifications", "certificates", "training", "qualifications"], "", 4)],
    ["EDUCATION", redactedDetail(profile, profile.education, ["education", "academic background"], "", 5)],
    ["SKILLS", skills || redactedDetail(profile, profile.achievements, ["skills and competencies", "skills", "competencies", "technology and tools", "languages", "additional strengths"], "", 5)]
  ];

  return sections
    .map(([heading, value]) => [heading, clientSafeText(value, "")])
    .filter(([, value]) => value && !isWeakClientText(value));
}

function ensureClientProfileModal() {
  let modal = document.querySelector("#client-profile-modal");
  if (modal) return modal;

  modal = document.createElement("dialog");
  modal.id = "client-profile-modal";
  modal.className = "client-profile-modal";
  modal.innerHTML = `
    <div class="client-profile-modal-card">
      <button class="ghost-button small client-profile-modal-close" type="button" aria-label="Close profile">Close</button>
      <div class="client-profile-modal-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".client-profile-modal-close").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
  return modal;
}

function openClientProfileModal(profileId) {
  const visibleProfiles = getClientVisibleProfiles();
  const index = visibleProfiles.findIndex((profile) => String(profile.id) === String(profileId));
  const profile = visibleProfiles[index];
  if (!profile) return;

  const modal = ensureClientProfileModal();
  const label = getClientProfileDisplayLabel(profile, index);
  const sections = getClientProfileSections(profile);
  const sectionMarkup = sections.length
    ? sections.map(([heading, value]) => `
        <section>
          <h3>${escapeHtml(heading)}</h3>
          <p>${escapeHtml(value)}</p>
        </section>
      `).join("")
    : `
        <section>
          <h3>PROFILE BRIEF</h3>
          <p>The CV needs to be parsed in the admin before a complete redacted profile brief can be shown here.</p>
        </section>
      `;
  modal.querySelector(".client-profile-modal-body").innerHTML = `
    <p class="eyebrow">Redacted candidate profile</p>
    <h2>${escapeHtml(label)}</h2>
    <p class="meta">${escapeHtml(clientSafeText(profile.role, "Candidate profile"))} / ${escapeHtml(clientSafeText(profile.location, "Location not provided"))}</p>
    <div class="client-profile-modal-sections">
      ${sectionMarkup}
    </div>
    <p class="redacted-note">Phone number, email address, LinkedIn, address, and other contact details are hidden.</p>
  `;

  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    modal.setAttribute("open", "");
  }
}

function renderClientBilling() {
  const selectedCount = (currentShortlist.clientSelectedProfileIds || []).length;
  const internMode = isInternShortlist();
  const grossPay = getGrossPayBasis();
  const fee = calculateShortlistFee(selectedCount, grossPay);
  const paymentNote = document.querySelector("#client-payment-note");

  document.querySelector("#client-selected-count").textContent = selectedCount;
  document.querySelector("#client-gross-pay").textContent = internMode ? "Free" : formatMoney(grossPay);
  document.querySelector("#client-fee-per-profile").textContent = formatMoney(fee.feePerProfile);
  document.querySelector("#client-total-fee").textContent = formatMoney(fee.totalFee);

  clientPaymentButton.disabled = selectedCount === 0 || currentShortlist.requestSubmitted;
  clientPaymentButton.textContent = selectedCount
    ? currentShortlist.requestSubmitted ? "Request received" : internMode ? "Download selected intern profiles" : "Request these profiles"
    : internMode ? "Select intern profiles to download" : "Select profiles to continue";

  paymentNote.textContent = currentShortlist.requestSubmitted
    ? "Thank you. Your profile request has been received. Our recruitment team will contact you shortly."
    : internMode
    ? "This intern shortlist is free for organizations. Select one or more intern profiles to download the shared profile details."
    : "Select one or more profiles. Each selected CV is 0.1% of annual gross pay, capped at 0.5% total.";
}

function getDeletedFilterValue() {
  return document.querySelector("#deleted-filter")?.value || "all";
}

function isLowWordDeletedProfile(profile) {
  const reason = String(profile.reason || "").toLowerCase();
  const wordCount = Number(profile.wordCount || 0);
  return (wordCount > 0 && wordCount < 200)
    || reason.includes("fewer than")
    || reason.includes("less than")
    || reason.includes("below");
}

function deletedProfileMatchesFilter(profile) {
  const filter = getDeletedFilterValue();
  const reason = String(profile.reason || "").toLowerCase();
  const status = String(profile.parseStatus || "").toLowerCase();

  if (filter === "low-word") return isLowWordDeletedProfile(profile);
  if (filter === "admin") return reason.includes("admin") || reason.includes("manual");
  if (filter === "failed") return status === "failed" || reason.includes("failed");
  return true;
}

function updateDeletedSelectionCount() {
  const count = selectedDeletedProfileIds.length;
  const output = document.querySelector("#deleted-selected-count");
  if (output) output.textContent = `${count} selected`;
}

function renderDeletedProfiles() {
  const list = document.querySelector("#deleted-profile-list");
  if (!list) return;

  const visibleDeletedProfiles = deletedProfiles.filter(deletedProfileMatchesFilter);
  selectedDeletedProfileIds = selectedDeletedProfileIds.filter((id) =>
    visibleDeletedProfiles.some((profile) => String(profile.id) === String(id))
  );
  updateDeletedSelectionCount();

  if (!visibleDeletedProfiles.length) {
    list.innerHTML = `<article class="deleted-card"><p class="meta">No deleted or rejected profiles yet.</p></article>`;
    return;
  }

  list.innerHTML = visibleDeletedProfiles.map((profile) => {
    const parsedDetailBlocks = [
      ["Experience", profile.experienceDetails],
      ["Certifications", profile.certifications],
      ["Projects", profile.projects]
    ].filter(([, value]) => value);
    const isSelected = selectedDeletedProfileIds.some((id) => String(id) === String(profile.id));

    return `
      <article class="deleted-card ${isSelected ? "selected" : ""}">
        <div class="profile-card-top">
          <label class="deleted-select-row">
            <input type="checkbox" class="deleted-select" data-deleted-id="${escapeHtml(profile.id)}" ${isSelected ? "checked" : ""}>
            <span>
              <strong>${escapeHtml(profile.name)}</strong>
              <span class="meta">${escapeHtml(profile.role)} / ${escapeHtml(profile.location)} / ${escapeHtml(profile.experience)}</span>
            </span>
          </label>
          <span class="status-pill">${escapeHtml(profile.reason)}</span>
        </div>
        <p>${escapeHtml(profile.summary)}</p>
        <div class="summary-grid">
          <span>Source</span><strong>${escapeHtml(profile.source)}</strong>
          <span>Words</span><strong>${escapeHtml(profile.wordCount)}</strong>
          <span>ATS score</span><strong>${escapeHtml(profile.atsScore ? `${profile.atsScore}/100` : "Pending")}</strong>
          <span>Deleted</span><strong>${escapeHtml(profile.deletedAt)}</strong>
          <span>Purge date</span><strong>${escapeHtml(profile.deleteAfter)}</strong>
        </div>
        ${parsedDetailBlocks.length ? `
          <details class="client-profile-detail">
            <summary>Open parser details</summary>
            ${parsedDetailBlocks.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join("")}
          </details>
        ` : ""}
        <div class="private-line">Private: ${escapeHtml(profile.contact)}</div>
        <p class="meta">${escapeHtml(profile.notes)}</p>
      </article>
    `;
  }).join("");

  list.querySelectorAll(".deleted-select").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.dataset.deletedId;
      if (checkbox.checked) {
        selectedDeletedProfileIds = [...new Set([...selectedDeletedProfileIds, id])];
      } else {
        selectedDeletedProfileIds = selectedDeletedProfileIds.filter((profileId) => String(profileId) !== String(id));
      }
      renderDeletedProfiles();
    });
  });
}

async function purgeExpiredDeletedProfiles() {
  const client = getSupabaseClient();
  if (!client || !supabaseSession) {
    showToast("Sign in to purge expired deleted profiles.");
    return;
  }

  const { data, error } = await client.rpc("purge_expired_deleted_profiles");
  if (error) {
    showToast("Could not purge expired profiles. Run the latest migration SQL first.");
    return;
  }

  await loadSupabaseData();
  renderAll();
  showToast(`${data || 0} expired deleted profile${data === 1 ? "" : "s"} permanently removed`);
}

function selectVisibleDeletedProfiles() {
  selectedDeletedProfileIds = deletedProfiles
    .filter(deletedProfileMatchesFilter)
    .map((profile) => profile.id);
  renderDeletedProfiles();
}

async function deleteSelectedDeletedProfiles() {
  if (!selectedDeletedProfileIds.length) {
    showToast("Select one or more deleted profiles first.");
    return;
  }

  const confirmed = window.confirm(`Permanently delete ${selectedDeletedProfileIds.length} selected deleted profile${selectedDeletedProfileIds.length === 1 ? "" : "s"} now?`);
  if (!confirmed) return;

  const idsToDelete = selectedDeletedProfileIds.map(String);
  const client = getSupabaseClient();

  if (client && supabaseSession) {
    const uuidIds = idsToDelete.filter(isUuid);
    if (uuidIds.length) {
      const { error } = await client.from("deleted_profiles").delete().in("id", uuidIds);
      if (error) {
        showToast("Could not permanently delete selected profiles.");
        return;
      }
    }
    await loadSupabaseData();
  }

  deletedProfiles = deletedProfiles.filter((profile) => !idsToDelete.includes(String(profile.id)));
  selectedDeletedProfileIds = [];
  renderAll();
  showToast("Selected deleted profiles permanently removed.");
}

function downloadSelectedClientProfiles() {
  const selectedIds = (currentShortlist.clientSelectedProfileIds || []).map(String);
  const redactedById = new Map(getClientVisibleProfiles().map((profile) => [String(profile.id), profile]));
  const selectedProfiles = selectedIds.map((id) => {
    const safeProfile = redactedById.get(id) || {};
    return {
      id: safeProfile.id,
      name: "Selected profile",
      role: clientSafeText(safeProfile.role, "Candidate profile"),
      location: clientSafeText(safeProfile.location, "Location not provided"),
      experience: clientSafeText(safeProfile.experience, "Experience not provided"),
      skills: clientSafeSkills(safeProfile.skills),
      clientBrief: getClientCandidateBrief(safeProfile),
      summary: getClientCandidateBrief(safeProfile),
      experienceDetails: redactedDetail(safeProfile, safeProfile.experienceDetails, ["work experience", "experience", "employment history"], "CV parsing is required before detailed work experience can be shown.", 6),
      certifications: clientSafeText(safeProfile.certifications, "To be confirmed during recruiter review."),
      projects: clientSafeText(safeProfile.projects, "To be confirmed during recruiter review."),
      education: clientSafeText(safeProfile.education, ""),
      achievements: clientSafeText(safeProfile.achievements, ""),
      contact: "Contact details are handled by Urgent Recruite."
    };
  });

  const fee = calculateShortlistFee(selectedIds.length);
  const payload = {
    shortlist: {
      organization: currentShortlist.organization,
      title: currentShortlist.title,
      accessMode: getShortlistAccessMode(),
      paymentStatus: isInternShortlist() ? "free_intern" : "paid",
      selectedProfiles: selectedIds.length,
      totalFee: fee.totalFee
    },
    profiles: selectedProfiles
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `urgent-recruite-shortlist-${currentShortlist.token}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Selected profiles downloaded");
}

function getSelectedClientProfileReferences() {
  const selectedIds = new Set((currentShortlist.clientSelectedProfileIds || []).map(String));
  return getClientVisibleProfiles()
    .filter((profile) => selectedIds.has(String(profile.id)))
    .map((profile, index) => (profile.accessMode === "intern" || isInternShortlist())
      ? `Intern Profile ${index + 1}`
      : `Profile ${index + 1}`);
}

async function submitClientProfileRequest() {
  const selectedIds = (currentShortlist.clientSelectedProfileIds || []).map(String);
  const fee = calculateShortlistFee(selectedIds.length);

  await sendEmailNotification("profile-request", {
    companyName: currentShortlist.organization,
    clientEmail: currentShortlist.clientEmail || getRequestEmail(getRelatedRequestForShortlist()),
    shortlistId: currentShortlist.token,
    shortlistTitle: currentShortlist.title,
    selectedCount: selectedIds.length,
    grossPay: getGrossPayBasis(),
    calculatedFee: fee.totalFee,
    selectedProfileReferences: getSelectedClientProfileReferences()
  });

  currentShortlist.requestSubmitted = true;
  const relatedRequest = getRelatedRequestForShortlist();
  if (relatedRequest) {
    relatedRequest.clientResponse = "responded";
  }
  renderAll();
  showToast("Thank you. Your profile request has been received. Our recruitment team will contact you shortly.");
}

async function handleClientPaymentOrDownload() {
  if (!(currentShortlist.clientSelectedProfileIds || []).length) {
    showToast("Select at least one profile first");
    return;
  }

  if (currentShortlist.requestSubmitted) return;

  if (isInternShortlist()) {
    const relatedRequest = getRelatedRequestForShortlist();
    if (relatedRequest) {
      relatedRequest.clientResponse = "responded";
    }
    downloadSelectedClientProfiles();
    return;
  }

  try {
    await submitClientProfileRequest();
  } catch (error) {
    showToast(error.message || "Could not send the profile request yet. Please try again.");
  }
}

function hydrateShortlistFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);

  if (!params.has("shortlist")) return false;

  const token = params.get("shortlist");
  let payload = null;

  if (params.get("payload")) {
    try {
      payload = decodeSharePayload(params.get("payload"));
    } catch {
      payload = null;
    }
  }

  if (!payload && token) {
    payload = getStoredShortlist(token);
  }

  if (payload) {
    currentShortlist = {
      ...currentShortlist,
      token: payload.token || token || currentShortlist.token,
      requestId: payload.requestId || "",
      organization: payload.organization || "Client shortlist",
      title: payload.title || "Shared profiles",
      accessMode: payload.accessMode || "standard",
      clientEmail: payload.clientEmail || "",
      annualGrossPay: Number(payload.annualGrossPay || 0),
      feeRate: Number(payload.feeRate ?? 0.005),
      profileIds: (payload.profiles || []).map((profile) => profile.id),
      clientSelectedProfileIds: [],
      paymentComplete: Boolean(payload.paymentComplete || payload.accessMode === "intern"),
      requestSubmitted: Boolean(payload.requestSubmitted),
      redactedProfiles: payload.profiles || []
    };
  } else {
    currentShortlist = {
      ...currentShortlist,
      token: token || currentShortlist.token,
      clientSelectedProfileIds: [],
      paymentComplete: currentShortlist.accessMode === "intern",
      requestSubmitted: false
    };
  }

  return true;
}

function setPublicClientView(enabled) {
  document.body.classList.toggle("public-client-view", enabled);
}

function setAuthPanelVisible(visible) {
  if (authPanel) authPanel.hidden = !visible;
  if (signOutButton) signOutButton.hidden = !supabaseSession;
}

async function initializeAdminAuth() {
  const client = getSupabaseClient();
  if (!client) {
    setAuthPanelVisible(false);
    return false;
  }

  const { data, error } = await client.auth.getSession();
  if (error) {
    setAuthPanelVisible(true);
    return false;
  }

  supabaseSession = data.session || null;
  setAuthPanelVisible(!supabaseSession);
  return Boolean(supabaseSession);
}

async function handleAdminSignIn(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  if (!client) return;

  const { data, error } = await client.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  if (error) {
    showToast("Could not sign in. Check the admin user in Supabase Auth.");
    return;
  }

  supabaseSession = data.session || null;
  setAuthPanelVisible(false);
  signOutButton.hidden = false;

  try {
    await loadSupabaseData();
    renderAll();
    setSection("dashboard");
    showToast("Signed in to admin");
  } catch {
    showToast("Signed in, but Supabase tables are not ready yet.");
  }
}

async function handleAdminSignOut() {
  const client = getSupabaseClient();
  if (client) await client.auth.signOut();
  supabaseSession = null;
  setAuthPanelVisible(true);
  showToast("Signed out");
}

function renderAll() {
  renderMetrics();
  renderRequests();
  renderStatusSummary();
  renderProfiles();
  renderOrganizationOptions();
  renderSelectableProfiles();
  renderShortlistOutput();
  renderClientPreview();
  renderDeletedProfiles();
}

navItems.forEach((item) => {
  item.addEventListener("click", () => setSection(item.dataset.section));
});

authForm.addEventListener("submit", handleAdminSignIn);
signOutButton.addEventListener("click", handleAdminSignOut);

document.querySelector("#open-builder").addEventListener("click", () => setSection("shortlists"));

document.querySelector("#copy-link").addEventListener("click", async () => {
  storeSharedShortlist();
  await copyText(buildShareUrl(), "Client link copied");
});

document.querySelector("#new-request").addEventListener("click", openNextNewRequest);

["#filter-name", "#filter-location", "#filter-experience", "#filter-keyword"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderProfiles);
});

document.querySelector("#clear-filters").addEventListener("click", () => {
  document.querySelector("#profile-filters").reset();
  renderProfiles();
});

document.querySelector("#topbar-download-profiles").addEventListener("click", downloadProfiles);

document.querySelector("#topbar-parse-pending").addEventListener("click", parsePendingProfiles);

document.querySelector("#topbar-upload-profiles").addEventListener("click", () => {
  document.querySelector("#profile-upload-input").click();
});

document.querySelector("#profile-upload-input").addEventListener("change", (event) => {
  uploadProfiles(event.target.files);
  event.target.value = "";
});

clientPaymentButton.addEventListener("click", handleClientPaymentOrDownload);

document.querySelector("#organization-select").addEventListener("change", (event) => {
  selectRequestForShortlist(event.target.value);
});

document.querySelector("#purge-deleted").addEventListener("click", purgeExpiredDeletedProfiles);
document.querySelector("#deleted-filter").addEventListener("change", () => {
  selectedDeletedProfileIds = [];
  renderDeletedProfiles();
});
document.querySelector("#select-visible-deleted").addEventListener("click", selectVisibleDeletedProfiles);
document.querySelector("#delete-selected-deleted").addEventListener("click", deleteSelectedDeletedProfiles);

document.querySelector("#generate-shortlist").addEventListener("click", async () => {
  const requestId = document.querySelector("#organization-select").value;
  const relatedRequest = requests.find((request) => String(request.id) === String(requestId));
  const organization = relatedRequest?.organization || "Selected organization";

  if (!selectedProfileIds.length) {
    showToast("Push and select at least one profile for this organization first.");
    return;
  }

  if (relatedRequest) {
    relatedRequest.viewed = true;
    relatedRequest.intakeComplete = true;
    relatedRequest.linkSharedCount = (relatedRequest.linkSharedCount || 0) + 1;
    relatedRequest.pushedProfileIds = [...new Set([...(relatedRequest.pushedProfileIds || []), ...selectedProfileIds])];
  }

  const accessMode = isFreeInternRequest(relatedRequest) ? "intern" : "standard";
  currentShortlist = {
    token: `sl-${Math.random().toString(16).slice(2, 8)}`,
    requestId: relatedRequest?.id || "",
    accessMode,
    clientEmail: getRequestEmail(relatedRequest),
    organization,
    title: document.querySelector("#shortlist-title").value,
    annualGrossPay: relatedRequest?.annualGrossPay || 0,
    feeRate: accessMode === "intern" ? 0 : 0.005,
    profileIds: selectedProfileIds,
    clientSelectedProfileIds: [],
    paymentComplete: accessMode === "intern",
    redactedProfiles: []
  };
  currentShortlist.redactedProfiles = getShortlistProfiles().map((profile, index) => buildClientProfile(profile, index, accessMode));
  storeSharedShortlist();
  const clientLink = buildShareUrl();
  try {
    await saveCurrentShortlistToSupabase();
  } catch {
    showToast("Client link generated locally. Check Supabase shortlist tables.");
  }
  try {
    await sendEmailNotification("shortlist-link", {
      to: currentShortlist.clientEmail,
      companyName: currentShortlist.organization,
      shortlistId: currentShortlist.token,
      shortlistTitle: currentShortlist.title,
      secureLink: clientLink,
      accessMode
    });
  } catch {
    await copyText(clientLink, "Secure link generated and copied. Add email service or client email to send automatically.");
  }
  renderAll();
  setSection("preview");
  showToast(currentShortlist.clientEmail ? "Secure link sent to the client." : "Secure link generated. No client email found, so the link was copied.");
});

async function initializeApp() {
  loadFrontendSubmissions();
  const openedPublicClientView = hydrateShortlistFromHash();
  setPublicClientView(openedPublicClientView);

  if (openedPublicClientView) {
    await loadPublicShortlistFromSupabase(currentShortlist.token).catch(() => false);
    renderAll();
    setSection("preview");
    return;
  }

  renderAll();
  setSection("dashboard");

  const isSignedIn = await initializeAdminAuth();
  if (!isSignedIn) return;

  try {
    await loadSupabaseData();
    renderAll();
  } catch {
    showToast("Supabase tables are not ready yet. Run the setup SQL.");
  }
}

initializeApp();

window.addEventListener("hashchange", async () => {
  const isPublicClientView = hydrateShortlistFromHash();
  if (isPublicClientView) {
    await loadPublicShortlistFromSupabase(currentShortlist.token).catch(() => false);
  }
  renderAll();
  setPublicClientView(isPublicClientView);
  setSection(isPublicClientView ? "preview" : "dashboard");
});
