const LOCAL_HOSTS = new Set([
  "127.0.0.1",
  "localhost"
]);

const STANDALONE_FRONTEND_PORTS =
  new Set([
    "5500",
    "5501"
  ]);

const IS_STANDALONE_FRONTEND =
  LOCAL_HOSTS.has(
    window.location.hostname
  ) &&
  STANDALONE_FRONTEND_PORTS.has(
    window.location.port
  );

const API_URL =
  IS_STANDALONE_FRONTEND
    ? "http://127.0.0.1:5000"
    : window.location.origin;


class ApiError extends Error {
  constructor(
    message,
    status,
    payload = null
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}


async function apiRequest(
  endpoint,
  options = {}
) {
  const requestOptions = {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      ...(options.body !== undefined
        ? {
            "Content-Type":
              "application/json"
          }
        : {}),
      ...(options.headers ?? {})
    }
  };

  if (options.body !== undefined) {
    requestOptions.body =
      JSON.stringify(options.body);
  }

  let response;

  try {
    response = await fetch(
      `${API_URL}${endpoint}`,
      requestOptions
    );
  } catch (error) {
    throw new ApiError(
      "Unable to connect to the AdvisorFlow backend.",
      0
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) ?? "";

  let payload = null;

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    payload = await response.json();
  } else {
    const text =
      await response.text();

    payload = text
      ? { message: text }
      : null;
  }

  if (!response.ok) {
    const message =
      payload?.detail ??
      payload?.error?.message ??
      payload?.message ??
      "The request could not be completed.";

    throw new ApiError(
      message,
      response.status,
      payload
    );
  }

  return payload;
}


async function apiLogin(
  email,
  password
) {
  return apiRequest(
    "/auth/login",
    {
      method: "POST",
      body: {
        email,
        password
      }
    }
  );
}


async function apiLogout() {
  return apiRequest(
    "/auth/logout",
    {
      method: "POST"
    }
  );
}


async function apiGetCurrentUser() {
  return apiRequest(
    "/auth/me"
  );
}


async function apiGetDashboard() {
  return apiRequest(
    "/dashboard"
  );
}


async function apiGetClients(
  filters = {}
) {
  const parameters =
    new URLSearchParams();

  if (filters.search) {
    parameters.set(
      "search",
      filters.search
    );
  }

  if (filters.priority) {
    parameters.set(
      "priority",
      filters.priority
    );
  }

  const query =
    parameters.toString();

  return apiRequest(
    query
      ? `/clients?${query}`
      : "/clients"
  );
}


async function apiGetClient(
  clientId
) {
  return apiRequest(
    `/clients/${encodeURIComponent(
      clientId
    )}`
  );
}


async function apiCreateClient(
  clientData
) {
  return apiRequest(
    "/clients",
    {
      method: "POST",
      body: clientData
    }
  );
}


async function apiUpdateClient(
  clientId,
  clientData
) {
  return apiRequest(
    `/clients/${encodeURIComponent(
      clientId
    )}`,
    {
      method: "PATCH",
      body: clientData
    }
  );
}


async function apiCreateMeeting(
  meetingData
) {
  return apiRequest(
    "/meetings",
    {
      method: "POST",
      body: meetingData
    }
  );
}


async function apiGetMeetings(
  clientId = null
) {
  const endpoint = clientId
    ? `/meetings?client_id=${encodeURIComponent(
        clientId
      )}`
    : "/meetings";

  return apiRequest(endpoint);
}


async function apiCreateTask(
  taskData
) {
  return apiRequest(
    "/tasks",
    {
      method: "POST",
      body: taskData
    }
  );
}


async function apiCompleteTask(
  taskId
) {
  return apiRequest(
    `/tasks/${encodeURIComponent(
      taskId
    )}/complete`,
    {
      method: "PATCH"
    }
  );
}


async function apiGenerateBrief(
  client
) {
  return apiRequest(
    "/generate-brief",
    {
      method: "POST",
      body: {
        client
      }
    }
  );
}


async function apiGenerateSummary(
  notes,
  clientId = null
) {
  return apiRequest(
    "/generate-summary",
    {
      method: "POST",
      body: {
        notes,
        client_id: clientId
      }
    }
  );
}


async function apiGeneratePartnerRecommendation(
  client,
  notes = ""
) {
  return apiRequest(
    "/partner-recommendation",
    {
      method: "POST",
      body: {
        client,
        notes
      }
    }
  );
}


async function apiAssistantChat(
  message
) {
  return apiRequest(
    "/assistant/chat",
    {
      method: "POST",
      body: {
        message
      }
    }
  );
}


async function apiTranscribeAudio(
  audioBlob,
  fileName
) {
  let response;

  try {
    response = await fetch(
      `${API_URL}/audio/transcribe`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type":
            audioBlob.type ||
            "audio/webm",

          "X-Audio-Filename":
            fileName
        },
        body: audioBlob
      }
    );
  } catch (error) {
    throw new ApiError(
      "Unable to connect to the audio transcription service.",
      0
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) ?? "";

  let payload = null;

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    payload = await response.json();
  } else {
    const text =
      await response.text();

    payload = {
      message: text
    };
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.detail ??
      payload?.message ??
      "Unable to transcribe the recording.",
      response.status,
      payload
    );
  }

  return payload;
}


async function apiGenerateMeetingSummary(
  meetingId
) {
  return apiRequest(
    `/meetings/${encodeURIComponent(
      meetingId
    )}/generate-summary`,
    {
      method: "POST"
    }
  );
}

async function apiGenerateClientAiBrief(
  clientId
) {
  return apiRequest(
    `/clients/${encodeURIComponent(
      clientId
    )}/ai-brief`,
    {
      method: "POST"
    }
  );
}


async function apiUpdateMeetingSummary(
  meetingId,
  summaryData
) {
  return apiRequest(
    `/meetings/${encodeURIComponent(
      meetingId
    )}/summary`,
    {
      method: "PATCH",
      body: summaryData
    }
  );
}


async function apiConfirmMeetingSummary(
  meetingId
) {
  return apiRequest(
    `/meetings/${encodeURIComponent(
      meetingId
    )}/confirm-summary`,
    {
      method: "POST"
    }
  );
}

async function apiDeleteClient(
  clientId
) {
  return apiRequest(
    `/clients/${encodeURIComponent(
      clientId
    )}`,
    {
      method: "DELETE"
    }
  );
}

async function apiGetPartners(filters = {}) {
  const parameters = new URLSearchParams();

  if (filters.search) parameters.set("search", filters.search);
  if (filters.specialty) parameters.set("specialty", filters.specialty);
  if (filters.status) parameters.set("status", filters.status);

  const query = parameters.toString();

  return apiRequest(query ? `/partners?${query}` : "/partners");
}

async function apiGetPartner(partnerId) {
  return apiRequest(`/partners/${encodeURIComponent(partnerId)}`);
}

async function apiCreatePartner(partnerData) {
  return apiRequest("/partners", {
    method: "POST",
    body: partnerData,
  });
}

async function apiUpdatePartner(partnerId, partnerData) {
  return apiRequest(`/partners/${encodeURIComponent(partnerId)}`, {
    method: "PATCH",
    body: partnerData,
  });
}

async function apiDeletePartner(partnerId) {
  return apiRequest(`/partners/${encodeURIComponent(partnerId)}`, {
    method: "DELETE",
  });
}