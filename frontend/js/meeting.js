const MAX_RECORDING_SECONDS = 600;

let mediaRecorder = null;
let microphoneStream = null;
let recordedChunks = [];
let recordedAudioBlob = null;
let recordedAudioUrl = null;

let recordingStartedAt = null;
let recordingTimerId = null;

let currentMeetingId = null;
let activeMeetingSummary = null;
let summaryGenerated = false;


function getElement(id) {
  return document.getElementById(id);
}


function setWorkflowStatus(
  message,
  type = "info"
) {
  const element =
    getElement("workflowStatus");

  if (!element) {
    return;
  }

  element.textContent = message;
  element.className =
    `workflow-status ${type}`;
}


function setRecordingStatus(
  message,
  type = ""
) {
  const element =
    getElement("recordingStatus");

  if (!element) {
    return;
  }

  element.textContent = message;

  element.className = type
    ? `recording-status ${type}`
    : "recording-status";
}


function formatDuration(seconds) {
  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;

  return [
    String(minutes).padStart(2, "0"),
    String(remainingSeconds).padStart(2, "0")
  ].join(":");
}


function updateRecordingTimer() {
  if (!recordingStartedAt) {
    return;
  }

  const elapsedSeconds =
    Math.floor(
      (
        Date.now() -
        recordingStartedAt
      ) / 1000
    );

  getElement(
    "recordingTimer"
  ).textContent =
    formatDuration(elapsedSeconds);

  if (
    elapsedSeconds >=
    MAX_RECORDING_SECONDS
  ) {
    stopRecording();

    setRecordingStatus(
      "The 10-minute recording limit was reached.",
      "success"
    );
  }
}


function startRecordingTimer() {
  stopRecordingTimer();

  recordingStartedAt =
    Date.now();

  updateRecordingTimer();

  recordingTimerId =
    window.setInterval(
      updateRecordingTimer,
      1000
    );
}


function stopRecordingTimer() {
  if (recordingTimerId) {
    window.clearInterval(
      recordingTimerId
    );
  }

  recordingTimerId = null;
  recordingStartedAt = null;
}


function stopMicrophoneStream() {
  if (!microphoneStream) {
    return;
  }

  microphoneStream
    .getTracks()
    .forEach(track => {
      track.stop();
    });

  microphoneStream = null;
}


function clearRecordedAudio() {
  if (recordedAudioUrl) {
    URL.revokeObjectURL(
      recordedAudioUrl
    );
  }

  recordedAudioUrl = null;
  recordedAudioBlob = null;
  recordedChunks = [];

  const preview =
    getElement("audioPreview");

  if (preview) {
    preview.pause();
    preview.removeAttribute("src");
    preview.hidden = true;
  }

  const transcribeButton =
    getElement(
      "transcribeRecordingButton"
    );

  if (transcribeButton) {
    transcribeButton.disabled = true;
  }
}


function chooseRecordingMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4"
  ];

  return (
    candidates.find(
      mimeType =>
        MediaRecorder.isTypeSupported(
          mimeType
        )
    ) ?? ""
  );
}


function getRecordingFileName(
  mimeType
) {
  if (
    String(mimeType)
      .includes("mp4")
  ) {
    return "meeting-recording.mp4";
  }

  return "meeting-recording.webm";
}


async function startRecording() {
  const consentGiven =
    getElement(
      "recordingConsent"
    ).checked;

  if (!consentGiven) {
    setRecordingStatus(
      "Confirm participant consent before recording.",
      "error"
    );

    return;
  }

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia ||
    typeof MediaRecorder === "undefined"
  ) {
    setRecordingStatus(
      "Audio recording is not supported by this browser.",
      "error"
    );

    return;
  }

  clearRecordedAudio();

  try {
    microphoneStream =
      await navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

    const mimeType =
      chooseRecordingMimeType();

    const options = {
      audioBitsPerSecond: 64000
    };

    if (mimeType) {
      options.mimeType = mimeType;
    }

    mediaRecorder =
      new MediaRecorder(
        microphoneStream,
        options
      );

    recordedChunks = [];

    mediaRecorder.addEventListener(
      "dataavailable",
      event => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          recordedChunks.push(
            event.data
          );
        }
      }
    );

    mediaRecorder.addEventListener(
      "stop",
      handleRecordingStopped
    );

    mediaRecorder.start(1000);

    getElement(
      "startRecordingButton"
    ).disabled = true;

    getElement(
      "stopRecordingButton"
    ).disabled = false;

    setRecordingStatus(
      "Recording in progress...",
      "recording"
    );

    startRecordingTimer();

  } catch (error) {
    console.error(error);

    stopMicrophoneStream();

    setRecordingStatus(
      "Microphone access was denied or unavailable.",
      "error"
    );
  }
}


