let allClients = [];
let filteredClients = [];
let selectedClient = null;
let currentRecommendation = null;


function getElement(id) {
  return document.getElementById(id);
}


function setMessage(message, type = "info") {
  const messageBox =
    getElement("partnerPageMessage");

  if (!messageBox) {
    return;
  }

  if (!message) {
    messageBox.hidden = true;
    messageBox.textContent = "";
    messageBox.className =
      "client-page-message";
    return;
  }

  messageBox.hidden = false;
  messageBox.textContent = message;
  messageBox.className =
    `client-page-message ${type}`;
}


function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


function getInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}


function displayValue(value) {
  return value || "Not available";
}


function displayRiskProfile(value) {
  if (value === "Medium") {
    return "Moderate";
  }

  if (value === "Aggressive") {
    return "Growth";
  }

  return value || "Not available";
}


function displayPriority(value) {
  if (value === "Normal") {
    return "Medium";
  }

  return value || "Medium";
}


function getPriorityBadgeClass(priority) {
  const normalized = normalize(priority);

  if (normalized === "high") {
    return "badge danger";
  }

  if (
    normalized === "low"
  ) {
    return "badge success";
  }

  return "badge warning";
}


function getRiskBadgeClass(riskProfile) {
  const normalized =
    normalize(riskProfile);

  if (
    normalized === "aggressive" ||
    normalized === "growth"
  ) {
    return "badge danger";
  }

  if (
    normalized === "conservative"
  ) {
    return "badge success";
  }

  return "badge warning";
}


function renderClientRows() {
  const tableBody =
    getElement("partnerClientTableBody");

  const resultCount =
    getElement("partnerClientResultCount");

  const emptyMessage =
    getElement("emptyPartnerClientMessage");

  if (!tableBody) {
    return;
  }

  tableBody.replaceChildren();

  if (resultCount) {
    resultCount.textContent =
      `${filteredClients.length} client${filteredClients.length === 1 ? "" : "s"} found`;
  }

  if (emptyMessage) {
    emptyMessage.hidden =
      filteredClients.length > 0;
  }

  if (!filteredClients.length) {
    const row =
      document.createElement("tr");

    const cell =
      document.createElement("td");

    cell.colSpan = 6;
    cell.textContent =
      "No clients match your search or filters.";

    row.appendChild(cell);
    tableBody.appendChild(row);

    return;
  }

  filteredClients.forEach(client => {
    const row =
      document.createElement("tr");

    if (
      selectedClient &&
      selectedClient.id === client.id
    ) {
      row.classList.add(
        "selected-partner-client-row"
      );
    }

    const clientCell =
      document.createElement("td");

    const clientWrapper =
      document.createElement("div");

    clientWrapper.className =
      "client-name-cell";

    const avatar =
      document.createElement("div");

    avatar.className =
      "client-avatar";

    avatar.textContent =
      getInitials(client.full_name);

    const clientText =
      document.createElement("div");

    const clientName =
      document.createElement("strong");

    clientName.textContent =
      client.full_name;

    const clientAge =
      document.createElement("span");

    clientAge.textContent =
      client.age
        ? `Age ${client.age}`
        : "Age not available";

    clientText.append(
      clientName,
      clientAge
    );

    clientWrapper.append(
      avatar,
      clientText
    );

    clientCell.appendChild(
      clientWrapper
    );

    const occupationCell =
      document.createElement("td");

    occupationCell.textContent =
      displayValue(
        client.occupation
      );

    const riskCell =
      document.createElement("td");

    const riskBadge =
      document.createElement("span");

    riskBadge.className =
      getRiskBadgeClass(
        client.risk_profile
      );

    riskBadge.textContent =
      displayRiskProfile(
        client.risk_profile
      );

    riskCell.appendChild(
      riskBadge
    );

    const goalCell =
      document.createElement("td");

    goalCell.textContent =
      displayValue(client.goal);

    const priorityCell =
      document.createElement("td");

    const priorityBadge =
      document.createElement("span");

    priorityBadge.className =
      getPriorityBadgeClass(
        client.priority
      );

    priorityBadge.textContent =
      displayPriority(
        client.priority
      );

    priorityCell.appendChild(
      priorityBadge
    );

    const actionCell =
      document.createElement("td");

    const button =
      document.createElement("button");

    button.className =
      "secondary-btn";

    button.type =
      "button";

    button.textContent =
      "Recommend →";

    button.addEventListener(
      "click",
      () => {
        generateRecommendationForClient(
          client
        );
      }
    );

    actionCell.appendChild(button);

    row.append(
      clientCell,
      occupationCell,
      riskCell,
      goalCell,
      priorityCell,
      actionCell
    );

    tableBody.appendChild(row);
  });
}


