const AUTH_SESSION_CHECK_INTERVAL =
  5 * 60 * 1000;

let authSessionCheckInProgress =
  false;


function authClearCachedUser() {
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


function authSaveCachedUser(user) {
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


function authGetCurrentPage() {
  const pageName =
    window.location.pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
    || "dashboard.html";

  return (
    pageName
    + window.location.search
    + window.location.hash
  );
}


function authRedirectToLogin(
  reason = "login_required"
) {
  authClearCachedUser();

  const parameters =
    new URLSearchParams({
      reason,
      next: authGetCurrentPage()
    });

  window.location.replace(
    `index.html?${parameters.toString()}`
  );
}


function authApplyUserToPage(user) {
  window.currentAdvisor =
    user;

  authSaveCachedUser(
    user
  );

  const profileName =
    document.getElementById(
      "profileName"
    );

  if (profileName) {
    profileName.textContent =
      user.display_name;
  }

  const profileRole =
    document.getElementById(
      "profileRole"
    );

  if (profileRole) {
    profileRole.textContent =
      user.role;
  }

  document
    .querySelectorAll(
      "[data-advisor-name]"
    )
    .forEach(element => {
      element.textContent =
        user.display_name;
    });

  document
    .querySelectorAll(
      "[data-advisor-email]"
    )
    .forEach(element => {
      element.textContent =
        user.email;
    });

  document
    .querySelectorAll(
      "[data-advisor-role]"
    )
    .forEach(element => {
      element.textContent =
        user.role;
    });
}


function authShowConnectionError(
  message
) {
  const existingOverlay =
    document.getElementById(
      "authenticationConnectionError"
    );

  if (existingOverlay) {
    return;
  }

  const overlay =
    document.createElement("div");

  overlay.id =
    "authenticationConnectionError";

  overlay.style.position =
    "fixed";

  overlay.style.inset =
    "0";

  overlay.style.zIndex =
    "99999";

  overlay.style.display =
    "flex";

  overlay.style.alignItems =
    "center";

  overlay.style.justifyContent =
    "center";

  overlay.style.padding =
    "24px";

  overlay.style.background =
    "rgba(6, 26, 46, 0.76)";

  overlay.style.backdropFilter =
    "blur(5px)";

  const card =
    document.createElement("section");

  card.style.width =
    "min(440px, 100%)";

  card.style.padding =
    "30px";

  card.style.background =
    "white";

  card.style.borderRadius =
    "20px";

  card.style.boxShadow =
    (
      "0 28px 80px "
      + "rgba(0, 0, 0, 0.28)"
    );

  card.style.textAlign =
    "center";

  const badge =
    document.createElement("div");

  badge.textContent =
    "Connection Error";

  badge.style.width =
    "fit-content";

  badge.style.margin =
    "0 auto 15px";

  badge.style.padding =
    "7px 10px";

  badge.style.color =
    "#991b1b";

  badge.style.background =
    "#fee2e2";

  badge.style.borderRadius =
    "999px";

  badge.style.fontSize =
    "12px";

  badge.style.fontWeight =
    "800";

  const title =
    document.createElement("h2");

  title.textContent =
    "AdvisorFlow is temporarily unavailable";

  title.style.marginBottom =
    "10px";

  title.style.color =
    "#071a2d";

  const description =
    document.createElement("p");

  description.textContent =
    (
      message
      || (
        "Unable to verify your session. "
        + "Check the Backend connection and try again."
      )
    );

  description.style.marginBottom =
    "20px";

  description.style.color =
    "#64748b";

  description.style.lineHeight =
    "1.6";

  const retryButton =
    document.createElement("button");

  retryButton.type =
    "button";

  retryButton.textContent =
    "Retry Connection";

  retryButton.style.width =
    "100%";

  retryButton.style.padding =
    "13px 18px";

  retryButton.style.color =
    "#071a2d";

  retryButton.style.background =
    (
      "linear-gradient("
      + "135deg, "
      + "#00c2ff, "
      + "#14f195)"
    );

  retryButton.style.border =
    "none";

  retryButton.style.borderRadius =
    "12px";

  retryButton.style.fontWeight =
    "800";

  retryButton.style.cursor =
    "pointer";

  retryButton.addEventListener(
    "click",
    () => {
      window.location.reload();
    }
  );

  card.append(
    badge,
    title,
    description,
    retryButton
  );

  overlay.appendChild(card);

  document.body.appendChild(
    overlay
  );
}


async function requireAuthentication() {
  try {
    const result =
      await apiGetCurrentUser();

    if (!result?.user) {
      authRedirectToLogin(
        "login_required"
      );

      return null;
    }

    authApplyUserToPage(
      result.user
    );

    return result.user;

  } catch (error) {
    if (error.status === 401) {
      authRedirectToLogin(
        "session_expired"
      );

      return null;
    }

    authShowConnectionError(
      error.message
      ?? (
        "Unable to connect to "
        + "the AdvisorFlow Backend."
      )
    );

    return null;
  }
}


async function authRevalidateSession() {
  if (
    authSessionCheckInProgress
    || document.hidden
  ) {
    return;
  }

  authSessionCheckInProgress =
    true;

  try {
    const result =
      await apiGetCurrentUser();

    if (!result?.user) {
      authRedirectToLogin(
        "session_expired"
      );

      return;
    }

    authApplyUserToPage(
      result.user
    );

  } catch (error) {
    if (error.status === 401) {
      authRedirectToLogin(
        "session_expired"
      );
    }

  } finally {
    authSessionCheckInProgress =
      false;
  }
}


window.authReady =
  requireAuthentication();


window.authReady.then(
  user => {
    if (!user) {
      return;
    }

    window.setInterval(
      authRevalidateSession,
      AUTH_SESSION_CHECK_INTERVAL
    );
  }
);


document.addEventListener(
  "visibilitychange",
  () => {
    if (!document.hidden) {
      authRevalidateSession();
    }
  }
);