function stopRecording() {
  if (
    !mediaRecorder ||
    mediaRecorder.state === "inactive"
  ) {
    return;
  }

  mediaRecorder.stop();

  stopRecordingTimer();

  getElement(
    "startRecordingButton"
  ).disabled = false;

  getElement(
    "stopRecordingButton"
  ).disabled = true;

  setRecordingStatus(
    "Preparing the recorded audio..."
  );
}


function handleRecordingStopped() {
  stopMicrophoneStream();

  const mimeType =
    mediaRecorder?.mimeType ||
    recordedChunks[0]?.type ||
    "audio/webm";

  recordedAudioBlob =
    new Blob(
      recordedChunks,
      {
        type: mimeType
      }
    );

  if (
    recordedAudioBlob.size === 0
  ) {
    clearRecordedAudio();

    setRecordingStatus(
      "The recording was empty. Please record again.",
      "error"
    );

    return;
  }

  recordedAudioUrl =
    URL.createObjectURL(
      recordedAudioBlob
    );

  const preview =
    getElement("audioPreview");

  preview.src =
    recordedAudioUrl;

  preview.hidden = false;

  getElement(
    "transcribeRecordingButton"
  ).disabled = false;

  const sizeMegabytes =
    (
      recordedAudioBlob.size /
      1024 /
      1024
    ).toFixed(2);

  setRecordingStatus(
    `Recording ready (${sizeMegabytes} MB).`,
    "success"
  );
}


async function transcribeRecording() {
  if (!recordedAudioBlob) {
    setRecordingStatus(
      "Record audio before requesting a transcription.",
      "error"
    );

    return;
  }

  const button =
    getElement(
      "transcribeRecordingButton"
    );

  button.disabled = true;
  button.textContent =
    "Transcribing...";

  setRecordingStatus(
    "Transcribing the temporary recording..."
  );

  try {
    const fileName =
      getRecordingFileName(
        recordedAudioBlob.type
      );

    const result =
      await apiTranscribeAudio(
        recordedAudioBlob,
        fileName
      );

    const notesInput =
      getElement("meetingNotes");

    const existingNotes =
      notesInput.value.trim();

    notesInput.value =
      existingNotes
        ? `${existingNotes}\n\n${result.text}`
        : result.text;

    clearRecordedAudio();

    setRecordingStatus(
      "Transcription completed. The audio was discarded.",
      "success"
    );

  } catch (error) {
    button.disabled = false;

    setRecordingStatus(
      error.message ??
      "Unable to transcribe the recording.",
      "error"
    );
  } finally {
    button.textContent =
      "Transcribe Recording";
  }
}


function setDefaultMeetingTime() {
  const input =
    getElement(
      "meetingScheduledAt"
    );

  const now = new Date();

  now.setMinutes(
    now.getMinutes() -
    now.getTimezoneOffset()
  );

  input.value =
    now
      .toISOString()
      .slice(0, 16);
}


async function loadMeetingClients() {
  const select =
    getElement("meetingClient");

  select.replaceChildren();

  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value = "";

  placeholder.textContent =
    "Select a client";

  select.appendChild(
    placeholder
  );

  const clients =
    await apiGetClients();

  clients
    .sort(
      (firstClient, secondClient) =>
        firstClient.full_name.localeCompare(
          secondClient.full_name
        )
    )
    .forEach(client => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        String(client.id);

      option.textContent =
        client.full_name;

      select.appendChild(option);
    });

  const parameters =
    new URLSearchParams(
      window.location.search
    );

  const selectedClientId =
    parameters.get("clientId");

  if (selectedClientId) {
    select.value =
      selectedClientId;
  }
}


