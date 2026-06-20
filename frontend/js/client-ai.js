function getAiBriefClientId() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  const rawClientId =
    parameters.get("id") ??
    localStorage.getItem(
      "selectedClientId"
    );

  const clientId =
    Number(rawClientId);

  if (
    !Number.isInteger(clientId) ||
    clientId <= 0
  ) {
    return null;
  }

  return clientId;
}


function appendBriefList(
  container,
  title,
  items
) {
  const section =
    document.createElement("section");

  section.className =
    "client-ai-section";

  const heading =
    document.createElement("h3");

  heading.textContent = title;

  section.appendChild(heading);

  const list =
    document.createElement("ul");

  const values =
    Array.isArray(items)
      ? items
      : [];

  if (!values.length) {
    const emptyItem =
      document.createElement("li");

    emptyItem.textContent =
      "No items were identified.";

    list.appendChild(emptyItem);
  } else {
    values.forEach(value => {
      const item =
        document.createElement("li");

      item.textContent = value;

      list.appendChild(item);
    });
  }

  section.appendChild(list);
  container.appendChild(section);
}


function renderRealClientBrief(
  result
) {
  const container =
    document.getElementById(
      "clientAiBrief"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const headline =
    document.createElement("h3");

  headline.className =
    "client-ai-headline";

  headline.textContent =
    result.headline;

  container.appendChild(headline);

  appendBriefList(
    container,
    "Today's Priorities",
    result.priorities
  );

  appendBriefList(
    container,
    "Meeting Preparation",
    result.meeting_preparation
  );

  appendBriefList(
    container,
    "Relevant Client Context",
    result.client_context
  );

  const actionSection =
    document.createElement("section");

  actionSection.className =
    "client-ai-next-action";

  const actionTitle =
    document.createElement("h3");

  actionTitle.textContent =
    "Suggested Next Action";

  const actionText =
    document.createElement("p");

  actionText.textContent =
    result.suggested_next_action;

  actionSection.append(
    actionTitle,
    actionText
  );

  container.appendChild(
    actionSection
  );

  const generatedTime =
    document.createElement("small");

  generatedTime.className =
    "client-ai-generated-time";

  generatedTime.textContent =
    `Generated ${new Date(
      result.generated_at
    ).toLocaleString("en-MY")}`;

  container.appendChild(
    generatedTime
  );
}


async function generateRealClientBrief(
  button
) {
  const clientId =
    getAiBriefClientId();

  const container =
    document.getElementById(
      "clientAiBrief"
    );

  if (!clientId || !container) {
    return;
  }

  button.disabled = true;

  button.textContent =
    "Generating with AI...";

  container.textContent =
    "Reading the client profile, confirmed meetings and pending tasks...";

  try {
    const result =
      await apiGenerateClientAiBrief(
        clientId
      );

    renderRealClientBrief(
      result
    );
  } catch (error) {
    container.textContent =
      error.message ??
      "Unable to generate the AI brief.";
  } finally {
    button.disabled = false;

    button.textContent =
      "✨ Generate AI Brief";
  }
}


function initializeRealClientBrief() {
  const oldButton =
    document.getElementById(
      "generateClientBrief"
    );

  if (!oldButton) {
    return;
  }

  // Cloning removes the old rule-based event listener.
  const newButton =
    oldButton.cloneNode(true);

  oldButton.replaceWith(
    newButton
  );

  newButton.addEventListener(
    "click",
    () => {
      generateRealClientBrief(
        newButton
      );
    }
  );
}


document.addEventListener(
  "DOMContentLoaded",
  initializeRealClientBrief
);