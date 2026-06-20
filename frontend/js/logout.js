async function displayUserInformation() {
  try {
    const result =
      await apiGetCurrentUser();

    const nameElement =
      document.getElementById(
        "logoutUserName"
      );

    const emailElement =
      document.getElementById(
        "logoutUserEmail"
      );

    if (nameElement) {
      nameElement.textContent =
        result.user.display_name;
    }

    if (emailElement) {
      emailElement.textContent =
        result.user.email;
    }
  } catch (error) {
    window.location.replace(
      "index.html"
    );
  }
}


async function confirmLogout() {
  const button =
    document.getElementById(
      "confirmLogoutButton"
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "Logging out...";
  }

  try {
    await apiLogout();
  } catch (error) {
    console.warn(
      "Logout request failed:",
      error
    );
  } finally {
    localStorage.removeItem(
      "userName"
    );

    localStorage.removeItem(
      "userEmail"
    );

    localStorage.removeItem(
      "userRole"
    );

    window.location.replace(
      "index.html"
    );
  }
}


function cancelLogout() {
  window.location.href =
    "dashboard.html";
}


document.addEventListener(
  "DOMContentLoaded",
  () => {
    displayUserInformation();

    document
      .getElementById(
        "confirmLogoutButton"
      )
      ?.addEventListener(
        "click",
        confirmLogout
      );

    document
      .getElementById(
        "cancelLogoutButton"
      )
      ?.addEventListener(
        "click",
        cancelLogout
      );
  }
);