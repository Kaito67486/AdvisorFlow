let editableClientPayload = null;


function getClientActionId() {
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


function normalizeOptionalText(
  value
) {
  const normalizedValue =
    String(value ?? "").trim();

  return normalizedValue || null;
}


function setClientDetailsMessage(
  message,
  type
) {
  const element =
    document.getElementById(
      "clientDetailsMessage"
    );

  if (!element) {
    return;
  }

  element.textContent = message;

  element.className =
    `client-details-message ${type}`;

  element.hidden = !message;
}


function setClientDisplayValue(
  id,
  value
) {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent =
      value ??
      "Not available";
  }
}


function populateClientDisplay(
  client
) {
  setClientDisplayValue(
    "clientName",
    client.full_name
  );

  setClientDisplayValue(
    "clientEmail",
    client.email
  );

  setClientDisplayValue(
    "clientPhone",
    client.phone
  );

  setClientDisplayValue(
    "clientAge",
    client.age
  );

  setClientDisplayValue(
    "clientOccupation",
    client.occupation
  );

  const riskDisplay =
    client.risk_profile === "Medium"
      ? "Moderate"
      : (
          client.risk_profile === "Aggressive"
            ? "Growth"
            : client.risk_profile
        );

  setClientDisplayValue(
    "clientRisk",
    riskDisplay
  );

  setClientDisplayValue(
    "clientGoal",
    client.goal
  );

  const priorityDisplay =
    client.priority === "Normal"
      ? "Medium"
      : client.priority;

  setClientDisplayValue(
    "clientPriority",
    priorityDisplay
  );

  setClientDisplayValue(
    "clientStatus",
    client.status
  );
}


function populateEditForm(
  client
) {
  document.getElementById(
    "editClientFullName"
  ).value =
    client.full_name ?? "";

  document.getElementById(
    "editClientEmail"
  ).value =
    client.email ?? "";

  document.getElementById(
    "editClientPhone"
  ).value =
    client.phone ?? "";

  document.getElementById(
    "editClientAge"
  ).value =
    client.age ?? "";

  document.getElementById(
    "editClientOccupation"
  ).value =
    client.occupation ?? "";

  document.getElementById(
    "editClientRisk"
  ).value =
    client.risk_profile ??
    "Medium";

  document.getElementById(
    "editClientPriority"
  ).value =
    client.priority ??
    "Normal";

  document.getElementById(
    "editClientStatus"
  ).value =
    client.status ??
    "ACTIVE";

  document.getElementById(
    "editClientGoal"
  ).value =
    client.goal ?? "";
}


function openEditClientDialog() {
  if (!editableClientPayload) {
    return;
  }

  populateEditForm(
    editableClientPayload.client
  );

  const dialog =
    document.getElementById(
      "editClientDialog"
    );

  dialog.showModal();
}


function closeEditClientDialog() {
  const dialog =
    document.getElementById(
      "editClientDialog"
    );

  if (dialog.open) {
    dialog.close();
  }
}


function buildClientUpdatePayload() {
  const ageValue =
    document.getElementById(
      "editClientAge"
    ).value.trim();

  const age =
    ageValue
      ? Number(ageValue)
      : null;

  if (
    age !== null &&
    (
      !Number.isInteger(age) ||
      age < 0 ||
      age > 120
    )
  ) {
    throw new Error(
      "Age must be between 0 and 120."
    );
  }

  const fullName =
    document.getElementById(
      "editClientFullName"
    ).value.trim();

  if (!fullName) {
    throw new Error(
      "Full name is required."
    );
  }

  return {
    full_name: fullName,

    email:
      normalizeOptionalText(
        document.getElementById(
          "editClientEmail"
        ).value
      ),

    phone:
      normalizeOptionalText(
        document.getElementById(
          "editClientPhone"
        ).value
      ),

    age,

    occupation:
      normalizeOptionalText(
        document.getElementById(
          "editClientOccupation"
        ).value
      ),

    risk_profile:
      document.getElementById(
        "editClientRisk"
      ).value,

    priority:
      document.getElementById(
        "editClientPriority"
      ).value,

    status:
      document.getElementById(
        "editClientStatus"
      ).value,

    goal:
      normalizeOptionalText(
        document.getElementById(
          "editClientGoal"
        ).value
      )
  };
}


