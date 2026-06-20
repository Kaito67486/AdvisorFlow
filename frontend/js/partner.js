let partnerDirectoryData = [];
let partnerClientData = [];
let referralHistoryData = [];

let editingPartnerId = null;
let currentMatchResponse = null;
let selectedMatchedPartner = null;


function partnerElement(id) {
  return document.getElementById(id);
}


function normalizeOptionalValue(value) {
  const normalized =
    String(value ?? "").trim();

  return normalized || null;
}


function getPartnerInitials(name) {
  return String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}


function formatPartnerDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
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


function showPartnerPageMessage(
  message,
  type = "success"
) {
  const element =
    partnerElement(
      "partnerPageMessage"
    );

  if (!element) {
    return;
  }

  element.textContent =
    message ?? "";

  element.className =
    `partner-page-message ${type}`;

  element.hidden = !message;

  if (
    message &&
    type === "success"
  ) {
    window.setTimeout(
      () => {
        element.hidden = true;
      },
      4500
    );
  }
}


function showPartnerFormMessage(
  message
) {
  const element =
    partnerElement(
      "partnerFormMessage"
    );

  if (!element) {
    return;
  }

  element.textContent =
    message ?? "";

  element.hidden = !message;
}


function renderPartnerKpis() {
  const activePartners =
    partnerDirectoryData.filter(
      partner =>
        partner.status === "ACTIVE"
    );

  const specialties =
    new Set(
      activePartners
        .map(
          partner =>
            partner.specialty
              ?.trim()
              .toLowerCase()
        )
        .filter(Boolean)
    );

  const draftReferrals =
    referralHistoryData.filter(
      referral =>
        referral.status === "DRAFT"
    );

  partnerElement(
    "activePartnerCount"
  ).textContent =
    activePartners.length;

  partnerElement(
    "partnerSpecialtyCount"
  ).textContent =
    specialties.size;

  partnerElement(
    "draftReferralCount"
  ).textContent =
    draftReferrals.length;

  partnerElement(
    "totalReferralCount"
  ).textContent =
    referralHistoryData.length;
}


function refreshPartnerSpecialtyFilter() {
  const select =
    partnerElement(
      "partnerSpecialtyFilter"
    );

  const previousValue =
    select.value;

  const specialties = [
    ...new Set(
      partnerDirectoryData
        .map(
          partner =>
            partner.specialty
              ?.trim()
        )
        .filter(Boolean)
    )
  ].sort(
    (first, second) =>
      first.localeCompare(
        second,
        undefined,
        {
          sensitivity: "base"
        }
      )
  );

  select.replaceChildren();

  const allOption =
    document.createElement(
      "option"
    );

  allOption.value = "all";
  allOption.textContent =
    "All Specialties";

  select.appendChild(
    allOption
  );

  specialties.forEach(
    specialty => {
      const option =
        document.createElement(
          "option"
        );

      option.value = specialty;
      option.textContent =
        specialty;

      select.appendChild(
        option
      );
    }
  );

  select.value =
    specialties.includes(
      previousValue
    )
      ? previousValue
      : "all";
}


