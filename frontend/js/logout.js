const LOGOUT_RETURN_PAGE_KEY =
  "advisorflowLogoutReturnPage";

const LOGOUT_ALLOWED_PAGES =
  new Set([
    "dashboard.html",
    "client.html",
    "client_details.html",
    "meeting.html",
    "partner.html"
  ]);


function logoutElement(id) {
  return document.getElementById(id);
}


function logoutGetInitials(name) {
  return String(name ?? "Advisor")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase()
    || "AD";
}


function clearAdvisorDisplayData() {
  localStorage.removeItem(
    "userName"
  );

  localStorage.removeItem(
    "userEmail"
  );

  localStorage.removeItem(
    "userRole"
  );
}


function saveAdvisorDisplayData(user) {
  localStorage.setItem(
    "userName",
    user.display_name
  );

  localStorage.setItem(
    "userEmail",
    user.email
  );

  localStorage.setItem(
    "userRole",
    user.role
  );
}


function showLogoutMessage(message) {
  const element =
    logoutElement(
      "logoutMessage"
    );

  if (!element) {
    return;
  }

  element.textContent =
    message ?? "";

  element.hidden =
    !message;
}


function getSafePageFromUrl(
  urlValue
) {
  if (!urlValue) {
    return null;
  }

  try {
    const url =
      new URL(
        urlValue,
        window.location.origin
      );

    if (
      url.origin !==
      window.location.origin
    ) {
      return null;
    }

    const segments =
      url.pathname
        .split("/")
        .filter(Boolean);

    const pageName =
      segments.at(-1);

    if (
      !pageName ||
      !LOGOUT_ALLOWED_PAGES.has(
        pageName
      )
    ) {
      return null;
    }

    return (
      pageName
      + url.search
      + url.hash
    );

  } catch (error) {
    return null;
  }
}


function determineLogoutReturnPage() {
  const savedPage =
    sessionStorage.getItem(
      LOGOUT_RETURN_PAGE_KEY
    );

  const safeSavedPage =
    getSafePageFromUrl(
      savedPage
    );

  if (safeSavedPage) {
    return safeSavedPage;
  }

  const referrerPage =
    getSafePageFromUrl(
      document.referrer
    );

  if (referrerPage) {
    sessionStorage.setItem(
      LOGOUT_RETURN_PAGE_KEY,
      referrerPage
    );

    return referrerPage;
  }

  return "dashboard.html";
}


function populateLogoutUser(user) {
  logoutElement(
    "logoutUserName"
  ).textContent =
    user.display_name;

  logoutElement(
    "logoutUserEmail"
  ).textContent =
    user.email;

  logoutElement(
    "logoutUserRole"
  ).textContent =
    user.role;

  logoutElement(
    "logoutUserAvatar"
  ).textContent =
    logoutGetInitials(
      user.display_name
    );
}


function populateCachedLogoutUser() {
  const cachedUser = {
    display_name:
      localStorage.getItem(
        "userName"
      )
      || "Advisor",

    email:
      localStorage.getItem(
        "userEmail"
      )
      || "Account unavailable",

    role:
      localStorage.getItem(
        "userRole"
      )
      || "ADVISOR"
  };

  populateLogoutUser(
    cachedUser
  );
}


function setLogoutLoading(
  isLoading
) {
  const confirmButton =
    logoutElement(
      "confirmLogoutButton"
    );

  const cancelButton =
    logoutElement(
      "cancelLogoutButton"
    );

  const buttonText =
    logoutElement(
      "logoutButtonText"
    );

  const spinner =
    logoutElement(
      "logoutButtonSpinner"
    );

  confirmButton.disabled =
    isLoading;

  cancelButton.disabled =
    isLoading;

  buttonText.textContent =
    isLoading
      ? "Signing Out..."
      : "Sign Out";

  spinner.hidden =
    !isLoading;
}


async function loadLogoutUser() {
  populateCachedLogoutUser();

  try {
    const result =
      await apiGetCurrentUser();

    if (!result?.user) {
      throw new Error(
        "Advisor account unavailable."
      );
    }

    saveAdvisorDisplayData(
      result.user
    );

    populateLogoutUser(
      result.user
    );

    return true;

  } catch (error) {
    if (error.status === 401) {
      clearAdvisorDisplayData();

      window.location.replace(
        "index.html?reason=already_logged_out"
      );

      return false;
    }

    showLogoutMessage(
      (
        "Unable to verify the current session. "
        + "You can retry signing out when the Backend is available."
      )
    );

    return false;
  }
}


async function confirmLogout() {
  showLogoutMessage("");
  setLogoutLoading(true);

  try {
    await apiLogout();

    clearAdvisorDisplayData();

    sessionStorage.removeItem(
      LOGOUT_RETURN_PAGE_KEY
    );

    window.location.replace(
      "index.html?reason=logged_out"
    );

  } catch (error) {
    let message =
      error.message
      ?? "Unable to sign out.";

    if (error.status === 0) {
      message =
        (
          "Unable to contact the AdvisorFlow Backend. "
          + "Your session may still be active. "
          + "Start the Backend and try again."
        );
    }

    showLogoutMessage(
      message
    );

    setLogoutLoading(false);
  }
}


function cancelLogout() {
  window.location.replace(
    determineLogoutReturnPage()
  );
}


function initializeLogoutEvents() {
  logoutElement(
    "confirmLogoutButton"
  )?.addEventListener(
    "click",
    confirmLogout
  );

  logoutElement(
    "cancelLogoutButton"
  )?.addEventListener(
    "click",
    cancelLogout
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape"
        && !logoutElement(
          "confirmLogoutButton"
        ).disabled
      ) {
        cancelLogout();
      }
    }
  );
}


document.addEventListener(
  "DOMContentLoaded",
  async () => {
    determineLogoutReturnPage();
    initializeLogoutEvents();

    await loadLogoutUser();
  }
);