function setEditClientLoading(
  loading
) {
  const saveButton =
    document.getElementById(
      "saveEditClientButton"
    );

  saveButton.disabled =
    loading;

  saveButton.textContent =
    loading
      ? "Saving..."
      : "Save Changes";
}


async function handleEditClientSubmit(
  event
) {
  event.preventDefault();

  const clientId =
    getClientActionId();

  if (!clientId) {
    return;
  }

  const message =
    document.getElementById(
      "editClientFormMessage"
    );

  message.hidden = true;

  let payload;

  try {
    payload =
      buildClientUpdatePayload();
  } catch (error) {
    message.textContent =
      error.message;

    message.hidden = false;

    return;
  }

  setEditClientLoading(true);

  try {
    const updatedClient =
      await apiUpdateClient(
        clientId,
        payload
      );

    editableClientPayload.client =
      updatedClient;

    populateClientDisplay(
      updatedClient
    );

    closeEditClientDialog();

    setClientDetailsMessage(
      "Client information was updated successfully.",
      "success"
    );

  } catch (error) {
    message.textContent =
      error.message ??
      "Unable to update the client.";

    message.hidden = false;
  } finally {
    setEditClientLoading(false);
  }
}


async function deleteCurrentClient() {
  const clientId =
    getClientActionId();

  if (
    !clientId ||
    !editableClientPayload
  ) {
    return;
  }

  const clientName =
    editableClientPayload
      .client
      .full_name;

  const confirmed =
    window.confirm(
      `Delete ${clientName}?\n\n`
      + "This will also delete the client's "
      + "meetings and follow-up tasks."
    );

  if (!confirmed) {
    return;
  }

  const secondConfirmation =
    window.confirm(
      "This action cannot be undone. Continue?"
    );

  if (!secondConfirmation) {
    return;
  }

  const button =
    document.getElementById(
      "deleteClientButton"
    );

  button.disabled = true;
  button.textContent =
    "Deleting...";

  try {
    await apiDeleteClient(
      clientId
    );

    localStorage.removeItem(
      "selectedClientId"
    );

    window.location.replace(
      "client.html"
    );

  } catch (error) {
    button.disabled = false;
    button.textContent =
      "Delete Client";

    setClientDetailsMessage(
      error.message ??
      "Unable to delete the client.",
      "error"
    );
  }
}


async function initializeClientActions() {
  const user =
    await window.authReady;

  if (!user) {
    return;
  }

  const clientId =
    getClientActionId();

  if (!clientId) {
    return;
  }

  try {
    editableClientPayload =
      await apiGetClient(
        clientId
      );

    populateClientDisplay(
      editableClientPayload.client
    );

  } catch (error) {
    setClientDetailsMessage(
      error.message ??
      "Unable to load client information.",
      "error"
    );

    return;
  }

  document.getElementById(
    "editClientButton"
  ).addEventListener(
    "click",
    openEditClientDialog
  );

  document.getElementById(
    "deleteClientButton"
  ).addEventListener(
    "click",
    deleteCurrentClient
  );

  document.getElementById(
    "closeEditClientButton"
  ).addEventListener(
    "click",
    closeEditClientDialog
  );

  document.getElementById(
    "cancelEditClientButton"
  ).addEventListener(
    "click",
    closeEditClientDialog
  );

  document.getElementById(
    "editClientForm"
  ).addEventListener(
    "submit",
    handleEditClientSubmit
  );

  document.getElementById(
    "editClientDialog"
  ).addEventListener(
    "click",
    event => {
      if (
        event.target ===
        event.currentTarget
      ) {
        closeEditClientDialog();
      }
    }
  );
}


document.addEventListener(
  "DOMContentLoaded",
  initializeClientActions
);