function getFilteredPartners() {
  const searchValue =
    partnerElement(
      "partnerSearch"
    )
      .value
      .trim()
      .toLowerCase();

  const specialtyValue =
    partnerElement(
      "partnerSpecialtyFilter"
    ).value;

  const statusValue =
    partnerElement(
      "partnerStatusFilter"
    ).value;

  return partnerDirectoryData.filter(
    partner => {
      const searchableText = [
        partner.name,
        partner.partner_type,
        partner.specialty,
        partner.best_for,
        partner.description,
        partner.contact_name,
        partner.email,
        partner.phone,
        partner.service_area,
        ...(partner.keywords ?? [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchableText.includes(
          searchValue
        );

      const matchesSpecialty =
        specialtyValue === "all" ||
        partner.specialty ===
          specialtyValue;

      const matchesStatus =
        statusValue === "all" ||
        partner.status ===
          statusValue;

      return (
        matchesSearch &&
        matchesSpecialty &&
        matchesStatus
      );
    }
  );
}


function createPartnerNameCell(
  partner
) {
  const cell =
    document.createElement("td");

  const container =
    document.createElement("div");

  container.className =
    "partner-name-cell";

  const avatar =
    document.createElement("div");

  avatar.className =
    "partner-avatar";

  avatar.textContent =
    getPartnerInitials(
      partner.name
    );

  const meta =
    document.createElement("div");

  meta.className =
    "partner-name-meta";

  const name =
    document.createElement(
      "strong"
    );

  name.textContent =
    partner.name;

  const contact =
    document.createElement(
      "small"
    );

  contact.textContent =
    partner.contact_name
      ? `Contact: ${partner.contact_name}`
      : (
          partner.email
          ?? "No contact recorded"
        );

  meta.append(
    name,
    contact
  );

  container.append(
    avatar,
    meta
  );

  cell.appendChild(
    container
  );

  return cell;
}


function createPartnerRow(
  partner
) {
  const row =
    document.createElement("tr");

  const nameCell =
    createPartnerNameCell(
      partner
    );

  const typeCell =
    document.createElement("td");

  const typeBadge =
    document.createElement("span");

  typeBadge.className =
    "partner-type-badge";

  typeBadge.textContent =
    partner.partner_type;

  typeCell.appendChild(
    typeBadge
  );

  const specialtyCell =
    document.createElement("td");

  specialtyCell.textContent =
    partner.specialty;

  const bestForCell =
    document.createElement("td");

  bestForCell.textContent =
    partner.best_for
    ?? partner.description
    ?? "Not recorded";

  const responseCell =
    document.createElement("td");

  responseCell.textContent =
    partner.response_time_days
      === null ||
    partner.response_time_days
      === undefined
      ? "Not recorded"
      : (
          `${partner.response_time_days} day${
            partner.response_time_days
              === 1
              ? ""
              : "s"
          }`
        );

  const statusCell =
    document.createElement("td");

  const statusBadge =
    document.createElement("span");

  statusBadge.className =
    (
      "partner-status-badge "
      + partner.status
        .toLowerCase()
    );

  statusBadge.textContent =
    partner.status === "ACTIVE"
      ? "Active"
      : "Inactive";

  statusCell.appendChild(
    statusBadge
  );

  const actionsCell =
    document.createElement("td");

  const actionGroup =
    document.createElement("div");

  actionGroup.className =
    "partner-action-group";

  const editButton =
    document.createElement(
      "button"
    );

  editButton.type = "button";
  editButton.className =
    "partner-action-button";

  editButton.textContent =
    "Edit";

  editButton.addEventListener(
    "click",
    () => {
      openEditPartnerDialog(
        partner
      );
    }
  );

  const deleteButton =
    document.createElement(
      "button"
    );

  deleteButton.type =
    "button";

  deleteButton.className =
    (
      "partner-action-button "
      + "delete"
    );

  deleteButton.textContent =
    "Delete";

  deleteButton.addEventListener(
    "click",
    async () => {
      await deletePartnerRecord(
        partner
      );
    }
  );

  actionGroup.append(
    editButton,
    deleteButton
  );

  actionsCell.appendChild(
    actionGroup
  );

  row.append(
    nameCell,
    typeCell,
    specialtyCell,
    bestForCell,
    responseCell,
    statusCell,
    actionsCell
  );

  return row;
}


function renderPartnerDirectory() {
  const tableBody =
    partnerElement(
      "partnerTableBody"
    );

  const filteredPartners =
    getFilteredPartners();

  tableBody.replaceChildren();

  filteredPartners.forEach(
    partner => {
      tableBody.appendChild(
        createPartnerRow(
          partner
        )
      );
    }
  );

  partnerElement(
    "partnerResultCount"
  ).textContent =
    `${filteredPartners.length} partner${
      filteredPartners.length === 1
        ? ""
        : "s"
    } found`;

  partnerElement(
    "emptyPartnerMessage"
  ).hidden =
    filteredPartners.length > 0;
}


function sortPartnerDirectory() {
  partnerDirectoryData.sort(
    (first, second) =>
      first.name.localeCompare(
        second.name,
        undefined,
        {
          sensitivity: "base"
        }
      )
  );
}


function resetPartnerForm() {
  partnerElement(
    "partnerForm"
  ).reset();

  editingPartnerId = null;

  partnerElement(
    "partnerDialogTitle"
  ).textContent =
    "Add Partner";

  partnerElement(
    "savePartnerButton"
  ).textContent =
    "Save Partner";

  partnerElement(
    "partnerTypeInput"
  ).value =
    "Insurance";

  partnerElement(
    "partnerStatusInput"
  ).value =
    "ACTIVE";

  showPartnerFormMessage("");
}


function openAddPartnerDialog() {
  resetPartnerForm();

  partnerElement(
    "partnerDialog"
  ).showModal();

  window.setTimeout(
    () => {
      partnerElement(
        "partnerNameInput"
      ).focus();
    },
    50
  );
}


function openEditPartnerDialog(
  partner
) {
  resetPartnerForm();

  editingPartnerId =
    partner.id;

  partnerElement(
    "partnerDialogTitle"
  ).textContent =
    "Edit Partner";

  partnerElement(
    "savePartnerButton"
  ).textContent =
    "Save Changes";

  partnerElement(
    "partnerNameInput"
  ).value =
    partner.name ?? "";

  partnerElement(
    "partnerTypeInput"
  ).value =
    partner.partner_type
    ?? "Other";

  partnerElement(
    "partnerSpecialtyInput"
  ).value =
    partner.specialty ?? "";

  partnerElement(
    "partnerBestForInput"
  ).value =
    partner.best_for ?? "";

  partnerElement(
    "partnerDescriptionInput"
  ).value =
    partner.description ?? "";

  partnerElement(
    "partnerContactNameInput"
  ).value =
    partner.contact_name ?? "";

  partnerElement(
    "partnerEmailInput"
  ).value =
    partner.email ?? "";

  partnerElement(
    "partnerPhoneInput"
  ).value =
    partner.phone ?? "";

  partnerElement(
    "partnerWebsiteInput"
  ).value =
    partner.website ?? "";

  partnerElement(
    "partnerServiceAreaInput"
  ).value =
    partner.service_area ?? "";

  partnerElement(
    "partnerResponseDaysInput"
  ).value =
    partner.response_time_days
    ?? "";

  partnerElement(
    "partnerKeywordsInput"
  ).value =
    (
      partner.keywords
      ?? []
    ).join(", ");

  partnerElement(
    "partnerStatusInput"
  ).value =
    partner.status
    ?? "ACTIVE";

  partnerElement(
    "partnerDialog"
  ).showModal();
}


function closePartnerDialog() {
  const dialog =
    partnerElement(
      "partnerDialog"
    );

  if (dialog.open) {
    dialog.close();
  }
}


function buildPartnerPayload() {
  const responseValue =
    partnerElement(
      "partnerResponseDaysInput"
    ).value.trim();

  const responseTimeDays =
    responseValue
      ? Number(responseValue)
      : null;

  if (
    responseTimeDays !== null &&
    (
      !Number.isInteger(
        responseTimeDays
      ) ||
      responseTimeDays < 0 ||
      responseTimeDays > 365
    )
  ) {
    throw new Error(
      "Response time must be a whole number between 0 and 365."
    );
  }

  const name =
    partnerElement(
      "partnerNameInput"
    ).value.trim();

  const specialty =
    partnerElement(
      "partnerSpecialtyInput"
    ).value.trim();

  if (!name) {
    throw new Error(
      "Partner name is required."
    );
  }

  if (!specialty) {
    throw new Error(
      "Specialty is required."
    );
  }

  const keywords =
    partnerElement(
      "partnerKeywordsInput"
    )
      .value
      .split(/[,;\n]/)
      .map(
        keyword =>
          keyword.trim()
      )
      .filter(Boolean);

  return {
    name,

    partner_type:
      partnerElement(
        "partnerTypeInput"
      ).value,

    specialty,

    best_for:
      normalizeOptionalValue(
        partnerElement(
          "partnerBestForInput"
        ).value
      ),

    description:
      normalizeOptionalValue(
        partnerElement(
          "partnerDescriptionInput"
        ).value
      ),

    contact_name:
      normalizeOptionalValue(
        partnerElement(
          "partnerContactNameInput"
        ).value
      ),

    email:
      normalizeOptionalValue(
        partnerElement(
          "partnerEmailInput"
        ).value
      ),

    phone:
      normalizeOptionalValue(
        partnerElement(
          "partnerPhoneInput"
        ).value
      ),

    website:
      normalizeOptionalValue(
        partnerElement(
          "partnerWebsiteInput"
        ).value
      ),

    service_area:
      normalizeOptionalValue(
        partnerElement(
          "partnerServiceAreaInput"
        ).value
      ),

    keywords,

    response_time_days:
      responseTimeDays,

    status:
      partnerElement(
        "partnerStatusInput"
      ).value
  };
}


function setPartnerFormLoading(
  loading
) {
  const saveButton =
    partnerElement(
      "savePartnerButton"
    );

  saveButton.disabled =
    loading;

  saveButton.textContent =
    loading
      ? "Saving..."
      : (
          editingPartnerId
            ? "Save Changes"
            : "Save Partner"
        );

  partnerElement(
    "cancelPartnerDialogButton"
  ).disabled =
    loading;

  partnerElement(
    "closePartnerDialogButton"
  ).disabled =
    loading;
}


async function handlePartnerFormSubmit(
  event
) {
  event.preventDefault();

  if (
    !event.currentTarget
      .reportValidity()
  ) {
    return;
  }

  showPartnerFormMessage("");

  let payload;

  try {
    payload =
      buildPartnerPayload();
  } catch (error) {
    showPartnerFormMessage(
      error.message
    );

    return;
  }

  setPartnerFormLoading(true);

  try {
    if (editingPartnerId) {
      const updatedPartner =
        await apiUpdatePartner(
          editingPartnerId,
          payload
        );

      const index =
        partnerDirectoryData
          .findIndex(
            partner =>
              partner.id
              === editingPartnerId
          );

      if (index >= 0) {
        partnerDirectoryData[
          index
        ] = updatedPartner;
      }

      showPartnerPageMessage(
        `${updatedPartner.name} was updated successfully.`,
        "success"
      );
    } else {
      const createdPartner =
        await apiCreatePartner(
          payload
        );

      partnerDirectoryData.push(
        createdPartner
      );

      showPartnerPageMessage(
        `${createdPartner.name} was added successfully.`,
        "success"
      );
    }

    sortPartnerDirectory();
    refreshPartnerSpecialtyFilter();
    renderPartnerDirectory();
    renderPartnerKpis();
    closePartnerDialog();

  } catch (error) {
    showPartnerFormMessage(
      error.message
      ?? "Unable to save the partner."
    );

  } finally {
    setPartnerFormLoading(false);
  }
}


async function deletePartnerRecord(
  partner
) {
  const confirmed =
    window.confirm(
      `Delete ${partner.name}?\n\n`
      + "Existing referral history will keep "
      + "the partner name, but the partner "
      + "profile will be removed."
    );

  if (!confirmed) {
    return;
  }

  try {
    await apiDeletePartner(
      partner.id
    );

    partnerDirectoryData =
      partnerDirectoryData.filter(
        item =>
          item.id !== partner.id
      );

    if (
      selectedMatchedPartner
        ?.partner_id
      === partner.id
    ) {
      resetPartnerMatchResult();
    }

    refreshPartnerSpecialtyFilter();
    renderPartnerDirectory();
    renderPartnerKpis();

    showPartnerPageMessage(
      `${partner.name} was deleted successfully.`,
      "success"
    );

  } catch (error) {
    showPartnerPageMessage(
      error.message
      ?? "Unable to delete the partner.",
      "error"
    );
  }
}


function loadMatchingClients() {
  const select =
    partnerElement(
      "matchingClient"
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

  partnerClientData
    .filter(
      client =>
        client.status === "ACTIVE"
    )
    .sort(
      (first, second) =>
        first.full_name.localeCompare(
          second.full_name
        )
    )
    .forEach(
      client => {
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
      }
    );

  const queryParameters =
    new URLSearchParams(
      window.location.search
    );

  const clientId =
    queryParameters.get(
      "clientId"
    );

  if (clientId) {
    select.value =
      clientId;
  }
}


function appendMatchDetail(
  container,
  label,
  value
) {
  const item =
    document.createElement("div");

  item.className =
    "partner-match-detail";

  const labelElement =
    document.createElement("span");

  labelElement.textContent =
    label;

  const valueElement =
    document.createElement(
      "strong"
    );

  valueElement.textContent =
    value ?? "Not recorded";

  item.append(
    labelElement,
    valueElement
  );

  container.appendChild(item);
}


function renderMatchReasons(
  container,
  reasons
) {
  const section =
    document.createElement(
      "section"
    );

  section.className =
    "partner-match-reasons";

  const title =
    document.createElement("h3");

  title.textContent =
    "Why this partner?";

  const list =
    document.createElement("ul");

  (
    reasons?.length
      ? reasons
      : [
          "No specific reasons were returned."
        ]
  ).forEach(
    reason => {
      const item =
        document.createElement(
          "li"
        );

      item.textContent =
        reason;

      list.appendChild(
        item
      );
    }
  );

  section.append(
    title,
    list
  );

  container.appendChild(
    section
  );
}


function renderPartnerMatch(
  partner
) {
  selectedMatchedPartner =
    partner;

  const container =
    partnerElement(
      "partnerMatchResult"
    );

  container.replaceChildren();

  const header =
    document.createElement(
      "div"
    );

  header.className =
    "partner-match-header";

  const titleArea =
    document.createElement(
      "div"
    );

  const badge =
    document.createElement(
      "span"
    );

  badge.className =
    "badge success";

  badge.textContent =
    "Recommended Match";

  const name =
    document.createElement("h2");

  name.textContent =
    partner.name;

  const description =
    document.createElement("p");

  description.textContent =
    partner.description;

  titleArea.append(
    badge,
    name,
    description
  );

  const score =
    document.createElement(
      "div"
    );

  score.className =
    "partner-match-score";

  const scoreValue =
    document.createElement(
      "strong"
    );

  scoreValue.textContent =
    `${partner.match_score}%`;

  const scoreLabel =
    document.createElement(
      "span"
    );

  scoreLabel.textContent =
    "Match Score";

  score.append(
    scoreValue,
    scoreLabel
  );

  header.append(
    titleArea,
    score
  );

  container.appendChild(
    header
  );

  const detailGrid =
    document.createElement(
      "div"
    );

  detailGrid.className =
    "partner-match-details";

  appendMatchDetail(
    detailGrid,
    "Partner Type",
    partner.partner_type
  );

  appendMatchDetail(
    detailGrid,
    "Specialty",
    partner.specialty
  );

  appendMatchDetail(
    detailGrid,
    "Service Area",
    partner.service_area
  );

  appendMatchDetail(
    detailGrid,
    "Response Time",
    partner.response_time_days
      === null ||
    partner.response_time_days
      === undefined
      ? "Not recorded"
      : (
          `${partner.response_time_days} day${
            partner.response_time_days
              === 1
              ? ""
              : "s"
          }`
        )
  );

  container.appendChild(
    detailGrid
  );

  renderMatchReasons(
    container,
    partner.why
  );

  const nextStep =
    document.createElement(
      "section"
    );

  nextStep.className =
    "partner-match-next-step";

  const nextStepTitle =
    document.createElement("h3");

  nextStepTitle.textContent =
    "Recommended Next Step";

  const nextStepText =
    document.createElement("p");

  nextStepText.textContent =
    partner.next_step;

  nextStep.append(
    nextStepTitle,
    nextStepText
  );

  container.appendChild(
    nextStep
  );

  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "partner-match-actions";

  const referralButton =
    document.createElement(
      "button"
    );

  referralButton.type =
    "button";

  referralButton.className =
    "primary-btn";

  referralButton.textContent =
    "Create Referral Draft";

  referralButton.addEventListener(
    "click",
    async () => {
      await createReferralDraft(
        referralButton
      );
    }
  );

  actions.appendChild(
    referralButton
  );

  if (partner.email) {
    const emailLink =
      document.createElement("a");

    emailLink.className =
      "partner-contact-link";

    emailLink.href =
      `mailto:${partner.email}`;

    emailLink.textContent =
      "Email Partner";

    actions.appendChild(
      emailLink
    );
  }

  if (partner.website) {
    const websiteLink =
      document.createElement("a");

    websiteLink.className =
      "partner-contact-link";

    websiteLink.href =
      partner.website;

    websiteLink.target =
      "_blank";

    websiteLink.rel =
      "noopener noreferrer";

    websiteLink.textContent =
      "Open Website";

    actions.appendChild(
      websiteLink
    );
  }

  container.appendChild(
    actions
  );
}


function createAlternativePartnerRow(
  partner
) {
  const row =
    document.createElement("tr");

  const nameCell =
    document.createElement("td");

  nameCell.textContent =
    partner.name;

  const specialtyCell =
    document.createElement("td");

  specialtyCell.textContent =
    partner.specialty;

  const scoreCell =
    document.createElement("td");

  const scoreBadge =
    document.createElement("span");

  scoreBadge.className =
    "partner-score-badge";

  scoreBadge.textContent =
    `${partner.match_score}%`;

  scoreCell.appendChild(
    scoreBadge
  );

  const reasonCell =
    document.createElement("td");

  reasonCell.textContent =
    partner.why?.[0]
    ?? "Available partner";

  const actionCell =
    document.createElement("td");

  const useButton =
    document.createElement(
      "button"
    );

  useButton.type = "button";
  useButton.className =
    "partner-action-button";

  useButton.textContent =
    "Use This Partner";

  useButton.addEventListener(
    "click",
    () => {
      renderPartnerMatch(
        partner
      );

      partnerElement(
        "partnerMatchResult"
      ).scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  );

  actionCell.appendChild(
    useButton
  );

  row.append(
    nameCell,
    specialtyCell,
    scoreCell,
    reasonCell,
    actionCell
  );

  return row;
}


function renderAlternativePartners(
  partners
) {
  const panel =
    partnerElement(
      "alternativePartnersPanel"
    );

  const tableBody =
    partnerElement(
      "alternativePartnerTableBody"
    );

  tableBody.replaceChildren();

  panel.hidden =
    !partners.length;

  partnerElement(
    "alternativePartnerCount"
  ).textContent =
    `${partners.length} alternative partner${
      partners.length === 1
        ? ""
        : "s"
    }`;

  partners.forEach(
    partner => {
      tableBody.appendChild(
        createAlternativePartnerRow(
          partner
        )
      );
    }
  );
}


function resetPartnerMatchResult() {
  currentMatchResponse = null;
  selectedMatchedPartner = null;

  const container =
    partnerElement(
      "partnerMatchResult"
    );

  container.replaceChildren();

  const placeholder =
    document.createElement(
      "div"
    );

  placeholder.className =
    "partner-match-placeholder";

  const icon =
    document.createElement("div");

  icon.className =
    "partner-match-icon";

  icon.textContent =
    "MATCH";

  const title =
    document.createElement("h2");

  title.textContent =
    "No recommendation yet";

  const message =
    document.createElement("p");

  message.textContent =
    "Select a client and generate a match.";

  placeholder.append(
    icon,
    title,
    message
  );

  container.appendChild(
    placeholder
  );

  partnerElement(
    "alternativePartnersPanel"
  ).hidden = true;
}


async function generatePartnerMatch() {
  const clientId =
    Number(
      partnerElement(
        "matchingClient"
      ).value
    );

  const notes =
    partnerElement(
      "matchingNotes"
    ).value.trim();

  if (
    !Number.isInteger(clientId)
    || clientId <= 0
  ) {
    showPartnerPageMessage(
      "Select a client before generating a partner match.",
      "error"
    );

    return;
  }

  const button =
    partnerElement(
      "generatePartnerMatchButton"
    );

  button.disabled = true;
  button.textContent =
    "Generating Match...";

  const resultContainer =
    partnerElement(
      "partnerMatchResult"
    );

  resultContainer.textContent =
    "Reading the client profile, confirmed meetings and active partner directory...";

  try {
    currentMatchResponse =
      await apiGeneratePartnerMatch(
        clientId,
        notes
      );

    renderPartnerMatch(
      currentMatchResponse
        .best_match
    );

    renderAlternativePartners(
      currentMatchResponse
        .other_partners
    );

    showPartnerPageMessage(
      (
        "Partner recommendation generated "
        + "from live AdvisorFlow data."
      ),
      "success"
    );

  } catch (error) {
    resetPartnerMatchResult();

    showPartnerPageMessage(
      error.message
      ?? "Unable to generate a partner match.",
      "error"
    );

  } finally {
    button.disabled = false;
    button.textContent =
      "Generate Partner Match";
  }
}


async function createReferralDraft(
  button
) {
  if (
    !currentMatchResponse ||
    !selectedMatchedPartner
  ) {
    return;
  }

  const clientId =
    currentMatchResponse
      .client
      .id;

  const notes =
    partnerElement(
      "matchingNotes"
    ).value.trim();

  button.disabled = true;
  button.textContent =
    "Saving Draft...";

  try {
    const referral =
      await apiCreateReferral({
        client_id: clientId,

        partner_id:
          selectedMatchedPartner
            .partner_id,

        match_score:
          selectedMatchedPartner
            .match_score,

        reasons:
          selectedMatchedPartner
            .why,

        notes:
          notes || null,

        status:
          "DRAFT"
      });

    referralHistoryData.unshift(
      referral
    );

    renderReferralHistory();
    renderPartnerKpis();

    showPartnerPageMessage(
      (
        `Referral draft created for `
        + `${referral.client_name} and `
        + `${referral.partner_name}.`
      ),
      "success"
    );

  } catch (error) {
    showPartnerPageMessage(
      error.message
      ?? "Unable to create the referral draft.",
      "error"
    );

  } finally {
    button.disabled = false;
    button.textContent =
      "Create Referral Draft";
  }
}


function createReferralStatusSelect(
  referral
) {
  const select =
    document.createElement(
      "select"
    );

  select.className =
    "partner-referral-status-select";

  [
    "DRAFT",
    "READY",
    "SENT",
    "ACCEPTED",
    "DECLINED",
    "CLOSED"
  ].forEach(
    statusValue => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        statusValue;

      option.textContent =
        statusValue
          .toLowerCase()
          .replace(
            /^./,
            value =>
              value.toUpperCase()
          );

      select.appendChild(
        option
      );
    }
  );

  select.value =
    referral.status;

  select.addEventListener(
    "change",
    async () => {
      const previousStatus =
        referral.status;

      select.disabled = true;

      try {
        const updatedReferral =
          await apiUpdateReferral(
            referral.id,
            {
              status:
                select.value
            }
          );

        const index =
          referralHistoryData
            .findIndex(
              item =>
                item.id
                === referral.id
            );

        if (index >= 0) {
          referralHistoryData[
            index
          ] = updatedReferral;
        }

        renderPartnerKpis();

        showPartnerPageMessage(
          "Referral status updated.",
          "success"
        );

      } catch (error) {
        select.value =
          previousStatus;

        showPartnerPageMessage(
          error.message
          ?? "Unable to update the referral.",
          "error"
        );

      } finally {
        select.disabled = false;
      }
    }
  );

  return select;
}


function createReferralRow(
  referral
) {
  const row =
    document.createElement("tr");

  const dateCell =
    document.createElement("td");

  dateCell.textContent =
    formatPartnerDate(
      referral.created_at
    );

  const clientCell =
    document.createElement("td");

  const clientLink =
    document.createElement("a");

  clientLink.className =
    "partner-contact-link";

  clientLink.href =
    (
      "client_details.html?id="
      + encodeURIComponent(
          referral.client_id
        )
    );

  clientLink.textContent =
    referral.client_name;

  clientCell.appendChild(
    clientLink
  );

  const partnerCell =
    document.createElement("td");

  partnerCell.textContent =
    referral.partner_name;

  const scoreCell =
    document.createElement("td");

  scoreCell.textContent =
    referral.match_score
      === null ||
    referral.match_score
      === undefined
      ? "—"
      : `${referral.match_score}%`;

  const statusCell =
    document.createElement("td");

  statusCell.appendChild(
    createReferralStatusSelect(
      referral
    )
  );

  const notesCell =
    document.createElement("td");

  notesCell.className =
    "partner-referral-notes";

  notesCell.textContent =
    referral.notes
    ?? referral.reasons?.[0]
    ?? "No notes";

  row.append(
    dateCell,
    clientCell,
    partnerCell,
    scoreCell,
    statusCell,
    notesCell
  );

  return row;
}


function renderReferralHistory() {
  const tableBody =
    partnerElement(
      "referralTableBody"
    );

  tableBody.replaceChildren();

  if (!referralHistoryData.length) {
    const row =
      document.createElement("tr");

    const cell =
      document.createElement("td");

    cell.colSpan = 6;

    cell.textContent =
      "No referrals have been created yet.";

    row.appendChild(cell);
    tableBody.appendChild(row);

    return;
  }

  referralHistoryData.forEach(
    referral => {
      tableBody.appendChild(
        createReferralRow(
          referral
        )
      );
    }
  );
}


async function loadPartnerData() {
  showPartnerPageMessage(
    "Loading partner workspace...",
    "info"
  );

  try {
    const [
      partners,
      clients,
      referrals
    ] = await Promise.all([
      apiGetPartners(),
      apiGetClients(),
      apiGetReferrals()
    ]);

    partnerDirectoryData =
      partners;

    partnerClientData =
      clients;

    referralHistoryData =
      referrals;

    sortPartnerDirectory();
    refreshPartnerSpecialtyFilter();
    renderPartnerDirectory();
    loadMatchingClients();
    renderReferralHistory();
    renderPartnerKpis();

    showPartnerPageMessage("");

  } catch (error) {
    showPartnerPageMessage(
      error.message
      ?? "Unable to load the partner workspace.",
      "error"
    );
  }
}


function initializePartnerPageEvents() {
  partnerElement(
    "openPartnerDialogButton"
  ).addEventListener(
    "click",
    openAddPartnerDialog
  );

  partnerElement(
    "closePartnerDialogButton"
  ).addEventListener(
    "click",
    closePartnerDialog
  );

  partnerElement(
    "cancelPartnerDialogButton"
  ).addEventListener(
    "click",
    closePartnerDialog
  );

  partnerElement(
    "partnerForm"
  ).addEventListener(
    "submit",
    handlePartnerFormSubmit
  );

  partnerElement(
    "partnerDialog"
  ).addEventListener(
    "click",
    event => {
      if (
        event.target
        === event.currentTarget
      ) {
        closePartnerDialog();
      }
    }
  );

  partnerElement(
    "partnerSearch"
  ).addEventListener(
    "input",
    renderPartnerDirectory
  );

  partnerElement(
    "partnerSpecialtyFilter"
  ).addEventListener(
    "change",
    renderPartnerDirectory
  );

  partnerElement(
    "partnerStatusFilter"
  ).addEventListener(
    "change",
    renderPartnerDirectory
  );

  partnerElement(
    "clearPartnerFiltersButton"
  ).addEventListener(
    "click",
    () => {
      partnerElement(
        "partnerSearch"
      ).value = "";

      partnerElement(
        "partnerSpecialtyFilter"
      ).value = "all";

      partnerElement(
        "partnerStatusFilter"
      ).value = "all";

      renderPartnerDirectory();
    }
  );

  partnerElement(
    "generatePartnerMatchButton"
  ).addEventListener(
    "click",
    generatePartnerMatch
  );

  partnerElement(
    "matchingClient"
  ).addEventListener(
    "change",
    resetPartnerMatchResult
  );
}


document.addEventListener(
  "DOMContentLoaded",
  async () => {
    const user =
      await window.authReady;

    if (!user) {
      return;
    }

    initializePartnerPageEvents();
    resetPartnerMatchResult();

    await loadPartnerData();
  }
);