function applyFilters() {
  const searchValue =
    normalize(
      getElement("partnerClientSearch")
        ?.value
    );

  const riskValue =
    getElement("partnerRiskFilter")
      ?.value || "all";

  const priorityValue =
    getElement("partnerPriorityFilter")
      ?.value || "all";

  filteredClients =
    allClients.filter(client => {
      const matchesSearch =
        !searchValue ||
        normalize(client.full_name)
          .includes(searchValue) ||
        normalize(client.occupation)
          .includes(searchValue) ||
        normalize(client.goal)
          .includes(searchValue);

      const matchesRisk =
        riskValue === "all" ||
        client.risk_profile === riskValue ||
        displayRiskProfile(
          client.risk_profile
        ) === riskValue;

      const matchesPriority =
        priorityValue === "all" ||
        client.priority === priorityValue ||
        displayPriority(
          client.priority
        ) === priorityValue;

      return (
        matchesSearch &&
        matchesRisk &&
        matchesPriority
      );
    });

  renderClientRows();
}


function clearFilters() {
  const search =
    getElement("partnerClientSearch");

  const risk =
    getElement("partnerRiskFilter");

  const priority =
    getElement("partnerPriorityFilter");

  if (search) {
    search.value = "";
  }

  if (risk) {
    risk.value = "all";
  }

  if (priority) {
    priority.value = "all";
  }

  filteredClients = [...allClients];

  renderClientRows();
}


function renderReasons(reasons = []) {
  const container =
    getElement("partnerReason");

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (!reasons.length) {
    const item =
      document.createElement("li");

    item.textContent =
      "No recommendation reason was provided.";

    container.appendChild(item);

    return;
  }

  reasons.forEach(reason => {
    const item =
      document.createElement("li");

    item.textContent = reason;

    container.appendChild(item);
  });
}


function renderSelectedClient(client) {
  getElement("selectedClientName").textContent =
    displayValue(client.full_name);

  getElement("selectedClientOccupation").textContent =
    displayValue(client.occupation);

  getElement("selectedClientRisk").textContent =
    displayRiskProfile(
      client.risk_profile
    );

  getElement("selectedClientPriority").textContent =
    displayPriority(
      client.priority
    );

  getElement("selectedClientGoal").textContent =
    displayValue(client.goal);
}


function renderBestPartner(bestPartner) {
  getElement("partnerName").textContent =
    bestPartner.name;

  getElement("partnerDescription").textContent =
    bestPartner.description ||
    bestPartner.specialty ||
    "No specialty available.";

  getElement("partnerScore").textContent =
    `${bestPartner.matchScore}%`;

  getElement("partnerNextStep").textContent =
    bestPartner.nextStep ||
    `Review ${bestPartner.name} with the client before creating a referral.`;

  renderReasons(
    bestPartner.why ||
    bestPartner.reason ||
    []
  );
}


function renderOtherPartners(partners = []) {
  const tableBody =
    getElement("otherPartnerTableBody");

  const countText =
    getElement("alternativePartnerCount");

  if (!tableBody) {
    return;
  }

  tableBody.replaceChildren();

  if (countText) {
    countText.textContent =
      `${partners.length} alternative partner${partners.length === 1 ? "" : "s"} available`;
  }

  if (!partners.length) {
    const row =
      document.createElement("tr");

    const cell =
      document.createElement("td");

    cell.colSpan = 4;
    cell.textContent =
      "No alternative partners available.";

    row.appendChild(cell);
    tableBody.appendChild(row);

    return;
  }

  partners.forEach(partner => {
    const row =
      document.createElement("tr");

    const nameCell =
      document.createElement("td");

    const name =
      document.createElement("strong");

    name.textContent =
      partner.name;

    nameCell.appendChild(name);

    const specialtyCell =
      document.createElement("td");

    specialtyCell.textContent =
      partner.specialty ||
      partner.description ||
      "Not available";

    const scoreCell =
      document.createElement("td");

    const scoreBadge =
      document.createElement("span");

    scoreBadge.className =
      "badge success";

    scoreBadge.textContent =
      `${partner.matchScore}%`;

    scoreCell.appendChild(
      scoreBadge
    );

    const actionCell =
      document.createElement("td");

    const viewButton =
      document.createElement("button");

    viewButton.className =
      "secondary-btn";

    viewButton.type =
      "button";

    viewButton.textContent =
      "Use Partner";

    viewButton.addEventListener(
      "click",
      () => {
        renderBestPartner({
          ...partner,
          why: [
            "Selected from the alternative partner list."
          ],
          nextStep:
            `Review ${partner.name} with the client before creating a referral.`
        });
      }
    );

    actionCell.appendChild(
      viewButton
    );

    row.append(
      nameCell,
      specialtyCell,
      scoreCell,
      actionCell
    );

    tableBody.appendChild(row);
  });
}


