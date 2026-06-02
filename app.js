const requests = [
  {
    id: 1,
    organization: "Acme Healthcare",
    contact: "Nadia Brooks",
    role: "Operations Manager",
    status: "Ready to share",
    requested: "May 28, 2026"
  },
  {
    id: 2,
    organization: "Northline Logistics",
    contact: "Samuel Okoro",
    role: "Fleet HR Coordinator",
    status: "Sourcing",
    requested: "May 27, 2026"
  },
  {
    id: 3,
    organization: "BrightPath Schools",
    contact: "Elena Walsh",
    role: "Talent Acquisition Lead",
    status: "Awaiting intake",
    requested: "May 25, 2026"
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
  organization: "Acme Healthcare",
  title: "Operations Manager shortlist",
  profileIds: selectedProfileIds
};

const pageTitle = document.querySelector("#page-title");
const sections = document.querySelectorAll(".section");
const navItems = document.querySelectorAll(".nav-item");
const toast = document.querySelector("#toast");
const shareUrl = document.querySelector("#share-url");

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

function redactProfile(profile) {
  return {
    name: profile.name,
    role: profile.role,
    location: profile.location,
    experience: profile.experience,
    skills: profile.skills
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
    const key = `${profile.name.toLowerCase()}|${profile.contact.toLowerCase()}`;
    if (seen.has(key)) {
      duplicateIds.add(profile.id);
      duplicateIds.add(seen.get(key));
    } else {
      seen.set(key, profile.id);
    }
  });

  return duplicateIds;
}

function getOpenRequests() {
  return requests.filter((request) => !["closed", "completed", "archived"].includes(String(request.status).toLowerCase()));
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
      status: "New from landing page",
      requested: submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : "Frontend submission"
    });
  });
}

function buildShareUrl() {
  return `${window.location.href.split("#")[0]}#shortlist=${currentShortlist.token}`;
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
  pageTitle.textContent = titles[sectionId];
}

function renderMetrics() {
  document.querySelector("#metric-requests").textContent = requests.length;
  document.querySelector("#metric-profiles").textContent = profiles.length;
  document.querySelector("#metric-shortlists").textContent = "1";
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
        <div class="meta">${escapeHtml(request.role)} / ${escapeHtml(request.contact)}<br>Requested ${escapeHtml(request.requested)}</div>
      </div>
      <span class="status-pill">${escapeHtml(request.status)}</span>
    </article>
  `).join("");

  requestsTable.innerHTML = requests.map((request) => `
    <article class="table-row">
      <strong>${escapeHtml(request.organization)}</strong>
      <span>${escapeHtml(request.role)}</span>
      <span class="meta">${escapeHtml(request.contact)}</span>
      <span class="status-pill">${escapeHtml(request.status)}</span>
    </article>
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

  selectedProfileIds = [...new Set([...selectedProfileIds, profile.id])];
  currentShortlist = {
    ...currentShortlist,
    organization: request.organization,
    title: `${request.role} shortlist`,
    profileIds: selectedProfileIds
  };

  renderAll();
  showToast(`${profile.name} pushed to ${request.organization}`);
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
    <option value="${escapeHtml(request.organization)}">${escapeHtml(request.organization)} / ${escapeHtml(request.role)}</option>
  `).join("");
  select.value = currentShortlist.organization;
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
  const redactedProfiles = getShortlistProfiles().map(redactProfile);
  document.querySelector("#client-title").textContent = `${currentShortlist.organization}: ${currentShortlist.title}`;

  clientProfiles.innerHTML = redactedProfiles.map((profile) => `
    <article class="client-card">
      <h3>${escapeHtml(profile.name)}</h3>
      <div class="meta">${escapeHtml(profile.role)} / ${escapeHtml(profile.location)} / ${escapeHtml(profile.experience)}</div>
      <div class="tag-list">${profile.skills.map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join("")}</div>
      <div class="client-actions">
        <button>Interested</button>
        <button>Maybe</button>
        <button>Not fit</button>
      </div>
    </article>
  `).join("");
}

function renderAll() {
  renderMetrics();
  renderRequests();
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
  await copyText(buildShareUrl(), "Client link copied");
});

document.querySelector("#share-copy").addEventListener("click", async () => {
  await copyText(buildShareUrl(), "Generated link copied");
});

document.querySelector("#new-request").addEventListener("click", () => {
  showToast("Next step: connect this to your website request form");
});

["#filter-name", "#filter-location", "#filter-experience", "#filter-keyword"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderProfiles);
});

document.querySelector("#clear-filters").addEventListener("click", () => {
  document.querySelector("#profile-filters").reset();
  renderProfiles();
});

document.querySelector("#download-profiles").addEventListener("click", downloadProfiles);

document.querySelector("#upload-profiles").addEventListener("click", () => {
  document.querySelector("#profile-upload-input").click();
});

document.querySelector("#profile-upload-input").addEventListener("change", (event) => {
  uploadProfiles(event.target.files[0]);
  event.target.value = "";
});

document.querySelector("#generate-shortlist").addEventListener("click", () => {
  currentShortlist = {
    token: `sl-${Math.random().toString(16).slice(2, 8)}`,
    organization: document.querySelector("#organization-select").value,
    title: document.querySelector("#shortlist-title").value,
    profileIds: selectedProfileIds
  };
  renderAll();
  setSection("preview");
  showToast("Secure redacted view generated");
});

loadFrontendSubmissions();
renderAll();

if (window.location.hash.startsWith("#shortlist=")) {
  setSection("preview");
}
