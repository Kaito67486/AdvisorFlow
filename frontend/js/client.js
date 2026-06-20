let clientDirectoryData = [];
let currentClientPayload = null;


function formatDate(
  dateValue,
  includeTime = false
) {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-MY",
    includeTime
      ? {
          dateStyle: "medium",
          timeStyle: "short"
        }
      : {
          dateStyle: "medium"
        }
  ).format(date);
}


function getInitials(name) {
  return String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}


function normalizeRiskForDisplay(risk) {
  const value =
    String(risk ?? "Medium")
      .trim()
      .toLowerCase();

  if (value === "aggressive") {
    return "Growth";
  }

  if (value === "medium") {
    return "Moderate";
  }

  return risk ?? "Moderate";
}


function normalizePriorityForDisplay(
  priority
) {
  const value =
    String(priority ?? "Normal")
      .trim()
      .toLowerCase();

  if (value === "normal") {
    return "Medium";
  }

  return priority ?? "Medium";
}


function getRiskClass(risk) {
  return normalizeRiskForDisplay(risk)
    .toLowerCase()
    .replaceAll(" ", "-");
}


function getPriorityClass(priority) {
  return normalizePriorityForDisplay(
    priority
  )
    .toLowerCase()
    .replaceAll(" ", "-");
}


function openClientDetails(clientId) {
  localStorage.setItem(
    "selectedClientId",
    String(clientId)
  );

  window.location.href =
    `client_details.html?id=${encodeURIComponent(
      clientId
    )}`;
}


function createClientRow(client) {
  const row =
    document.createElement("tr");

  row.className =
    "client-directory-row";

  row.tabIndex = 0;

  const nameCell =
    document.createElement("td");

  const nameContainer =
    document.createElement("div");

  nameContainer.className =
    "client-name-column";

  const avatar =
    document.createElement("div");

  avatar.className =
    "client-avatar";

  avatar.textContent =
    getInitials(client.full_name);

  const nameDetails =
    document.createElement("div");

  const name =
    document.createElement("strong");

  name.textContent =
    client.full_name;

  const age =
    document.createElement("small");

  age.textContent =
    client.age !== null &&
    client.age !== undefined
      ? `Age ${client.age}`
      : "Age not recorded";

  nameDetails.append(name, age);

  nameContainer.append(
    avatar,
    nameDetails
  );

  nameCell.appendChild(
    nameContainer
  );

  const occupationCell =
    document.createElement("td");

  occupationCell.textContent =
    client.occupation ??
    "Not available";

  const riskCell =
    document.createElement("td");

  const riskLabel =
    document.createElement("span");

  const riskDisplay =
    normalizeRiskForDisplay(
      client.risk_profile
    );

  riskLabel.className =
    `risk-label risk-${getRiskClass(
      client.risk_profile
    )}`;

  riskLabel.textContent =
    riskDisplay;

  riskCell.appendChild(riskLabel);

  const goalCell =
    document.createElement("td");

  goalCell.textContent =
    client.goal ??
    "Not available";

  const lastContactCell =
    document.createElement("td");

  lastContactCell.textContent =
    formatDate(
      client.last_contact_at
    );

  const priorityCell =
    document.createElement("td");

  const priorityLabel =
    document.createElement("span");

  priorityLabel.className =
    `priority-label priority-${getPriorityClass(
      client.priority
    )}`;

  priorityLabel.textContent =
    normalizePriorityForDisplay(
      client.priority
    );

  priorityCell.appendChild(
    priorityLabel
  );

  const actionCell =
    document.createElement("td");

  const viewButton =
    document.createElement("button");

  viewButton.type = "button";

  viewButton.className =
    "view-details-button";

  viewButton.textContent = "View →";

  actionCell.appendChild(
    viewButton
  );

  row.append(
    nameCell,
    occupationCell,
    riskCell,
    goalCell,
    lastContactCell,
    priorityCell,
    actionCell
  );

  const openClient = () => {
    openClientDetails(client.id);
  };

  row.addEventListener(
    "click",
    openClient
  );

  row.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        openClient();
      }
    }
  );

  viewButton.addEventListener(
    "click",
    event => {
      event.stopPropagation();
      openClient();
    }
  );

  return row;
}