function renderRecommendation(result) {
  currentRecommendation = result;

  const section =
    getElement("recommendationSection");

  if (section) {
    section.hidden = false;
  }

  renderBestPartner(
    result.bestMatch
  );

  renderOtherPartners(
    result.otherPartners || []
  );

  renderClientRows();
}


async function generateRecommendationForClient(client) {
  selectedClient = client;

  setMessage(
    `Generating recommendation for ${client.full_name}...`
  );

  const section =
    getElement("recommendationSection");

  if (section) {
    section.hidden = false;
  }

  renderSelectedClient(client);

  getElement("partnerName").textContent =
    "Generating...";

  getElement("partnerDescription").textContent =
    "AdvisorFlow is matching this client with the most suitable partner.";

  getElement("partnerScore").textContent =
    "—";

  getElement("partnerNextStep").textContent =
    "Generating recommended next step...";

  renderReasons([
    "Reviewing client occupation, risk profile, goal and priority..."
  ]);

  try {
    const result =
      await apiGeneratePartnerRecommendation({
        name: client.full_name,
        age: client.age,
        occupation: client.occupation,
        riskProfile: client.risk_profile,
        goal: client.goal,
        priority: client.priority,
        lastMeeting: ""
      });

    renderRecommendation(result);

    setMessage(
      `Recommendation generated for ${client.full_name}.`,
      "success"
    );
  } catch (error) {
    setMessage(
      error.message ||
        "Unable to generate the partner recommendation.",
      "error"
    );

    getElement("partnerDescription").textContent =
      "Unable to generate the partner recommendation.";
  }
}


function createReferral() {
  if (
    !selectedClient ||
    !currentRecommendation
  ) {
    alert(
      "Please generate a recommendation first."
    );

    return;
  }

  alert(
    `Referral draft created for ${selectedClient.full_name} to ${currentRecommendation.bestMatch.name}.`
  );
}


async function loadPartnerPage() {
  const user =
    await window.authReady;

  if (!user) {
    return;
  }

  const profileName =
    getElement("profileName");

  if (profileName) {
    profileName.textContent =
      user.display_name ||
      user.name ||
      "Advisor";
  }

  try {
    allClients =
      await apiGetClients();

    filteredClients =
      [...allClients];

    renderClientRows();

    if (!allClients.length) {
      setMessage(
        "No clients found. Add a client before generating partner recommendations.",
        "info"
      );

      return;
    }

    const firstHighPriorityClient =
      allClients.find(
        client =>
          normalize(client.priority) === "high"
      );

    selectedClient =
      firstHighPriorityClient ||
      allClients[0];

    renderSelectedClient(
      selectedClient
    );

    setMessage(
      "Select a client and click Recommend to generate a partner match."
    );
  } catch (error) {
    setMessage(
      error.message ||
        "Unable to load clients from the database.",
      "error"
    );

    const tableBody =
      getElement("partnerClientTableBody");

    if (tableBody) {
      tableBody.innerHTML =
        `<tr><td colspan="6">Unable to load clients.</td></tr>`;
    }
  }
}


document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadPartnerPage();

    getElement("partnerClientSearch")
      ?.addEventListener(
        "input",
        applyFilters
      );

    getElement("partnerRiskFilter")
      ?.addEventListener(
        "change",
        applyFilters
      );

    getElement("partnerPriorityFilter")
      ?.addEventListener(
        "change",
        applyFilters
      );

    getElement("clearPartnerFilters")
      ?.addEventListener(
        "click",
        clearFilters
      );

    getElement("generateSelectedButton")
      ?.addEventListener(
        "click",
        () => {
          if (!selectedClient) {
            alert(
              "Please select a client first."
            );

            return;
          }

          generateRecommendationForClient(
            selectedClient
          );
        }
      );

    getElement("createReferralButton")
      ?.addEventListener(
        "click",
        createReferral
      );
  }
);