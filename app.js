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

let selectedProfileIds = [101, 102];
let activeProfileId = 101;
let currentShortlist = {
  token: "sl-acme-7f42",
  requestId: 1,
  organization: "Acme Healthcare",
  title: "Operations Manager shortlist",
  annualGrossPay: 85000,
  profileIds: selectedProfileIds,
  clientSelectedProfileIds: [],
  paymentComplete: false,
  redactedProfiles: []
};

const pageTitle = document.querySelector("#page-title");
const sections = document.querySelectorAll(".section");
const navItems = document.querySelectorAll(".nav-item");
const toast = document.querySelector("#toast");
const shareUrl = document.querySelector("#share-url");
const topbarActions = document.querySelectorAll(".topbar-action");
const clientPaymentButton = document.querySelector("#client-payment-button");

const titles = {
  dashboard: "Admin dashboard",
  requests: "Shortlist requests",
  profiles: "Profile bucket",
  shortlists: "Shortlist builder",
  preview: "Client shortlist view"
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function parseMoney(value) {
  const amount = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
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

function getGrossPayBasis() {
  const relatedRequest = getRelatedRequestForShortlist();
  return Number(currentShortlist.annualGrossPay || relatedRequest?.annualGrossPay || 0);
}

function redactProfile(profile) {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    location: profile.location,
    experience: profile.experience,
    skills: profile.skills,
    summary: profile.summary || "Relevant experience summary is being prepared.",
    notes: "Contact details are hidden until payment is confirmed."
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
    profile.notes,
    profile.skills.join(" ")
  ].join(" ").toLowerCase();

  return (!filters.name || profile.name.toLowerCase().includes(filters.name))
    && (!filters.location || profile.location.toLowerCase().includes(filters.location))
    && (!filters.experience || profile.experience.toLowerCase().includes(filters.experience))
    && (!filters.keyword || searchable.includes(filters.keyword));
}

function loadFrontendSubmissions() {
  const storedProfiles = JSON.parse(localStorage.getItem("urgentRecruiteProfiles") || "[]");
  const storedRequests = JSON.parse(localStorage.getItem("urgentRecruiteShortlistRequests") || "[]");

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
      paymentStatus: "unpaid"
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

  return getShortlistProfiles().map(redactProfile);
}

function buildSharePayload() {
  const relatedRequest = getRelatedRequestForShortlist();
  const redactedProfiles = getShortlistProfiles().map(redactProfile);

  return {
    token: currentShortlist.token,
    requestId: currentShortlist.requestId || relatedRequest?.id || "",
    organization: currentShortlist.organization,
    title: currentShortlist.title,
    annualGrossPay: getGrossPayBasis(),
    feeRate: 0.005,
    profiles: redactedProfiles
  };
}

function storeSharedShortlist(payload = buildSharePayload()) {
  const stored = JSON.parse(localStorage.getItem("urgentRecruiteSharedShortlists") || "{}");
  stored[payload.token] = payload;
  localStorage.setItem("urgentRecruiteSharedShortlists", JSON.stringify(stored));
  return payload;
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
  shareUrl.value = buildShareUrl();
}

function renderRequests() {
  const dashboardRequests = document.querySelector("#dashboard-requests");
  const requestsTable = document.querySelector("#requests-table");

  dashboardRequests.innerHTML = requests.map((request) => `
    <article class="request-card">
      <div>
        <h3>${escapeHtml(request.organization)}</h3>
        <div class="meta">${escapeHtml(request.role)} / ${escapeHtml(request.contact)}<br>Requested ${escapeHtml(request.requested)}<br>${escapeHtml(getRequestActivityText(request))}</div>
      </div>
      <span class="status-pill">${escapeHtml(getRequestStatus(request))}</span>
    </article>
  `).join("");

  requestsTable.innerHTML = requests.map((request) => `
    <article class="table-row">
      <strong>${escapeHtml(request.organization)}</strong>
      <span>${escapeHtml(request.role)}</span>
      <span class="meta">${escapeHtml(request.contact)}<br>${escapeHtml(getRequestActivityText(request))}</span>
      <span class="status-pill">${escapeHtml(getRequestStatus(request))}</span>
    </article>
  `).join("");
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
          <button class="danger-button small profile-delete" type="button" data-profile-id="${profile.id}">Delete</button>
        </div>
      </div>
      <div class="tag-list">${profile.skills.map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join("")}</div>
      <div class="flag-list">
        ${profile.source === "intent" ? `<span class="flag intent">Intern</span>` : ""}
        ${duplicateIds.has(profile.id) ? `<span class="flag duplicate">Duplicate</span>` : ""}
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
    button.addEventListener("click", () => {
      activeProfileId = button.dataset.profileId;
      renderProfiles();
    });
  });

  profileList.querySelectorAll(".profile-delete").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.profileId;
      profiles = profiles.filter((profile) => String(profile.id) !== String(id));
      selectedProfileIds = selectedProfileIds.filter((profileId) => String(profileId) !== String(id));
      if (String(activeProfileId) === String(id)) {
        activeProfileId = profiles[0]?.id || null;
      }
      renderAll();
      showToast("Profile deleted from admin view");
    });
  });

  profileList.querySelectorAll(".profile-push").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.profileId;
      const select = profileList.querySelector(`.push-target[data-profile-id="${id}"]`);
      const requestId = select?.value;
      pushProfileToRequest(id, requestId);
    });
  });

  renderProfileSummary();
}