function getFilteredClients() {
  const searchElement =
    document.getElementById(
      "clientSearch"
    );

  const riskElement =
    document.getElementById(
      "riskFilter"
    );

  const priorityElement =
    document.getElementById(
      "priorityFilter"
    );

  const searchValue =
    searchElement
      ? searchElement.value
          .trim()
          .toLowerCase()
      : "";

  const riskValue =
    riskElement?.value ?? "all";

  const priorityValue =
    priorityElement?.value ?? "all";

  return clientDirectoryData.filter(
    client => {
      const searchableText = [
        client.full_name,
        client.occupation,
        client.risk_profile,
        client.goal,
        client.email,
        client.phone
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchableText.includes(
          searchValue
        );

      const displayRisk =
        normalizeRiskForDisplay(
          client.risk_profile
        );

      const matchesRisk =
        riskValue === "all" ||
        displayRisk === riskValue;

      const displayPriority =
        normalizePriorityForDisplay(
          client.priority
        );

      const matchesPriority =
        priorityValue === "all" ||
        displayPriority ===
          priorityValue;

      return (
        matchesSearch &&
        matchesRisk &&
        matchesPriority
      );
    }
  );
}


function renderClientDirectory() {
  const tableBody =
    document.getElementById(
      "clientTableBody"
    );

  if (!tableBody) {
    return;
  }

  const filteredClients =
    getFilteredClients();

  tableBody.replaceChildren();

  filteredClients.forEach(
    client => {
      tableBody.appendChild(
        createClientRow(client)
      );
    }
  );

  const countElement =
    document.getElementById(
      "clientResultCount"
    );

  if (countElement) {
    countElement.textContent =
      `${filteredClients.length} client${
        filteredClients.length === 1
          ? ""
          : "s"
      } found`;
  }

  const emptyMessage =
    document.getElementById(
      "emptyClientMessage"
    );

  if (emptyMessage) {
    emptyMessage.hidden =
      filteredClients.length > 0;
  }
}


function sortClientDirectory() {
  clientDirectoryData.sort(
    (firstClient, secondClient) =>
      firstClient.full_name.localeCompare(
        secondClient.full_name,
        undefined,
        {
          sensitivity: "base"
        }
      )
  );
}


function showClientPageMessage(
  message,
  type = "success"
) {
  const messageElement =
    document.getElementById(
      "clientPageMessage"
    );

  if (!messageElement) {
    return;
  }

  messageElement.textContent =
    message;

  messageElement.className =
    `client-page-message ${type}`;

  messageElement.hidden =
    !message;

  if (message) {
    window.setTimeout(
      () => {
        messageElement.hidden = true;
      },
      5000
    );
  }
}


async function initializeClientDirectory() {
  const tableBody =
    document.getElementById(
      "clientTableBody"
    );

  if (!tableBody) {
    return;
  }

  const user =
    await window.authReady;

  if (!user) {
    return;
  }

  try {
    clientDirectoryData =
      await apiGetClients();

    sortClientDirectory();
    renderClientDirectory();
  } catch (error) {
    tableBody.replaceChildren();

    const row =
      document.createElement("tr");

    const cell =
      document.createElement("td");

    cell.colSpan = 7;

    cell.textContent =
      error.message ??
      "Unable to load clients.";

    row.appendChild(cell);
    tableBody.appendChild(row);
  }

  const searchElement =
    document.getElementById(
      "clientSearch"
    );

  const riskElement =
    document.getElementById(
      "riskFilter"
    );

  const priorityElement =
    document.getElementById(
      "priorityFilter"
    );

  const clearButton =
    document.getElementById(
      "clearClientFilters"
    );

  searchElement?.addEventListener(
    "input",
    renderClientDirectory
  );

  riskElement?.addEventListener(
    "change",
    renderClientDirectory
  );

  priorityElement?.addEventListener(
    "change",
    renderClientDirectory
  );

  clearButton?.addEventListener(
    "click",
    () => {
      if (searchElement) {
        searchElement.value = "";
      }

      if (riskElement) {
        riskElement.value = "all";
      }

      if (priorityElement) {
        priorityElement.value = "all";
      }

      renderClientDirectory();
    }
  );
}


function getAddClientDialog() {
  return document.getElementById(
    "addClientDialog"
  );
}


function showAddClientFormMessage(
  message,
  type = "error"
) {
  const messageElement =
    document.getElementById(
      "addClientFormMessage"
    );

  if (!messageElement) {
    return;
  }

  messageElement.textContent =
    message;

  messageElement.className =
    `client-form-message ${type}`;

  messageElement.hidden =
    !message;
}


function resetAddClientForm() {
  const form =
    document.getElementById(
      "addClientForm"
    );

  form?.reset();

  showAddClientFormMessage("");

  const riskProfile =
    document.getElementById(
      "newClientRiskProfile"
    );

  const priority =
    document.getElementById(
      "newClientPriority"
    );

  if (riskProfile) {
    riskProfile.value = "Medium";
  }

  if (priority) {
    priority.value = "Normal";
  }
}


function openAddClientDialog() {
  const dialog =
    getAddClientDialog();

  if (!dialog) {
    return;
  }

  resetAddClientForm();

  dialog.showModal();

  window.setTimeout(
    () => {
      document
        .getElementById(
          "newClientFullName"
        )
        ?.focus();
    },
    50
  );
}


function closeAddClientDialog() {
  const dialog =
    getAddClientDialog();

  if (dialog?.open) {
    dialog.close();
  }
}


function normalizeOptionalText(value) {
  const normalizedValue =
    String(value ?? "").trim();

  return normalizedValue || null;
}


function buildClientPayload(form) {
  const formData =
    new FormData(form);

  const fullName =
    String(
      formData.get("full_name") ?? ""
    ).trim();

  const ageValue =
    String(
      formData.get("age") ?? ""
    ).trim();

  const age =
    ageValue
      ? Number(ageValue)
      : null;

  if (!fullName) {
    throw new Error(
      "Full name is required."
    );
  }

  if (
    age !== null &&
    (
      !Number.isInteger(age) ||
      age < 0 ||
      age > 120
    )
  ) {
    throw new Error(
      "Age must be a whole number between 0 and 120."
    );
  }

  return {
    full_name: fullName,
    email: normalizeOptionalText(
      formData.get("email")
    ),
    phone: normalizeOptionalText(
      formData.get("phone")
    ),
    age,
    occupation: normalizeOptionalText(
      formData.get("occupation")
    ),
    risk_profile:
      String(
        formData.get(
          "risk_profile"
        ) ?? "Medium"
      ),
    goal: normalizeOptionalText(
      formData.get("goal")
    ),
    priority:
      String(
        formData.get(
          "priority"
        ) ?? "Normal"
      )
  };
}


function setAddClientLoading(
  isLoading
) {
  const saveButton =
    document.getElementById(
      "saveClientButton"
    );

  const cancelButton =
    document.getElementById(
      "cancelAddClientButton"
    );

  const closeButton =
    document.getElementById(
      "closeAddClientButton"
    );

  if (saveButton) {
    saveButton.disabled =
      isLoading;

    saveButton.textContent =
      isLoading
        ? "Saving..."
        : "Save Client";
  }

  if (cancelButton) {
    cancelButton.disabled =
      isLoading;
  }

  if (closeButton) {
    closeButton.disabled =
      isLoading;
  }
}


async function handleAddClientSubmit(
  event
) {
  event.preventDefault();

  const form =
    event.currentTarget;

  if (!form.reportValidity()) {
    return;
  }

  showAddClientFormMessage("");

  let clientPayload;

  try {
    clientPayload =
      buildClientPayload(form);
  } catch (error) {
    showAddClientFormMessage(
      error.message ??
      "Please check the client information."
    );

    return;
  }

  setAddClientLoading(true);

  try {
    const createdClient =
      await apiCreateClient(
        clientPayload
      );

    clientDirectoryData.push(
      createdClient
    );

    sortClientDirectory();
    renderClientDirectory();

    closeAddClientDialog();

    showClientPageMessage(
      `${createdClient.full_name} was added successfully.`,
      "success"
    );
  } catch (error) {
    showAddClientFormMessage(
      error.message ??
      "Unable to create the client."
    );
  } finally {
    setAddClientLoading(false);
  }
}


function initializeAddClientForm() {
  const dialog =
    getAddClientDialog();

  const form =
    document.getElementById(
      "addClientForm"
    );

  document
    .getElementById(
      "openAddClientButton"
    )
    ?.addEventListener(
      "click",
      openAddClientDialog
    );

  document
    .getElementById(
      "closeAddClientButton"
    )
    ?.addEventListener(
      "click",
      closeAddClientDialog
    );

  document
    .getElementById(
      "cancelAddClientButton"
    )
    ?.addEventListener(
      "click",
      closeAddClientDialog
    );

  form?.addEventListener(
    "submit",
    handleAddClientSubmit
  );

  dialog?.addEventListener(
    "click",
    event => {
      if (event.target === dialog) {
        closeAddClientDialog();
      }
    }
  );
}


function getSelectedClientId() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  const rawId =
    parameters.get("id") ??
    localStorage.getItem(
      "selectedClientId"
    );

  const clientId =
    Number(rawId);

  if (
    !Number.isInteger(clientId) ||
    clientId <= 0
  ) {
    return null;
  }

  return clientId;
}


