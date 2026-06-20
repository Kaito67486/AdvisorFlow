const ADVISORFLOW_REMEMBERED_EMAIL =
  "advisorflowRememberedEmail";

const ADVISORFLOW_USER_NAME =
  "userName";

const ADVISORFLOW_USER_EMAIL =
  "userEmail";

const ADVISORFLOW_USER_ROLE =
  "userRole";

const ALLOWED_RETURN_PAGES =
  new Set([
    "dashboard.html",
    "client.html",
    "client_details.html",
    "meeting.html",
    "partner.html"
  ]);


function loginElement(id) {
  return document.getElementById(id);
}


function showLoginMessage(
  message,
  type = "error"
) {
  const element =
    type === "error"
      ? loginElement("loginError")
      : loginElement("loginNotice");

  if (!element) {
    return;
  }

  element.textContent =
    message ?? "";

  element.className =
    `auth-message ${type}`;

  element.hidden =
    !message;
}


function clearLoginMessages() {
  const errorElement =
    loginElement("loginError");

  const noticeElement =
    loginElement("loginNotice");

  if (errorElement) {
    errorElement.textContent = "";
    errorElement.hidden = true;
  }

  if (noticeElement) {
    noticeElement.textContent = "";
    noticeElement.hidden = true;
  }
}


function saveUserDisplayData(user) {
  localStorage.setItem(
    ADVISORFLOW_USER_NAME,
    user.display_name
  );

  localStorage.setItem(
    ADVISORFLOW_USER_EMAIL,
    user.email
  );

  localStorage.setItem(
    ADVISORFLOW_USER_ROLE,
    user.role
  );
}


function getSafeNextPage() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  const nextValue =
    parameters.get("next");

  if (!nextValue) {
    return "dashboard.html";
  }

  try {
    const targetUrl =
      new URL(
        nextValue,
        window.location.origin
      );

    if (
      targetUrl.origin !==
      window.location.origin
    ) {
      return "dashboard.html";
    }

    const segments =
      targetUrl.pathname
        .split("/")
        .filter(Boolean);

    const pageName =
      segments.at(-1);

    if (
      !pageName ||
      !ALLOWED_RETURN_PAGES.has(
        pageName
      )
    ) {
      return "dashboard.html";
    }

    return (
      pageName
      + targetUrl.search
      + targetUrl.hash
    );

  } catch (error) {
    return "dashboard.html";
  }
}


function showLoginReason() {
  const parameters =
    new URLSearchParams(
      window.location.search
    );

  const reason =
    parameters.get("reason");

  const messages = {
    logged_out: (
      "You have signed out successfully."
    ),

    session_expired: (
      "Your session expired. Sign in again to continue."
    ),

    login_required: (
      "Please sign in before opening that page."
    ),

    already_logged_out: (
      "Your AdvisorFlow session is no longer active."
    )
  };

  if (
    reason &&
    messages[reason]
  ) {
    const type =
      reason === "logged_out"
        ? "success"
        : "info";

    showLoginMessage(
      messages[reason],
      type
    );
  }
}


function setLoginLoading(isLoading) {
  const button =
    loginElement("loginButton");

  const buttonText =
    loginElement(
      "loginButtonText"
    );

  const spinner =
    loginElement(
      "loginButtonSpinner"
    );

  const emailInput =
    loginElement("email");

  const passwordInput =
    loginElement("password");

  const demoButton =
    loginElement(
      "useDemoAccountButton"
    );

  if (button) {
    button.disabled =
      isLoading;
  }

  if (buttonText) {
    buttonText.textContent =
      isLoading
        ? "Signing In..."
        : "Sign In";
  }

  if (spinner) {
    spinner.hidden =
      !isLoading;
  }

  if (emailInput) {
    emailInput.disabled =
      isLoading;
  }

  if (passwordInput) {
    passwordInput.disabled =
      isLoading;
  }

  if (demoButton) {
    demoButton.disabled =
      isLoading;
  }
}


function updateBackendStatus(
  state,
  message
) {
  const statusElement =
    loginElement(
      "backendStatus"
    );

  if (!statusElement) {
    return;
  }

  statusElement.className =
    `auth-service-status ${state}`;

  statusElement.replaceChildren();

  const statusDot =
    document.createElement("span");

  const statusText =
    document.createTextNode(
      message
    );

  statusElement.append(
    statusDot,
    statusText
  );
}


async function checkBackendStatus() {
  updateBackendStatus(
    "checking",
    "Checking service"
  );

  try {
    const result =
      await apiRequest("/health");

    if (
      result?.status === "healthy"
      && result?.database
        === "connected"
    ) {
      updateBackendStatus(
        "online",
        "Service online"
      );

      return;
    }

    updateBackendStatus(
      "offline",
      "Service unavailable"
    );

  } catch (error) {
    updateBackendStatus(
      "offline",
      "Service unavailable"
    );
  }
}


function loadRememberedEmail() {
  const emailInput =
    loginElement("email");

  const rememberCheckbox =
    loginElement(
      "rememberEmail"
    );

  const rememberedEmail =
    localStorage.getItem(
      ADVISORFLOW_REMEMBERED_EMAIL
    );

  if (
    emailInput &&
    rememberedEmail
  ) {
    emailInput.value =
      rememberedEmail;

    rememberCheckbox.checked =
      true;
  }
}