function validateMeetingForm() {
  const clientId =
    Number(
      getElement(
        "meetingClient"
      ).value
    );

  const title =
    getElement(
      "meetingTitle"
    ).value.trim();

  const scheduledAt =
    getElement(
      "meetingScheduledAt"
    ).value;

  const rawNotes =
    getElement(
      "meetingNotes"
    ).value.trim();

  if (
    !Number.isInteger(clientId) ||
    clientId <= 0
  ) {
    throw new Error(
      "Select a client."
    );
  }

  if (!title) {
    throw new Error(
      "Enter a meeting title."
    );
  }

  if (!scheduledAt) {
    throw new Error(
      "Select the meeting date and time."
    );
  }

  if (!rawNotes) {
    throw new Error(
      "Enter or transcribe meeting notes."
    );
  }

  const parsedDate =
    new Date(scheduledAt);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw new Error(
      "The meeting date is invalid."
    );
  }

  return {
    client_id: clientId,
    title,
    scheduled_at:
      parsedDate.toISOString(),
    raw_notes: rawNotes
  };
}


function lockMeetingInputs(
  locked
) {
  [
    "meetingClient",
    "meetingScheduledAt",
    "meetingTitle",
    "meetingNotes"
  ].forEach(id => {
    const element =
      getElement(id);

    if (element) {
      element.disabled = locked;
    }
  });

  getElement(
    "startRecordingButton"
  ).disabled = locked;

  getElement(
    "recordingConsent"
  ).disabled = locked;
}


function setCreateMeetingButtonState(
  state
) {
  const button =
    getElement(
      "createMeetingButton"
    );

  if (state === "loading") {
    button.disabled = true;

    button.textContent =
      currentMeetingId
        ? "Retrying AI Summary..."
        : "Saving Meeting...";

    return;
  }

  if (state === "completed") {
    button.disabled = true;
    button.textContent =
      "Summary Generated";

    return;
  }

  if (state === "retry") {
    button.disabled = false;
    button.textContent =
      "Retry AI Summary";

    return;
  }

  button.disabled = false;

  button.textContent =
    "Create Meeting & Generate AI Summary";
}


function splitLines(value) {
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
    Number.isNaN(
      date.getTime()
    )
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
  fieldElement
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
    fieldElement
  );

  return wrapper;
}


function createReviewTextarea(
  id,
  value,
  rows
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
      getElement(id);

    if (element) {
      element.disabled = disabled;
    }
  });
}


function setReviewMessage(
  message,
  type = "info"
) {
  const element =
    getElement(
      "meetingReviewMessage"
    );

  if (!element) {
    return;
  }

  element.textContent = message;

  element.className =
    `meeting-review-message ${type}`;
}


function buildSummaryUpdatePayload() {
  const followUpValue =
    getElement(
      "reviewFollowUpAt"
    ).value;

  return {
    summary:
      getElement(
        "reviewSummary"
      ).value.trim(),

    client_needs:
      splitLines(
        getElement(
          "reviewClientNeeds"
        ).value
      ),

    action_items:
      splitLines(
        getElement(
          "reviewActionItems"
        ).value
      ),

    next_follow_up_at:
      followUpValue
        ? new Date(
            followUpValue
          ).toISOString()
        : null
  };
}


async function saveSummaryChanges() {
  if (!activeMeetingSummary) {
    throw new Error(
      "No meeting summary is available."
    );
  }

  const payload =
    buildSummaryUpdatePayload();

  if (!payload.summary) {
    throw new Error(
      "Meeting summary cannot be empty."
    );
  }

  activeMeetingSummary =
    await apiUpdateMeetingSummary(
      activeMeetingSummary.meeting_id,
      payload
    );

  return activeMeetingSummary;
}


