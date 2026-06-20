let activeMeetingSummary = null;


function splitSummaryLines(value) {
  return String(value ?? "")
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);
}


function toLocalDateTimeValue(
  dateValue
) {
  if (!dateValue) {
    return "";
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  const localDate =
    new Date(
      date.getTime() -
      date.getTimezoneOffset() *
      60000
    );

  return localDate
    .toISOString()
    .slice(0, 16);
}


function createReviewField(
  labelText,
  element
) {
  const wrapper =
    document.createElement("div");

  wrapper.className =
    "meeting-review-field";

  const label =
    document.createElement("label");

  label.textContent =
    labelText;

  wrapper.append(
    label,
    element
  );

  return wrapper;
}


function createReviewTextarea(
  id,
  value,
  rows = 5
) {
  const textarea =
    document.createElement(
      "textarea"
    );

  textarea.id = id;
  textarea.value = value ?? "";
  textarea.rows = rows;
  textarea.disabled = true;

  return textarea;
}


function setReviewFieldsDisabled(
  disabled
) {
  [
    "reviewSummary",
    "reviewClientNeeds",
    "reviewActionItems",
    "reviewFollowUpAt"
  ].forEach(id => {
    const element =
      document.getElementById(id);

    if (element) {
      element.disabled = disabled;
    }
  });
}


function setMeetingReviewMessage(
  message,
  type = "info"
) {
  const element =
    document.getElementById(
      "meetingReviewMessage"
    );

  if (!element) {
    return;
  }

  element.textContent = message;

  element.className =
    `meeting-review-message ${type}`;

  element.hidden =
    !message;
}


function buildMeetingUpdatePayload() {
  const followUpValue =
    document.getElementById(
      "reviewFollowUpAt"
    ).value;

  return {
    summary:
      document
        .getElementById(
          "reviewSummary"
        )
        .value
        .trim(),

    client_needs:
      splitSummaryLines(
        document
          .getElementById(
            "reviewClientNeeds"
          )
          .value
      ),

    action_items:
      splitSummaryLines(
        document
          .getElementById(
            "reviewActionItems"
          )
          .value
      ),

    next_follow_up_at:
      followUpValue
        ? new Date(
            followUpValue
          ).toISOString()
        : null
  };
}


function renderConfirmedTasks(
  tasks
) {
  const container =
    document.getElementById(
      "confirmedTaskList"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (!tasks.length) {
    const message =
      document.createElement("p");

    message.textContent =
      "The summary was confirmed, but no action items were available to create tasks.";

    container.appendChild(
      message
    );

    return;
  }

  const heading =
    document.createElement("h3");

  heading.textContent =
    "Created Follow-up Tasks";

  const list =
    document.createElement("ul");

  tasks.forEach(task => {
    const item =
      document.createElement("li");

    const dueText =
      task.due_at
        ? ` — due ${new Date(
            task.due_at
          ).toLocaleString("en-MY")}`
        : "";

    item.textContent =
      `${task.title}${dueText}`;

    list.appendChild(item);
  });

  container.append(
    heading,
    list
  );
}


async function saveMeetingSummaryChanges(
  meetingId
) {
  const payload =
    buildMeetingUpdatePayload();

  if (!payload.summary) {
    throw new Error(
      "Meeting summary cannot be empty."
    );
  }

  const savedSummary =
    await apiUpdateMeetingSummary(
      meetingId,
      payload
    );

  activeMeetingSummary =
    savedSummary;

  return savedSummary;
}


function lockConfirmedSummary() {
  setReviewFieldsDisabled(true);

  const editButton =
    document.getElementById(
      "editSummaryButton"
    );

  const saveButton =
    document.getElementById(
      "saveSummaryButton"
    );

  const confirmButton =
    document.getElementById(
      "confirmSummaryButton"
    );

  if (editButton) {
    editButton.disabled = true;
  }

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.hidden = true;
  }

  if (confirmButton) {
    confirmButton.disabled = true;

    confirmButton.textContent =
      "Summary Confirmed";
  }
}


async function handleSaveSummary() {
  if (!activeMeetingSummary) {
    return;
  }

  const saveButton =
    document.getElementById(
      "saveSummaryButton"
    );

  saveButton.disabled = true;
  saveButton.textContent =
    "Saving...";

  setMeetingReviewMessage(
    "Saving advisor changes...",
    "info"
  );

  try {
    await saveMeetingSummaryChanges(
      activeMeetingSummary.meeting_id
    );

    setReviewFieldsDisabled(true);

    document.getElementById(
      "editSummaryButton"
    ).hidden = false;

    saveButton.hidden = true;

    setMeetingReviewMessage(
      "Summary changes were saved.",
      "success"
    );
  } catch (error) {
    setMeetingReviewMessage(
      error.message ??
      "Unable to save the summary.",
      "error"
    );
  } finally {
    saveButton.disabled = false;
    saveButton.textContent =
      "Save Changes";
  }
}


async function handleConfirmSummary() {
  if (!activeMeetingSummary) {
    return;
  }

  const confirmButton =
    document.getElementById(
      "confirmSummaryButton"
    );

  confirmButton.disabled = true;

  confirmButton.textContent =
    "Confirming...";

  setMeetingReviewMessage(
    "Saving the final version and creating follow-up tasks...",
    "info"
  );

  try {
    await saveMeetingSummaryChanges(
      activeMeetingSummary.meeting_id
    );

    const confirmation =
      await apiConfirmMeetingSummary(
        activeMeetingSummary.meeting_id
      );

    activeMeetingSummary =
      confirmation.meeting;

    renderConfirmedTasks(
      confirmation.created_tasks
    );

    lockConfirmedSummary();

    setMeetingReviewMessage(
      confirmation.already_confirmed
        ? "This meeting summary was already confirmed."
        : "Summary confirmed. Follow-up tasks were created successfully.",
      "success"
    );
  } catch (error) {
    confirmButton.disabled = false;

    confirmButton.textContent =
      "Confirm Summary";

    setMeetingReviewMessage(
      error.message ??
      "Unable to confirm the summary.",
      "error"
    );
  }
}


function renderMeetingReview(
  result
) {
  activeMeetingSummary =
    result;

  const output =
    document.getElementById(
      "summaryOutput"
    );

  if (!output) {
    return;
  }

  output.replaceChildren();

  const status =
    document.createElement("div");

  status.id =
    "meetingReviewMessage";

  status.className =
    "meeting-review-message info";

  status.textContent =
    result.advisor_confirmed
      ? "This summary has been confirmed."
      : (
          "Review the AI output before confirming it. "
          "Only confirmed action items become follow-up tasks."
        );

  output.appendChild(status);

  const summaryInput =
    createReviewTextarea(
      "reviewSummary",
      result.summary,
      6
    );

  output.appendChild(
    createReviewField(
      "Meeting Summary",
      summaryInput
    )
  );

  const needsInput =
    createReviewTextarea(
      "reviewClientNeeds",
      (
        result.client_needs ?? []
      ).join("\n"),
      5
    );

  output.appendChild(
    createReviewField(
      "Client Needs — one item per line",
      needsInput
    )
  );

  const actionsInput =
    createReviewTextarea(
      "reviewActionItems",
      (
        result.action_items ?? []
      ).join("\n"),
      6
    );

  output.appendChild(
    createReviewField(
      "Action Items — one item per line",
      actionsInput
    )
  );

  const followUpInput =
    document.createElement("input");

  followUpInput.id =
    "reviewFollowUpAt";

  followUpInput.type =
    "datetime-local";

  followUpInput.value =
    toLocalDateTimeValue(
      result.next_follow_up_at
    );

  followUpInput.disabled = true;

  output.appendChild(
    createReviewField(
      "Next Follow-up",
      followUpInput
    )
  );

  const actions =
    document.createElement("div");

  actions.className =
    "meeting-review-actions";

  const editButton =
    document.createElement("button");

  editButton.id =
    "editSummaryButton";

  editButton.type = "button";

  editButton.className =
    "secondary-btn";

  editButton.textContent =
    "Edit Summary";

  const saveButton =
    document.createElement("button");

  saveButton.id =
    "saveSummaryButton";

  saveButton.type = "button";

  saveButton.className =
    "secondary-btn";

  saveButton.textContent =
    "Save Changes";

  saveButton.hidden = true;

  const confirmButton =
    document.createElement("button");

  confirmButton.id =
    "confirmSummaryButton";

  confirmButton.type = "button";

  confirmButton.className =
    "primary-btn";

  confirmButton.textContent =
    result.advisor_confirmed
      ? "Summary Confirmed"
      : "Confirm Summary";

  actions.append(
    editButton,
    saveButton,
    confirmButton
  );

  output.appendChild(actions);

  const taskList =
    document.createElement("div");

  taskList.id =
    "confirmedTaskList";

  taskList.className =
    "confirmed-task-list";

  output.appendChild(taskList);

  editButton.addEventListener(
    "click",
    () => {
      setReviewFieldsDisabled(false);

      editButton.hidden = true;
      saveButton.hidden = false;

      setMeetingReviewMessage(
        "Editing enabled. Save your changes before confirming.",
        "info"
      );
    }
  );

  saveButton.addEventListener(
    "click",
    handleSaveSummary
  );

  confirmButton.addEventListener(
    "click",
    handleConfirmSummary
  );

  if (result.advisor_confirmed) {
    lockConfirmedSummary();
  }
}


// Wrap the existing function used by meeting.js.
const originalGenerateMeetingSummary =
  window.apiGenerateMeetingSummary;


if (
  typeof originalGenerateMeetingSummary
  === "function"
) {
  window.apiGenerateMeetingSummary =
    async function (
      meetingId
    ) {
      const result =
        await originalGenerateMeetingSummary(
          meetingId
        );

      // meeting.js renders its basic output first.
      // This replaces it with the review interface afterwards.
      window.setTimeout(
        () => {
          renderMeetingReview(
            result
          );
        },
        0
      );

      return result;
    };
}