function updateRememberedEmail(
  email
) {
  const rememberCheckbox =
    loginElement(
      "rememberEmail"
    );

  if (
    rememberCheckbox?.checked
  ) {
    localStorage.setItem(
      ADVISORFLOW_REMEMBERED_EMAIL,
      email
    );
  } else {
    localStorage.removeItem(
      ADVISORFLOW_REMEMBERED_EMAIL
    );
  }
}


function togglePasswordVisibility() {
  const passwordInput =
    loginElement("password");

  const toggleButton =
    loginElement(
      "togglePasswordButton"
    );

  if (
    !passwordInput ||
    !toggleButton
  ) {
    return;
  }

  const shouldShow =
    passwordInput.type
    === "password";

  passwordInput.type =
    shouldShow
      ? "text"
      : "password";

  toggleButton.textContent =
    shouldShow
      ? "Hide"
      : "Show";

  toggleButton.setAttribute(
    "aria-label",
    shouldShow
      ? "Hide password"
      : "Show password"
  );

  toggleButton.setAttribute(
    "aria-pressed",
    String(shouldShow)
  );

  passwordInput.focus();
}


function updateCapsLockWarning(
  event
) {
  const warning =
    loginElement(
      "capsLockWarning"
    );

  if (!warning) {
    return;
  }

  warning.hidden =
    !event.getModifierState(
      "CapsLock"
    );
}


function fillDemoAccount() {
  const emailInput =
    loginElement("email");

  const passwordInput =
    loginElement("password");

  if (
    !emailInput ||
    !passwordInput
  ) {
    return;
  }

  clearLoginMessages();

  emailInput.value =
    "alex@advisorflow.com";

  passwordInput.value =
    "advisor123";

  loginElement(
    "rememberEmail"
  ).checked = true;

  showLoginMessage(
    "Demo account details have been filled in. Select Sign In to continue.",
    "info"
  );

  passwordInput.focus();
}


function getLoginCredentials() {
  const emailInput =
    loginElement("email");

  const passwordInput =
    loginElement("password");

  return {
    email: (
      emailInput.value
        .trim()
        .toLowerCase()
    ),

    password:
      passwordInput.value
  };
}


async function handleLogin(event) {
  event.preventDefault();

  const form =
    event.currentTarget;

  clearLoginMessages();

  if (!form.reportValidity()) {
    showLoginMessage(
      "Check your email and password, then try again.",
      "error"
    );

    return;
  }

  const {
    email,
    password
  } = getLoginCredentials();

  if (!email || !password) {
    showLoginMessage(
      "Enter your email and password.",
      "error"
    );

    return;
  }

  setLoginLoading(true);

  try {
    const result =
      await apiLogin(
        email,
        password
      );

    if (!result?.user) {
      throw new Error(
        "The login response did not contain an advisor account."
      );
    }

    updateRememberedEmail(
      email
    );

    saveUserDisplayData(
      result.user
    );

    loginElement(
      "password"
    ).value = "";

    window.location.replace(
      getSafeNextPage()
    );

  } catch (error) {
    let message =
      error.message
      ?? "Unable to sign in.";

    if (error.status === 401) {
      message =
        "The email or password is incorrect.";
    } else if (error.status === 0) {
      message =
        (
          "Unable to reach the AdvisorFlow Backend. "
          + "Check that the Backend is running."
        );
    } else if (error.status === 422) {
      message =
        "Enter a valid email and password.";
    }

    showLoginMessage(
      message,
      "error"
    );

    loginElement(
      "password"
    ).select();

  } finally {
    setLoginLoading(false);
  }
}


async function redirectSignedInUser() {
  try {
    const result =
      await apiGetCurrentUser();

    if (!result?.user) {
      return false;
    }

    saveUserDisplayData(
      result.user
    );

    window.location.replace(
      getSafeNextPage()
    );

    return true;

  } catch (error) {
    return false;
  }
}


function initializeLoginEvents() {
  loginElement(
    "loginForm"
  )?.addEventListener(
    "submit",
    handleLogin
  );

  loginElement(
    "togglePasswordButton"
  )?.addEventListener(
    "click",
    togglePasswordVisibility
  );

  loginElement(
    "useDemoAccountButton"
  )?.addEventListener(
    "click",
    fillDemoAccount
  );

  const passwordInput =
    loginElement("password");

  passwordInput?.addEventListener(
    "keydown",
    updateCapsLockWarning
  );

  passwordInput?.addEventListener(
    "keyup",
    updateCapsLockWarning
  );

  passwordInput?.addEventListener(
    "blur",
    () => {
      const warning =
        loginElement(
          "capsLockWarning"
        );

      if (warning) {
        warning.hidden = true;
      }
    }
  );
}


document.addEventListener(
  "DOMContentLoaded",
  async () => {
    showLoginReason();
    loadRememberedEmail();
    initializeLoginEvents();

    checkBackendStatus();

    const redirected =
      await redirectSignedInUser();

    if (redirected) {
      return;
    }

    const emailInput =
      loginElement("email");

    const passwordInput =
      loginElement("password");

    if (emailInput?.value) {
      passwordInput?.focus();
    } else {
      emailInput?.focus();
    }
  }
);