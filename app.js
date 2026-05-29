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
    contact: "priya.raman@example.com / +44 7000 000222 / linkedin.com/in/priya-raman",
    notes: "Best fit for fast-moving recruitment projects."
  }
];

let selectedProfileIds = [101, 102];
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
    .map((id) => profiles.find((profile) => profile.id === id))
    .filter(Boolean);
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

  profileList.innerHTML = profiles.map((profile) => `
    <article class="profile-card">
      <div>
        <h3>${escapeHtml(profile.name)}</h3>
        <div class="meta">${escapeHtml(profile.role)} / ${escapeHtml(profile.location)} / ${escapeHtml(profile.experience)}</div>
      </div>
      <div class="tag-list">${profile.skills.map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join("")}</div>
      <div class="private-line">Private: ${escapeHtml(profile.contact)}</div>
    </article>
  `).join("");
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
      <input type="checkbox" value="${profile.id}" ${selectedProfileIds.includes(profile.id) ? "checked" : ""}>
      <span>
        <strong>${escapeHtml(profile.name)}</strong>
        <span class="meta">${escapeHtml(profile.role)} / ${escapeHtml(profile.location)} / ${escapeHtml(profile.experience)}</span>
      </span>
    </label>
  `).join("");

  selectableProfiles.querySelectorAll("input").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = Number(checkbox.value);
      if (checkbox.checked) {
        selectedProfileIds = [...new Set([...selectedProfileIds, id])];
      } else {
        selectedProfileIds = selectedProfileIds.filter((profileId) => profileId !== id);
      }
      renderShortlistOutput();
    });
  });
}

function renderShortlistOutput() {
  const output = document.querySelector("#shortlist-output");
  const selected = selectedProfileIds
    .map((id) => profiles.find((profile) => profile.id === id))
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

document.querySelector("#profile-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  profiles = [
    ...profiles,
    {
      id: Date.now(),
      name: data.get("name"),
      role: data.get("role"),
      location: data.get("location"),
      experience: data.get("experience"),
      skills: data.get("skills").split(",").map((skill) => skill.trim()).filter(Boolean),
      contact: data.get("contact"),
      notes: data.get("notes")
    }
  ];
  event.currentTarget.reset();
  renderAll();
  showToast("Profile added to admin bucket");
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

renderAll();

if (window.location.hash.startsWith("#shortlist=")) {
  setSection("preview");
}