function pushProfileToRequest(profileId, requestId) {
  const profile = profiles.find((item) => String(item.id) === String(profileId));
  const request = requests.find((item) => String(item.id) === String(requestId));

  if (!profile || !request) {
    showToast("Select an open shortlist request first");
    return;
  }

  request.viewed = true;
  request.intakeComplete = true;
  request.pushedProfileIds = [...new Set([...(request.pushedProfileIds || []), profile.id])];
  selectedProfileIds = request.pushedProfileIds;
  currentShortlist = {
    ...currentShortlist,
    requestId: request.id,
    organization: request.organization,
    title: `${request.role} shortlist`,
    annualGrossPay: request.annualGrossPay || 0,
    profileIds: selectedProfileIds,
    clientSelectedProfileIds: [],
    paymentComplete: false,
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
  currentShortlist = {
    ...currentShortlist,
    requestId: request.id,
    organization: request.organization,
    title: `${request.role} shortlist`,
    annualGrossPay: request.annualGrossPay || 0,
    profileIds: request.pushedProfileIds?.length ? request.pushedProfileIds : selectedProfileIds,
    clientSelectedProfileIds: [],
    paymentComplete: false,
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
    contact: profile.contact || [profile.email, profile.phone, profile.linkedin].filter(Boolean).join(" / ") || "No contact details provided",
    notes: profile.notes || "Uploaded from admin"
  };
}

async function uploadProfiles(file) {
  if (!file) return;

  try {
    const uploaded = JSON.parse(await file.text());
    const incomingProfiles = Array.isArray(uploaded) ? uploaded : uploaded.profiles;

    if (!Array.isArray(incomingProfiles)) {
      showToast("Upload must be a JSON array of profiles");
      return;
    }

    incomingProfiles.map(normalizeUploadedProfile).forEach((profile) => {
      const existingIndex = profiles.findIndex((item) => String(item.id) === String(profile.id));
      if (existingIndex >= 0) {
        profiles[existingIndex] = profile;
      } else {
        profiles.push(profile);
      }
    });

    activeProfileId = incomingProfiles[0]?.id || activeProfileId;
    renderAll();
    showToast("Profiles uploaded");
  } catch (error) {
    showToast("Could not read that profile file");
  }
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
  summary.innerHTML = `
    <p class="eyebrow">Selected profile</p>
    <h3>${escapeHtml(profile.name)}</h3>
    <p class="meta">${escapeHtml(profile.role)} / ${escapeHtml(profile.location)} / ${escapeHtml(profile.experience)}</p>
    <p>${escapeHtml(profile.summary)}</p>
    <div class="summary-grid">
      <span>Source</span><strong>${profile.source === "intent" ? "Intern" : "CV submit"}</strong>
      <span>Duplicate</span><strong>${duplicateIds.has(profile.id) ? "Yes" : "No"}</strong>
      <span>Submitted</span><strong>${escapeHtml(profile.submittedAt)}</strong>
    </div>
    <div class="private-line">Admin contact: ${escapeHtml(profile.contact)}</div>
    <p class="meta">${escapeHtml(profile.notes)}</p>
  `;
}

function renderOrganizationOptions() {
  const select = document.querySelector("#organization-select");
  select.innerHTML = requests.map((request) => `
    <option value="${escapeHtml(request.id)}">${escapeHtml(request.organization)} / ${escapeHtml(request.role)}</option>
  `).join("");
  const relatedRequest = getRelatedRequestForShortlist();
  select.value = relatedRequest?.id || requests[0]?.id || "";
}

function renderSelectableProfiles() {
  const selectableProfiles = document.querySelector("#selectable-profiles");

  selectableProfiles.innerHTML = profiles.map((profile) => `
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
  document.querySelector("#client-title").textContent = `${currentShortlist.organization}: ${currentShortlist.title}`;
  document.querySelector("#client-summary").textContent = `${redactedProfiles.length} redacted profiles shared for review. Contact details and direct CV files stay hidden until payment is confirmed.`;

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

  clientProfiles.innerHTML = redactedProfiles.map((profile) => {
    const isSelected = selectedIds.has(String(profile.id));
    return `
      <article class="client-card ${isSelected ? "selected" : ""}">
        <label class="client-select-row">
          <input type="checkbox" data-client-profile-id="${escapeHtml(profile.id)}" ${isSelected ? "checked" : ""}>
          <span>
            <strong>${escapeHtml(profile.name)}</strong>
            <span class="meta">${escapeHtml(profile.role)} / ${escapeHtml(profile.location)} / ${escapeHtml(profile.experience)}</span>
          </span>
        </label>
        <p>${escapeHtml(profile.summary || "Relevant experience summary is being prepared.")}</p>
        <div class="tag-list">${(profile.skills || []).map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join("")}</div>
        <details class="client-profile-detail">
          <summary>Open profile experience</summary>
          <p>${escapeHtml(profile.summary || "Experience summary not available yet.")}</p>
          <p class="redacted-note">${escapeHtml(profile.notes || "Contact details are hidden until payment is confirmed.")}</p>
        </details>
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

  renderClientBilling();
}

function renderClientBilling() {
  const selectedCount = (currentShortlist.clientSelectedProfileIds || []).length;
  const grossPay = getGrossPayBasis();
  const feeRate = Number(currentShortlist.feeRate || 0.005);
  const feePerProfile = grossPay * feeRate;
  const totalFee = selectedCount * feePerProfile;
  const paymentNote = document.querySelector("#client-payment-note");

  document.querySelector("#client-selected-count").textContent = selectedCount;
  document.querySelector("#client-gross-pay").textContent = formatMoney(grossPay);
  document.querySelector("#client-fee-per-profile").textContent = formatMoney(feePerProfile);
  document.querySelector("#client-total-fee").textContent = formatMoney(totalFee);

  clientPaymentButton.disabled = selectedCount === 0;
  clientPaymentButton.textContent = selectedCount
    ? currentShortlist.paymentComplete ? "Download selected profiles" : "Make payment to unlock"
    : "Select profiles to continue";

  paymentNote.textContent = currentShortlist.paymentComplete
    ? "Payment is marked as received for this prototype. The selected profile download is now available."
    : "Select one or more profiles. The fee is calculated as 0.5% of the annual gross pay per selected profile.";
}

function downloadSelectedClientProfiles() {
  const selectedIds = (currentShortlist.clientSelectedProfileIds || []).map(String);
  const redactedById = new Map(getClientVisibleProfiles().map((profile) => [String(profile.id), profile]));
  const selectedProfiles = selectedIds.map((id) => {
    const fullProfile = profiles.find((profile) => String(profile.id) === id);
    if (fullProfile) return fullProfile;

    return {
      ...redactedById.get(id),
      contact: "Full contact details require backend payment unlock."
    };
  });

  const payload = {
    shortlist: {
      organization: currentShortlist.organization,
      title: currentShortlist.title,
      paymentStatus: "paid",
      selectedProfiles: selectedIds.length,
      totalFee: selectedIds.length * getGrossPayBasis() * Number(currentShortlist.feeRate || 0.005)
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

function handleClientPaymentOrDownload() {
  if (!(currentShortlist.clientSelectedProfileIds || []).length) {
    showToast("Select at least one profile first");
    return;
  }

  if (!currentShortlist.paymentComplete) {
    currentShortlist.paymentComplete = true;
    const relatedRequest = getRelatedRequestForShortlist();
    if (relatedRequest) {
      relatedRequest.clientResponse = "responded";
      relatedRequest.paymentStatus = "paid";
    }
    renderAll();
    showToast("Payment marked as received for testing");
    return;
  }

  downloadSelectedClientProfiles();
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
      annualGrossPay: Number(payload.annualGrossPay || 0),
      feeRate: Number(payload.feeRate || 0.005),
      profileIds: (payload.profiles || []).map((profile) => profile.id),
      clientSelectedProfileIds: [],
      paymentComplete: false,
      redactedProfiles: payload.profiles || []
    };
  } else {
    currentShortlist = {
      ...currentShortlist,
      token: token || currentShortlist.token,
      clientSelectedProfileIds: [],
      paymentComplete: false
    };
  }

  return true;
}

function setPublicClientView(enabled) {
  document.body.classList.toggle("public-client-view", enabled);
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
}

navItems.forEach((item) => {
  item.addEventListener("click", () => setSection(item.dataset.section));
});

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

document.querySelector("#topbar-upload-profiles").addEventListener("click", () => {
  document.querySelector("#profile-upload-input").click();
});

document.querySelector("#profile-upload-input").addEventListener("change", (event) => {
  uploadProfiles(event.target.files[0]);
  event.target.value = "";
});

clientPaymentButton.addEventListener("click", handleClientPaymentOrDownload);

document.querySelector("#generate-shortlist").addEventListener("click", () => {
  const requestId = document.querySelector("#organization-select").value;
  const relatedRequest = requests.find((request) => String(request.id) === String(requestId));
  const organization = relatedRequest?.organization || "Selected organization";
  if (relatedRequest) {
    relatedRequest.viewed = true;
    relatedRequest.intakeComplete = true;
    relatedRequest.linkSharedCount = (relatedRequest.linkSharedCount || 0) + 1;
    relatedRequest.pushedProfileIds = [...new Set([...(relatedRequest.pushedProfileIds || []), ...selectedProfileIds])];
  }

  currentShortlist = {
    token: `sl-${Math.random().toString(16).slice(2, 8)}`,
    requestId: relatedRequest?.id || "",
    organization,
    title: document.querySelector("#shortlist-title").value,
    annualGrossPay: relatedRequest?.annualGrossPay || 0,
    profileIds: selectedProfileIds,
    clientSelectedProfileIds: [],
    paymentComplete: false,
    redactedProfiles: []
  };
  currentShortlist.redactedProfiles = getShortlistProfiles().map(redactProfile);
  storeSharedShortlist();
  renderAll();
  setSection("preview");
  showToast("Secure redacted view generated");
});

loadFrontendSubmissions();
const openedPublicClientView = hydrateShortlistFromHash();
renderAll();
setPublicClientView(openedPublicClientView);
setSection(openedPublicClientView ? "preview" : "dashboard");

window.addEventListener("hashchange", () => {
  const isPublicClientView = hydrateShortlistFromHash();
  renderAll();
  setPublicClientView(isPublicClientView);
  setSection(isPublicClientView ? "preview" : "dashboard");
});
