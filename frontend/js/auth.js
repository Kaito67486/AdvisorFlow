async function requireAuthentication() {
  try {
    const result =
      await apiGetCurrentUser();

    const user = result.user;

    window.currentAdvisor = user;

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

    return user;
  } catch (error) {
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

    return null;
  }
}


window.authReady =
  requireAuthentication();