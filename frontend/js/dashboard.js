let dashboardSelectedDate =
  getLocalDateValue(new Date());

let dashboardOverview = null;
let dashboardClients = [];
let dashboardEventMap =
  new Map();

let selectedDashboardEvent = null;
let dashboardChatHistory = [];


function getDashboardElement(id) {
  return document.getElementById(id);
}


function getLocalDateValue(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getLocalDateTimeValue(date) {
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


function parseSelectedDate() {
  return new Date(
    `${dashboardSelectedDate}T12:00:00`
  );
}


function changeSelectedDate(days) {
  const date =
    parseSelectedDate();

  date.setDate(
    date.getDate() + days
  );

  dashboardSelectedDate =
    getLocalDateValue(date);

  loadDashboard();
}


function formatCalendarDate(dateValue) {
  const date =
    new Date(
      `${dateValue}T12:00:00`
    );

  return new Intl.DateTimeFormat(
    "en-MY",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(date);
}


function formatEventTime(dateValue) {
  if (!dateValue) {
    return "No due time";
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Invalid time";
  }

  return new Intl.DateTimeFormat(
    "en-MY",
    {
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(date);
}


function formatDateTime(dateValue) {
  if (!dateValue) {
    return "No due date";
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-MY",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(date);
}


function setDashboardStatus(
  message,
  type = "info"
) {
  const element =
    getDashboardElement(
      "dashboardStatus"
    );

  if (!element) {
    return;
  }

  element.textContent =
    message ?? "";

  element.className =
    `dashboard-status ${type}`;

  element.hidden = !message;

  if (
    message &&
    type === "success"
  ) {
    window.setTimeout(
      () => {
        element.hidden = true;
      },
      4000
    );
  }
}


async function apiGetDashboardOverview(
  selectedDate
) {
  return apiRequest(
    `/dashboard/overview?date=${encodeURIComponent(
      selectedDate
    )}`
  );
}


async function apiDashboardAssistant(
  message,
  history,
  selectedDate,
  focusedEventId = null
) {
  return apiRequest(
    "/dashboard/assistant",
    {
      method: "POST",
      body: {
        message,
        history,
        selected_date:
          selectedDate,
        focused_event_id:
          focusedEventId
      }
    }
  );
}


function getGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 18) {
    return "Good Afternoon";
  }

  return "Good Evening";
}


function renderDashboardHeader(
  user,
  overview
) {
  getDashboardElement(
    "welcomeMessage"
  ).textContent =
    `${getGreeting()}, ${user.display_name} 👋`;

  getDashboardElement(
    "profileName"
  ).textContent =
    user.display_name;

  getDashboardElement(
    "dashboardSummary"
  ).textContent =
    (
      `${overview.stats.meetings} meeting(s) · `
      + `${overview.stats.pendingFollowUps} pending follow-up(s) · `
      + `${overview.stats.overdueFollowUps} overdue`
    );

  getDashboardElement(
    "calendarDateLabel"
  ).textContent =
    formatCalendarDate(
      overview.selectedDate
    );

  getDashboardElement(
    "dashboardDateInput"
  ).value =
    overview.selectedDate;
}


function renderDashboardStats(
  overview
) {
  getDashboardElement(
    "meetingCount"
  ).textContent =
    overview.stats.meetings;

  getDashboardElement(
    "pendingCount"
  ).textContent =
    overview.stats
      .pendingFollowUps;

  getDashboardElement(
    "overdueCount"
  ).textContent =
    overview.stats
      .overdueFollowUps;

  getDashboardElement(
    "highPriorityCount"
  ).textContent =
    overview.stats
      .highPriorityClients;
}


function createCalendarEvent(
  event
) {
  const button =
    document.createElement(
      "button"
    );

  button.type = "button";

  button.className =
    `dashboard-event ${
      event.kind === "MEETING"
        ? "meeting"
        : "task"
    }${
      event.isOverdue
        ? " overdue"
        : ""
    }`;

  const time =
    document.createElement(
      "span"
    );

  time.className =
    "dashboard-event-time";

  time.textContent =
    formatEventTime(
      event.startAt
    );

  const main =
    document.createElement(
      "span"
    );

  main.className =
    "dashboard-event-main";

  const title =
    document.createElement(
      "strong"
    );

  title.textContent =
    event.title;

  const client =
    document.createElement(
      "span"
    );

  client.textContent =
    event.clientName;

  main.append(
    title,
    client
  );

  const badge =
    document.createElement(
      "span"
    );

  badge.className =
    "dashboard-event-badge";

  badge.textContent =
    event.kind === "MEETING"
      ? "Meeting"
      : (
          event.isOverdue
            ? "Overdue"
            : "Follow-up"
        );

  button.append(
    time,
    main,
    badge
  );

  button.addEventListener(
    "click",
    () => {
      openDashboardEventPanel(
        event
      );
    }
  );

  return button;
}


function renderCalendarEvents(
  overview
) {
  const container =
    getDashboardElement(
      "calendarEventList"
    );

  container.replaceChildren();

  dashboardEventMap =
    new Map();

  overview.calendarEvents.forEach(
    event => {
      dashboardEventMap.set(
        event.id,
        event
      );
    }
  );

  if (
    !overview.calendarEvents.length
  ) {
    const message =
      document.createElement("p");

    message.className =
      "dashboard-empty";

    message.textContent =
      (
        "No meetings or follow-up tasks "
        + "were found for this date."
      );

    container.appendChild(
      message
    );

    return;
  }

  overview.calendarEvents
    .forEach(event => {
      container.appendChild(
        createCalendarEvent(
          event
        )
      );
    });
}


function renderDailyBrief(
  overview
) {
  const list =
    getDashboardElement(
      "dailyBriefList"
    );

  list.replaceChildren();

  overview.dailyBrief.forEach(
    message => {
      const item =
        document.createElement(
          "li"
        );

      item.textContent =
        message;

      list.appendChild(item);
    }
  );
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


function createPriorityTask(
  task
) {
  const article =
    document.createElement(
      "article"
    );

  article.className =
    "dashboard-task-item";

  const main =
    document.createElement(
      "div"
    );

  main.className =
    "dashboard-task-main";

  const title =
    document.createElement("h3");

  title.textContent =
    task.clientName;

  const description =
    document.createElement("p");

  description.textContent =
    task.title;

  const due =
    document.createElement("p");

  due.textContent =
    `Due: ${formatDateTime(
      task.dueAt
    )}`;

  main.append(
    title,
    description,
    due
  );

  const badge =
    document.createElement(
      "span"
    );

  badge.className =
    task.isOverdue
      ? (
          "dashboard-task-badge "
          + "overdue"
        )
      : "dashboard-task-badge";

  badge.textContent =
    task.isOverdue
      ? "Overdue"
      : task.priority;

  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "dashboard-task-actions";

  const openButton =
    document.createElement(
      "button"
    );

  openButton.type = "button";
  openButton.textContent =
    "Open Client";

  openButton.addEventListener(
    "click",
    () => {
      window.location.href =
        (
          "client_details.html?id="
          + encodeURIComponent(
              task.clientId
            )
        );
    }
  );

  const completeButton =
    document.createElement(
      "button"
    );

  completeButton.type =
    "button";

  completeButton.className =
    "dashboard-task-complete";

  completeButton.textContent =
    "Complete";

  completeButton.addEventListener(
    "click",
    async () => {
      await completeDashboardTask(
        task.id,
        completeButton
      );
    }
  );

  actions.append(
    openButton,
    completeButton
  );

  article.append(
    main,
    badge,
    actions
  );

  return article;
}


function renderPriorityTasks(
  overview
) {
  const container =
    getDashboardElement(
      "priorityTaskList"
    );

  container.replaceChildren();

  if (!overview.priorityTasks.length) {
    const message =
      document.createElement("p");

    message.className =
      "dashboard-empty";

    message.textContent =
      "No pending follow-up tasks.";

    container.appendChild(
      message
    );

    return;
  }

  overview.priorityTasks.forEach(
    task => {
      container.appendChild(
        createPriorityTask(task)
      );
    }
  );
}


async function completeDashboardTask(
  taskId,
  button = null
) {
  if (button) {
    button.disabled = true;
    button.textContent =
      "Completing...";
  }

  try {
    await apiCompleteTask(taskId);

    setDashboardStatus(
      "Follow-up task completed.",
      "success"
    );

    closeDashboardEventPanel();

    await loadDashboard();

  } catch (error) {
    if (button) {
      button.disabled = false;
      button.textContent =
        "Complete";
    }

    setDashboardStatus(
      error.message ??
      "Unable to complete the task.",
      "error"
    );
  }
}


function setPanelClientContext(
  event
) {
  const list =
    getDashboardElement(
      "panelClientContext"
    );

  const section =
    getDashboardElement(
      "panelClientContextSection"
    );

  list.replaceChildren();

  const values = [];

  if (event.clientGoal) {
    values.push(
      `Goal: ${event.clientGoal}`
    );
  }

  if (event.riskProfile) {
    values.push(
      (
        "Risk profile: "
        + event.riskProfile
      )
    );
  }

  if (
    event.kind === "MEETING"
  ) {
    values.push(
      event.advisorConfirmed
        ? "Summary confirmed"
        : "Summary not confirmed"
    );
  }

  section.hidden =
    !values.length;

  values.forEach(value => {
    const item =
      document.createElement("li");

    item.textContent =
      value;

    list.appendChild(item);
  });
}


function openDashboardEventPanel(
  event
) {
  selectedDashboardEvent =
    event;

  getDashboardElement(
    "panelKind"
  ).textContent =
    event.kind === "MEETING"
      ? "Client Meeting"
      : "Follow-up Task";

  getDashboardElement(
    "panelTitle"
  ).textContent =
    event.title;

  getDashboardElement(
    "panelClient"
  ).textContent =
    event.clientName;

  getDashboardElement(
    "panelTime"
  ).textContent =
    formatDateTime(
      event.startAt
    );

  getDashboardElement(
    "panelPriority"
  ).textContent =
    event.priority ?? "Normal";

  getDashboardElement(
    "panelDescription"
  ).textContent =
    event.description
    ?? "No details available.";

  setPanelClientContext(
    event
  );

  getDashboardElement(
    "panelCompleteTaskButton"
  ).hidden =
    event.kind !== "TASK";

  getDashboardElement(
    "eventPanel"
  ).classList.add("open");

  getDashboardElement(
    "eventPanelOverlay"
  ).classList.add("open");
}


function closeDashboardEventPanel() {
  getDashboardElement(
    "eventPanel"
  ).classList.remove("open");

  getDashboardElement(
    "eventPanelOverlay"
  ).classList.remove("open");
}


function renderAssistantMessage(
  container,
  message
) {
  container.replaceChildren();

  const lines =
    String(message ?? "")
      .split(/\r?\n/);

  let currentList = null;

  function closeCurrentList() {
    currentList = null;
  }

  lines.forEach(rawLine => {
    const line = rawLine.trim();

    if (!line) {
      closeCurrentList();
      return;
    }

    const listMatch =
      line.match(
        /^(?:[-•]|\d+[.)])\s+(.+)$/
      );

    if (listMatch) {
      if (!currentList) {
        currentList =
          document.createElement("ul");

        container.appendChild(
          currentList
        );
      }

      const item =
        document.createElement("li");

      item.textContent =
        listMatch[1];

      currentList.appendChild(item);

      return;
    }

    closeCurrentList();

    const paragraph =
      document.createElement("p");

    paragraph.textContent = line;

    container.appendChild(
      paragraph
    );
  });

  if (!container.children.length) {
    const paragraph =
      document.createElement("p");

    paragraph.textContent =
      "No response was returned.";

    container.appendChild(
      paragraph
    );
  }
}


function addChatMessage(
  message,
  role
) {
  const container =
    getDashboardElement(
      "chatMessages"
    );

  const element =
    document.createElement("div");

  element.className =
    role === "user"
      ? "dashboard-user-message"
      : "dashboard-ai-message";

  if (role === "assistant") {
    renderAssistantMessage(
      element,
      message
    );
  } else {
    element.textContent = message;
  }

  container.appendChild(element);

  container.scrollTop =
    container.scrollHeight;

  return element;
}


async function askDashboardAssistant(
  question
) {
  const cleanQuestion =
    String(question ?? "")
      .trim();

  if (!cleanQuestion) {
    return;
  }

  const previousHistory =
    dashboardChatHistory.slice(-8);

  addChatMessage(
    cleanQuestion,
    "user"
  );

  dashboardChatHistory.push({
    role: "user",
    content: cleanQuestion
  });

  const loadingMessage =
    addChatMessage(
      "Thinking...",
      "assistant"
    );

  loadingMessage.classList.add(
    "dashboard-chat-loading"
  );

  const input =
    getDashboardElement(
      "chatInput"
    );

  const sendButton =
    getDashboardElement(
      "sendChatButton"
    );

  input.disabled = true;
  sendButton.disabled = true;

  try {
    const result =
      await apiDashboardAssistant(
        cleanQuestion,
        previousHistory,
        dashboardSelectedDate,
        selectedDashboardEvent?.id ??
          null
      );

    loadingMessage.classList.remove(
      "dashboard-chat-loading"
    );

    renderAssistantMessage(
      loadingMessage,
      result.reply
    );

    dashboardChatHistory.push({
      role: "assistant",
      content: result.reply
    });

    loadingMessage.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });

  } catch (error) {
    loadingMessage.classList.remove(
      "dashboard-chat-loading"
    );

    renderAssistantMessage(
      loadingMessage,
      error.message ??
        "Unable to contact the AI assistant."
    );

  } finally {
    input.disabled = false;
    sendButton.disabled = false;

    input.focus();
  }
}


async function loadDashboardClients() {
  dashboardClients =
    await apiGetClients();

  const select =
    getDashboardElement(
      "newMeetingClient"
    );

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

  dashboardClients
    .sort(
      (first, second) =>
        first.full_name.localeCompare(
          second.full_name
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

      select.appendChild(
        option
      );
    });
}


function setDefaultMeetingDate() {
  const selectedDate =
    parseSelectedDate();

  const now =
    new Date();

  selectedDate.setHours(
    now.getHours() + 1,
    0,
    0,
    0
  );

  getDashboardElement(
    "newMeetingScheduledAt"
  ).value =
    getLocalDateTimeValue(
      selectedDate
    );
}


function showAddMeetingMessage(
  message
) {
  const element =
    getDashboardElement(
      "addMeetingMessage"
    );

  element.textContent =
    message ?? "";

  element.hidden = !message;
}


function openAddMeetingDialog() {
  const form =
    getDashboardElement(
      "addMeetingForm"
    );

  form.reset();

  showAddMeetingMessage("");

  setDefaultMeetingDate();

  if (
    selectedDashboardEvent?.clientId
  ) {
    getDashboardElement(
      "newMeetingClient"
    ).value =
      String(
        selectedDashboardEvent
          .clientId
      );
  }

  getDashboardElement(
    "addMeetingDialog"
  ).showModal();

  window.setTimeout(
    () => {
      getDashboardElement(
        "newMeetingTitle"
      ).focus();
    },
    50
  );
}


function closeAddMeetingDialog() {
  const dialog =
    getDashboardElement(
      "addMeetingDialog"
    );

  if (dialog.open) {
    dialog.close();
  }
}


async function saveNewMeeting(
  event
) {
  event.preventDefault();

  const clientId =
    Number(
      getDashboardElement(
        "newMeetingClient"
      ).value
    );

  const title =
    getDashboardElement(
      "newMeetingTitle"
    ).value.trim();

  const scheduledValue =
    getDashboardElement(
      "newMeetingScheduledAt"
    ).value;

  const notes =
    getDashboardElement(
      "newMeetingNotes"
    ).value.trim();

  if (
    !Number.isInteger(clientId)
    || clientId <= 0
  ) {
    showAddMeetingMessage(
      "Select a client."
    );

    return;
  }

  if (!title) {
    showAddMeetingMessage(
      "Enter a meeting title."
    );

    return;
  }

  if (!scheduledValue) {
    showAddMeetingMessage(
      "Select a meeting date and time."
    );

    return;
  }

  const scheduledAt =
    new Date(scheduledValue);

  if (
    Number.isNaN(
      scheduledAt.getTime()
    )
  ) {
    showAddMeetingMessage(
      "The meeting date is invalid."
    );

    return;
  }

  const saveButton =
    getDashboardElement(
      "saveMeetingButton"
    );

  saveButton.disabled = true;
  saveButton.textContent =
    "Saving...";

  try {
    const meeting =
      await apiCreateMeeting({
        client_id: clientId,
        title,
        scheduled_at:
          scheduledAt.toISOString(),
        raw_notes:
          notes || null
      });

    dashboardSelectedDate =
      getLocalDateValue(
        new Date(
          meeting.scheduled_at
        )
      );

    closeAddMeetingDialog();

    setDashboardStatus(
      "Meeting added successfully.",
      "success"
    );

    await loadDashboard();

  } catch (error) {
    showAddMeetingMessage(
      error.message ??
      "Unable to create the meeting."
    );

  } finally {
    saveButton.disabled = false;
    saveButton.textContent =
      "Save Meeting";
  }
}


async function loadDashboard() {
  setDashboardStatus(
    "Loading dashboard...",
    "info"
  );

  try {
    const [
      user,
      overview
    ] = await Promise.all([
      window.authReady,
      apiGetDashboardOverview(
        dashboardSelectedDate
      )
    ]);

    if (!user) {
      return;
    }

    dashboardOverview =
      overview;

    dashboardSelectedDate =
      overview.selectedDate;

    renderDashboardHeader(
      user,
      overview
    );

    renderDashboardStats(
      overview
    );

    renderCalendarEvents(
      overview
    );

    renderDailyBrief(
      overview
    );

    renderPriorityTasks(
      overview
    );

    setDashboardStatus("");

  } catch (error) {
    setDashboardStatus(
      error.message ??
      "Unable to load the dashboard.",
      "error"
    );
  }
}


function initializeDashboardEvents() {
  getDashboardElement(
    "previousDateButton"
  ).addEventListener(
    "click",
    () => {
      changeSelectedDate(-1);
    }
  );

  getDashboardElement(
    "nextDateButton"
  ).addEventListener(
    "click",
    () => {
      changeSelectedDate(1);
    }
  );

  getDashboardElement(
    "todayDateButton"
  ).addEventListener(
    "click",
    () => {
      dashboardSelectedDate =
        getLocalDateValue(
          new Date()
        );

      loadDashboard();
    }
  );

  getDashboardElement(
    "dashboardDateInput"
  ).addEventListener(
    "change",
    event => {
      if (event.target.value) {
        dashboardSelectedDate =
          event.target.value;

        loadDashboard();
      }
    }
  );

  getDashboardElement(
    "openAddMeetingButton"
  ).addEventListener(
    "click",
    openAddMeetingDialog
  );

  getDashboardElement(
    "closeAddMeetingButton"
  ).addEventListener(
    "click",
    closeAddMeetingDialog
  );

  getDashboardElement(
    "cancelAddMeetingButton"
  ).addEventListener(
    "click",
    closeAddMeetingDialog
  );

  getDashboardElement(
    "addMeetingForm"
  ).addEventListener(
    "submit",
    saveNewMeeting
  );

  getDashboardElement(
    "addMeetingDialog"
  ).addEventListener(
    "click",
    event => {
      if (
        event.target ===
        event.currentTarget
      ) {
        closeAddMeetingDialog();
      }
    }
  );

  getDashboardElement(
    "closeEventPanelButton"
  ).addEventListener(
    "click",
    closeDashboardEventPanel
  );

  getDashboardElement(
    "eventPanelOverlay"
  ).addEventListener(
    "click",
    closeDashboardEventPanel
  );

  getDashboardElement(
    "panelOpenClientButton"
  ).addEventListener(
    "click",
    () => {
      if (
        selectedDashboardEvent
          ?.clientId
      ) {
        window.location.href =
          (
            "client_details.html?id="
            + encodeURIComponent(
                selectedDashboardEvent
                  .clientId
              )
          );
      }
    }
  );

  getDashboardElement(
    "panelAskAiButton"
  ).addEventListener(
    "click",
    () => {
      if (!selectedDashboardEvent) {
        return;
      }

      closeDashboardEventPanel();

      askDashboardAssistant(
        (
          "Prepare me for this item: "
          + selectedDashboardEvent
              .title
          + " for "
          + selectedDashboardEvent
              .clientName
          + "."
        )
      );
    }
  );

  getDashboardElement(
    "panelCompleteTaskButton"
  ).addEventListener(
    "click",
    async event => {
      if (
        selectedDashboardEvent
          ?.kind !== "TASK"
      ) {
        return;
      }

      await completeDashboardTask(
        selectedDashboardEvent
          .entityId,
        event.currentTarget
      );
    }
  );

  getDashboardElement(
    "dashboardChatForm"
  ).addEventListener(
    "submit",
    event => {
      event.preventDefault();

      const input =
        getDashboardElement(
          "chatInput"
        );

      const question =
        input.value.trim();

      if (!question) {
        return;
      }

      input.value = "";

      askDashboardAssistant(
        question
      );
    }
  );

  getDashboardElement(
    "generatePrepButton"
  ).addEventListener(
    "click",
    () => {
      askDashboardAssistant(
        (
          "Create a practical preparation "
          + "brief for my selected date. "
          + "Rank the most important meetings "
          + "and follow-up tasks."
        )
      );
    }
  );

  document
    .querySelectorAll(
      "[data-dashboard-prompt]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          askDashboardAssistant(
            button.dataset
              .dashboardPrompt
          );
        }
      );
    });
}


document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initializeDashboardEvents();

    try {
      await loadDashboardClients();
    } catch (error) {
      setDashboardStatus(
        error.message ??
        "Unable to load clients.",
        "error"
      );
    }

    await loadDashboard();
  }
);