function setClientText(
  elementId,
  value
) {
  const element =
    document.getElementById(
      elementId
    );

  if (element) {
    element.textContent =
      value ?? "Not available";
  }
}


function renderClientTimeline(
  meetings
) {
  const container =
    document.getElementById(
      "clientTimeline"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (!meetings.length) {
    const message =
      document.createElement("p");

    message.textContent =
      "No client interactions recorded.";

    container.appendChild(message);

    return;
  }

  meetings
    .slice(0, 4)
    .forEach(meeting => {
      const item =
        document.createElement("div");

      const date =
        document.createElement("strong");

      date.textContent =
        formatDate(
          meeting.scheduled_at
        );

      const title =
        document.createElement("p");

      title.textContent =
        meeting.title;

      item.append(date, title);

      container.appendChild(item);
    });
}


function renderMeetingHistory(
  meetings
) {
  const tableBody =
    document.getElementById(
      "clientMeetingHistory"
    );

  if (!tableBody) {
    return;
  }

  tableBody.replaceChildren();

  if (!meetings.length) {
    const row =
      document.createElement("tr");

    const cell =
      document.createElement("td");

    cell.colSpan = 3;

    cell.textContent =
      "No meeting history is available.";

    row.appendChild(cell);

    tableBody.appendChild(row);

    return;
  }

  meetings.forEach(meeting => {
    const row =
      document.createElement("tr");

    const dateCell =
      document.createElement("td");

    dateCell.textContent =
      formatDate(
        meeting.scheduled_at
      );

    const titleCell =
      document.createElement("td");

    titleCell.textContent =
      meeting.title;

    const summaryCell =
      document.createElement("td");

    summaryCell.textContent =
      meeting.ai_summary ??
      meeting.raw_notes ??
      "No summary recorded.";

    row.append(
      dateCell,
      titleCell,
      summaryCell
    );

    tableBody.appendChild(row);
  });
}


function renderClientTasks(tasks) {
  const container =
    document.getElementById(
      "clientTaskList"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (!tasks.length) {
    const message =
      document.createElement("p");

    message.textContent =
      "No follow-up tasks recorded.";

    container.appendChild(message);

    return;
  }

  tasks.forEach(task => {
    const item =
      document.createElement("div");

    item.className =
      "meeting-item";

    const details =
      document.createElement("div");

    const title =
      document.createElement("h3");

    title.textContent =
      task.title;

    const due =
      document.createElement("p");

    due.textContent =
      `Due: ${formatDate(
        task.due_at,
        true
      )}`;

    details.append(
      title,
      due
    );

    const taskStatus =
      document.createElement("span");

    taskStatus.className =
      task.status === "COMPLETED"
        ? "badge success"
        : "badge warning";

    taskStatus.textContent =
      task.status;

    item.append(
      details,
      taskStatus
    );

    container.appendChild(item);
  });
}


function renderClientDetails(payload) {
  const client =
    payload.client;

  document.title =
    `AdvisorFlow | ${client.full_name}`;

  setClientText(
    "clientName",
    client.full_name
  );

  setClientText(
    "clientAge",
    client.age
  );

  setClientText(
    "clientOccupation",
    client.occupation
  );

  setClientText(
    "clientRisk",
    normalizeRiskForDisplay(
      client.risk_profile
    )
  );

  setClientText(
    "clientGoal",
    client.goal
  );

  setClientText(
    "clientLastMeeting",
    formatDate(
      client.last_contact_at
    )
  );

  setClientText(
    "clientPriority",
    normalizePriorityForDisplay(
      client.priority
    )
  );

  renderClientTimeline(
    payload.meetings ?? []
  );

  renderMeetingHistory(
    payload.meetings ?? []
  );

  renderClientTasks(
    payload.tasks ?? []
  );
}


function renderAiBrief(result) {
  const container =
    document.getElementById(
      "clientAiBrief"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const heading =
    document.createElement("h3");

  heading.textContent =
    "Loading...";

  const list =
    document.createElement("ul");

  const focusItems =
    Array.isArray(result.focus)
      ? result.focus
      : [];

  focusItems.forEach(item => {
    const listItem =
      document.createElement("li");

    listItem.textContent =
      item;

    list.appendChild(listItem);
  });

  const directionHeading =
    document.createElement("h3");

  directionHeading.textContent =
    " ";

  const direction =
    document.createElement("p");

  direction.textContent =
    result.product ??
    " ";

  const urgencyHeading =
    document.createElement("h3");

  urgencyHeading.textContent =
    " ";

  const urgency =
    document.createElement("p");

  urgency.textContent =
    result.urgency ??
    " ";

  container.append(
    heading,
    list,
    directionHeading,
    direction,
    urgencyHeading,
    urgency
  );
}


async function generateClientBrief() {
  if (!currentClientPayload) {
    return;
  }

  const button =
    document.getElementById(
      "generateClientBrief"
    );

  const container =
    document.getElementById(
      "clientAiBrief"
    );

  if (!button || !container) {
    return;
  }

  button.disabled = true;

  button.textContent =
    "Generating...";

  container.textContent =
    "Preparing the client brief...";

  const client =
    currentClientPayload.client;

  const latestMeeting =
    currentClientPayload
      .meetings?.[0];

  try {
    const result =
      await apiGenerateBrief({
        name: client.full_name,
        age: client.age,
        occupation:
          client.occupation,
        riskProfile:
          client.risk_profile,
        goal: client.goal,
        lastMeeting: latestMeeting
          ? formatDate(
              latestMeeting.scheduled_at
            )
          : "",
        priority: client.priority
      });

    renderAiBrief(result);
  } catch (error) {
    container.textContent =
      error.message ??
      "Unable to generate the client brief.";
  } finally {
    button.disabled = false;

    button.textContent =
      "✨ Generate AI Brief";
  }
}


async function initializeClientDetails() {
  const clientName =
    document.getElementById(
      "clientName"
    );

  if (!clientName) {
    return;
  }

  const user =
    await window.authReady;

  if (!user) {
    return;
  }

  const clientId =
    getSelectedClientId();

  if (!clientId) {
    window.location.replace(
      "client.html"
    );

    return;
  }

  try {
    currentClientPayload =
      await apiGetClient(clientId);

    renderClientDetails(
      currentClientPayload
    );
  } catch (error) {
    clientName.textContent =
      "Unable to load client";

    const container =
      document.getElementById(
        "clientAiBrief"
      );

    if (container) {
      container.textContent =
        error.message ??
        "Unable to load the client.";
    }
  }

  document
    .getElementById(
      "generateClientBrief"
    )
    ?.addEventListener(
      "click",
      generateClientBrief
    );
}


document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initializeAddClientForm();

    await initializeClientDirectory();

    await initializeClientDetails();
  }
);