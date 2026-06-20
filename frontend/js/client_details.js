// client.js

const client = {
  name: "Alice Tan",
  age: 45,
  occupation: "Business Owner",
  riskProfile: "Conservative",
  goal: "Retirement Planning",
  lastMeeting: "12 June 2026",
  priority: "High"
};

function loadClientPage() {
  const title = document.querySelector(".topbar h1");
  if (title) title.textContent = client.name;
}

async function generateBrief() {
  const aiBrief = document.getElementById("aiBrief");

  if (!aiBrief) return;

  aiBrief.innerHTML = "Generating AI brief...";

  const result = await apiGenerateBrief(client);

  aiBrief.innerHTML = `
    <h3>Today's Focus</h3>
    <ul>
      ${result.focus.map(item => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

document.addEventListener("DOMContentLoaded", loadClientPage);