function renderCreatedTasks(tasks) {
  const container =
    getElement(
      "confirmedTaskList"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const heading =
    document.createElement("h3");

  heading.textContent =
    "Created Follow-up Tasks";

  container.appendChild(heading);

  if (!tasks.length) {
    const message =
      document.createElement("p");

    message.textContent =
      "No action items were available to create tasks.";

    container.appendChild(message);

    return;
  }

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

  container.appendChild(list);
}


function lockConfirmedReview() {
  setReviewFieldsDisabled(true);

  const editButton =
    getElement(
      "editSummaryButton"
    );

  const saveButton =
    getElement(
      "saveSummaryButton"
    );

  const confirmButton =
    getElement(
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
  const saveButton =
    getElement(
      "saveSummaryButton"
    );

  saveButton.disabled = true;
  saveButton.textContent =
    "Saving...";

  setReviewMessage(
    "Saving advisor changes...",
    "info"
  );

  try {
    await saveSummaryChanges();

    setReviewFieldsDisabled(true);

    getElement(
      "editSummaryButton"
    ).hidden = false;

    saveButton.hidden = true;

    setReviewMessage(
      "Summary changes were saved.",
      "success"
    );

  } catch (error) {
    setReviewMessage(
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
  const confirmButton =
    getElement(
      "confirmSummaryButton"
    );

  confirmButton.disabled = true;
  confirmButton.textContent =
    "Confirming...";

  setReviewMessage(
    "Saving the final summary and creating follow-up tasks...",
    "info"
  );

  try {
    await saveSummaryChanges();

    const confirmation =
      await apiConfirmMeetingSummary(
        activeMeetingSummary.meeting_id
      );

    activeMeetingSummary =
      confirmation.meeting;

    renderCreatedTasks(
      confirmation.created_tasks ??
      []
    );

    lockConfirmedReview();

    setReviewMessage(
      confirmation.already_confirmed
        ? "This meeting summary was already confirmed."
        : "Summary confirmed. Follow-up tasks were created.",
      "success"
    );

    setWorkflowStatus(
      "Meeting summary confirmed and added to Client Memory.",
      "success"
    );

  } catch (error) {
    confirmButton.disabled = false;
    confirmButton.textContent =
      "Confirm Summary";

    setReviewMessage(
      error.message ??
      "Unable to confirm the summary.",
      "error"
    );
  }
}


function renderMeetingReview(result) {
  activeMeetingSummary = result;

  const output =
    getElement("summaryOutput");

  output.replaceChildren();

  const reviewMessage =
    document.createElement("div");

  reviewMessage.id =
    "meetingReviewMessage";

  reviewMessage.className =
    "meeting-review-message info";

  reviewMessage.textContent =
    result.advisor_confirmed
      ? "This summary has already been confirmed."
      : (
          "Review and edit the AI output. "
          + "Only confirmed action items become follow-up tasks."
        );

  output.appendChild(
    reviewMessage
  );

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
    document.createElement(
      "input"
    );

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

  const actionContainer =
    document.createElement("div");

  actionContainer.className =
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

  actionContainer.append(
    editButton,
    saveButton,
    confirmButton
  );

  output.appendChild(
    actionContainer
  );

  const taskContainer =
    document.createElement("div");

  taskContainer.id =
    "confirmedTaskList";

  taskContainer.className =
    "confirmed-task-list";

  output.appendChild(
    taskContainer
  );

  editButton.addEventListener(
    "click",
    () => {
      setReviewFieldsDisabled(false);

      editButton.hidden = true;
      saveButton.hidden = false;

      setReviewMessage(
        "Editing enabled. Save the changes before confirming.",
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
    lockConfirmedReview();
  }
}


async function createMeetingAndSummary() {
  if (summaryGenerated) {
    return;
  }

  let meetingPayload;

  try {
    meetingPayload =
      validateMeetingForm();
  } catch (error) {
    setWorkflowStatus(
      error.message,
      "error"
    );

    return;
  }

  setCreateMeetingButtonState(
    "loading"
  );

  try {
    if (!currentMeetingId) {
      setWorkflowStatus(
        "Saving raw meeting notes into PostgreSQL...",
        "info"
      );

      const createdMeeting =
        await apiCreateMeeting(
          meetingPayload
        );

      currentMeetingId =
        createdMeeting.id;

      lockMeetingInputs(true);
    }

    setWorkflowStatus(
      "Generating and saving the AI summary...",
      "info"
    );

    const summary =
      await apiGenerateMeetingSummary(
        currentMeetingId
      );

    summaryGenerated = true;

    renderMeetingReview(summary);

    setCreateMeetingButtonState(
      "completed"
    );

    setWorkflowStatus(
      "AI summary saved. Review, edit and confirm it.",
      "success"
    );

  } catch (error) {
    setCreateMeetingButtonState(
      currentMeetingId
        ? "retry"
        : "default"
    );

    setWorkflowStatus(
      error.message ??
      "Unable to complete the meeting workflow.",
      "error"
    );
  }
}


function resetMeetingWorkflow() {
  stopRecordingTimer();
  stopMicrophoneStream();

  if (
    mediaRecorder &&
    mediaRecorder.state !== "inactive"
  ) {
    mediaRecorder.stop();
  }

  clearRecordedAudio();

  mediaRecorder = null;
  currentMeetingId = null;
  activeMeetingSummary = null;
  summaryGenerated = false;

  lockMeetingInputs(false);

  getElement(
    "meetingTitle"
  ).value = "";

  getElement(
    "meetingNotes"
  ).value = "";

  getElement(
    "recordingConsent"
  ).checked = false;

  getElement(
    "recordingTimer"
  ).textContent = "00:00";

  getElement(
    "summaryOutput"
  ).textContent =
    "The generated summary will appear here for review.";

  getElement(
    "stopRecordingButton"
  ).disabled = true;

  getElement(
    "transcribeRecordingButton"
  ).disabled = true;

  setDefaultMeetingTime();

  setRecordingStatus(
    "No recording in progress."
  );

  setWorkflowStatus(
    "Select a client, enter notes or record audio, then create the meeting.",
    "info"
  );

  setCreateMeetingButtonState(
    "default"
  );
}


function verifyRequiredApiFunctions() {
  const requiredFunctions = [
    "apiGetClients",
    "apiCreateMeeting",
    "apiTranscribeAudio",
    "apiGenerateMeetingSummary",
    "apiUpdateMeetingSummary",
    "apiConfirmMeetingSummary"
  ];

  const missingFunctions =
    requiredFunctions.filter(
      functionName =>
        typeof window[
          functionName
        ] !== "function"
    );

  if (missingFunctions.length) {
    throw new Error(
      `Missing API functions: ${missingFunctions.join(", ")}`
    );
  }
}


async function initializeMeetingPage() {
  const user =
    await window.authReady;

  if (!user) {
    return;
  }

  try {
    verifyRequiredApiFunctions();
  } catch (error) {
    setWorkflowStatus(
      error.message,
      "error"
    );

    return;
  }

  setDefaultMeetingTime();

  try {
    await loadMeetingClients();
  } catch (error) {
    setWorkflowStatus(
      error.message ??
      "Unable to load clients.",
      "error"
    );
  }

  getElement(
    "startRecordingButton"
  ).addEventListener(
    "click",
    startRecording
  );

  getElement(
    "stopRecordingButton"
  ).addEventListener(
    "click",
    stopRecording
  );

  getElement(
    "transcribeRecordingButton"
  ).addEventListener(
    "click",
    transcribeRecording
  );

  getElement(
    "createMeetingButton"
  ).addEventListener(
    "click",
    createMeetingAndSummary
  );

  getElement(
    "resetMeetingButton"
  ).addEventListener(
    "click",
    resetMeetingWorkflow
  );
}


window.addEventListener(
  "beforeunload",
  () => {
    stopRecordingTimer();
    stopMicrophoneStream();

    if (recordedAudioUrl) {
      URL.revokeObjectURL(
        recordedAudioUrl
      );
    }
  }
);


document.addEventListener(
  "DOMContentLoaded",
  initializeMeetingPage
);