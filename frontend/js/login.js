function showLoginError(message) {
  const errorElement =
    document.getElementById(
      "loginError"
    );

  if (!errorElement) {
    return;
  }

  errorElement.textContent =
    message ?? "";
}


function setLoginLoading(
  isLoading
) {
  const button =
    document.getElementById(
      "loginButton"
    );

  if (!button) {
    return;
  }

  button.disabled = isLoading;

  button.textContent =
    isLoading
      ? "Signing in..."
      : "Login";
}


async function handleLogin(
  event
) {
  event.preventDefault();

  const email =
    document
      .getElementById("email")
      .value
      .trim()
      .toLowerCase();

  const password =
    document
      .getElementById("password")
      .value;

  showLoginError("");

  if (!email || !password) {
    showLoginError(
      "Please enter your email and password."
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

    localStorage.setItem(
      "userName",
      result.user.display_name
    );

    localStorage.setItem(
      "userEmail",
      result.user.email
    );

    localStorage.setItem(
      "userRole",
      result.user.role
    );

    window.location.replace(
      "dashboard.html"
    );
  } catch (error) {
    showLoginError(
      error.message ??
      "Unable to sign in."
    );
  } finally {
    setLoginLoading(false);
  }
}


async function redirectSignedInUser() {
  try {
    await apiGetCurrentUser();

    window.location.replace(
      "dashboard.html"
    );
  } catch (error) {
    // User is not signed in.
  }
}


document.addEventListener(
  "DOMContentLoaded",
  async () => {
    await redirectSignedInUser();

    const form =
      document.getElementById(
        "loginForm"
      );

    if (form) {
      form.addEventListener(
        "submit",
        handleLogin
      );
    }
  }
);