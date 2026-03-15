
const authSection = document.getElementById("authSection");
const dashboardSection = document.getElementById("dashboardSection");
const landingPanel = document.getElementById("landingPanel");
const mfaSetupCard = document.getElementById("mfaSetupCard");
const mfaQr = document.getElementById("mfaQr");
const mfaManualKey = document.getElementById("mfaManualKey");
const sessionInfo = document.getElementById("sessionInfo");
const toast = document.getElementById("toast");
const reportRange = document.getElementById("reportRange");

const kpiTotal = document.getElementById("kpiTotal");
const kpiAlta = document.getElementById("kpiAlta");
const kpiDias = document.getElementById("kpiDias");
const dateSummary = document.getElementById("dateSummary");
const reportBody = document.getElementById("reportBody");
const reportPrev = document.getElementById("reportPrev");
const reportNext = document.getElementById("reportNext");
const reportPageInfo = document.getElementById("reportPageInfo");

const trendByDate = document.getElementById("trendByDate");
const trendPriority = document.getElementById("trendPriority");
const trendTopUsers = document.getElementById("trendTopUsers");

const encargadoInput = document.getElementById("encargado");
const fechaInput = document.getElementById("fecha");
const fromDateInput = document.getElementById("fromDate");
const toDateInput = document.getElementById("toDate");
const searchTextInput = document.getElementById("searchText");
const priorityFilterInput = document.getElementById("priorityFilter");
const userFilterInput = document.getElementById("userFilter");
const pageSizeInput = document.getElementById("pageSize");

const eventTemplateSelect = document.getElementById("eventTemplateSelect");

const loginForm = document.getElementById("loginForm");
const mfaEnableForm = document.getElementById("mfaEnableForm");
const eventForm = document.getElementById("eventForm");
const filterForm = document.getElementById("filterForm");
const logoutBtn = document.getElementById("logoutBtn");
const registerForm = document.getElementById("registerForm");
const loginCard = document.getElementById("loginCard");
const registerCard = document.getElementById("registerCard");
const authLoginTab = document.getElementById("authLoginTab");
const authRegisterTab = document.getElementById("authRegisterTab");
const switchToRegisterBtn = document.getElementById("switchToRegisterBtn");
const switchToLoginBtn = document.getElementById("switchToLoginBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const adminTools = document.getElementById("adminTools");
const adminPasswordForm = document.getElementById("adminPasswordForm");
const adminUserSelect = document.getElementById("adminUserSelect");
const adminNewPassword = document.getElementById("adminNewPassword");
const adminGeneratePassword = document.getElementById("adminGeneratePassword");
const adminUnlockUser = document.getElementById("adminUnlockUser");
const adminDeleteUser = document.getElementById("adminDeleteUser");
const adminSelfPasswordForm = document.getElementById("adminSelfPasswordForm");
const adminCurrentPassword = document.getElementById("adminCurrentPassword");
const adminSelfNewPassword = document.getElementById("adminSelfNewPassword");
const adminSelfNewPasswordConfirm = document.getElementById("adminSelfNewPasswordConfirm");

const templateTools = document.getElementById("templateTools");
const templateForm = document.getElementById("templateForm");
const templateNameInput = document.getElementById("templateName");
const templateGroupInput = document.getElementById("templateGroup");
const templateDescripcionInput = document.getElementById("templateDescripcion");
const templateObservacionInput = document.getElementById("templateObservacion");
const templatePrioridadInput = document.getElementById("templatePrioridad");
const templateList = document.getElementById("templateList");

const selectedEventLabel = document.getElementById("selectedEventLabel");
const attachmentForm = document.getElementById("attachmentForm");
const attachmentEventId = document.getElementById("attachmentEventId");
const attachmentFileInput = document.getElementById("attachmentFile");
const attachmentList = document.getElementById("attachmentList");

const exportButtons = document.querySelectorAll(".export-btn");
const openReportBtn = document.getElementById("openReportBtn");
const authLaunchButtons = document.querySelectorAll(".auth-launch");

const ERROR_MESSAGES = {
  unauthorized: "Acceso no autorizado. Inicia sesion.",
  invalid_token: "Sesion invalida. Inicia sesion nuevamente.",
  session_revoked: "La sesion fue revocada. Inicia sesion otra vez.",
  invalid_credentials: "Correo o contrasena incorrectos.",
  account_locked: "Cuenta bloqueada temporalmente por seguridad.",
  mfa_token_required: "Debes ingresar el codigo MFA.",
  invalid_mfa_token: "Codigo MFA invalido.",
  invalid_mfa_setup: "MFA no esta configurado correctamente para este usuario.",
  invalid_token_purpose: "Token no valido para esta operacion.",
  mfa_setup_not_started: "Primero debes iniciar la configuracion MFA.",
  mfa_setup_required: "Configura MFA para completar el acceso.",
  weak_password: "La contrasena no cumple la politica de seguridad.",
  registration_disabled: "El registro publico esta deshabilitado.",
  email_already_exists: "Ese correo ya esta registrado.",
  validation_error: "Hay campos invalidos en el formulario.",
  forbidden: "No tienes permisos para esta accion.",
  user_not_found: "No se encontro el usuario.",
  invalid_user_id: "ID de usuario invalido.",
  template_not_found: "No se encontro la plantilla.",
  template_name_exists: "Ya existe una plantilla con ese nombre.",
  event_not_found: "No se encontro el registro.",
  attachment_not_found: "No se encontro el adjunto.",
  file_required: "Selecciona un archivo para subir.",
  file_too_large: "El archivo supera el tamano permitido.",
  invalid_file_type: "Tipo de archivo no permitido.",
  past_date_not_allowed: "No se permite registrar bitacoras en fechas anteriores.",
  cannot_delete_current_user: "No puedes eliminar tu propio usuario.",
  last_admin_not_allowed: "No puedes eliminar el ultimo admin del sistema.",
  invalid_current_password: "La contrasena actual es incorrecta.",
  refresh_token_required: "Sesion no disponible. Inicia sesion de nuevo.",
  invalid_refresh_token: "Sesion invalida. Inicia sesion otra vez.",
  refresh_token_expired: "Tu sesion expiro. Inicia sesion nuevamente."
};

const state = {
  setupToken: null,
  user: null,
  users: [],
  templates: [],
  report: {
    page: 1,
    pageSize: 20,
    totalPages: 1
  },
  selectedEventId: null,
  selectedEventOwnerId: null,
  eventOwners: {},
  authView: "login",
  authPopup: false,
  pendingRefresh: null
};

function toLocalISODate(date = new Date()) {
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function setDateDefaults() {
  const today = toLocalISODate();
  const weekAgo = toLocalISODate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  fechaInput.value = today;
  fromDateInput.value = weekAgo;
  toDateInput.value = today;
  syncDateConstraints();
}

function syncDateConstraints() {
  const today = toLocalISODate();
  fromDateInput.max = toDateInput.value || "";
  toDateInput.min = fromDateInput.value || "";
  fechaInput.min = today;
  if (fechaInput.value && fechaInput.value < today) {
    fechaInput.value = today;
  }
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveErrorMessage(errorCode, details) {
  if (!errorCode) {
    return "No se pudo completar la operacion.";
  }
  if (errorCode === "weak_password" && Array.isArray(details)) {
    return `Contrasena invalida: ${details.join(", ")}`;
  }
  return ERROR_MESSAGES[errorCode] || errorCode;
}

function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 4200);
}

function setButtonBusy(button, isBusy, busyLabel) {
  if (!button) {
    return;
  }

  if (isBusy) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }
    button.disabled = true;
    if (busyLabel) {
      button.textContent = busyLabel;
    }
    return;
  }

  button.disabled = false;
  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

function isAdminSession() {
  return state.user?.role === "admin";
}

function canManageTemplates() {
  return state.user?.role === "admin" || state.user?.role === "supervisor";
}

function canFilterByUser() {
  return state.user?.role === "admin" || state.user?.role === "supervisor";
}

function setAuthView(view) {
  const normalizedView = view === "register" ? "register" : "login";
  state.authView = normalizedView;

  loginCard.classList.toggle("hidden", normalizedView !== "login");
  registerCard.classList.toggle("hidden", normalizedView !== "register");
  authLoginTab.classList.toggle("is-active", normalizedView === "login");
  authRegisterTab.classList.toggle("is-active", normalizedView === "register");
}

function getRequestedAuthView() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("auth");
  if (requested === "register") {
    return "register";
  }
  return "login";
}

function getAuthPopupMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("authPopup") === "1";
}

function applyLayoutMode(mode) {
  document.body.classList.remove("session-active", "landing-mode", "auth-popup-mode");
  if (mode) {
    document.body.classList.add(mode);
  }
}

function openAuthPopup(view) {
  const normalizedView = view === "register" ? "register" : "login";
  const width = 760;
  const height = 780;
  const left = Math.max(0, Math.round((window.screen.width - width) / 2));
  const top = Math.max(0, Math.round((window.screen.height - height) / 2));
  const popup = window.open(
    `/?auth=${normalizedView}&authPopup=1`,
    `bitacora-auth-${normalizedView}`,
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`
  );

  if (popup) {
    popup.focus();
    return true;
  }

  return false;
}

function canUploadToEvent(eventOwnerId) {
  if (!state.user || !eventOwnerId) {
    return false;
  }

  if (isAdminSession()) {
    return true;
  }

  return String(eventOwnerId) === String(state.user.id);
}

function refreshAttachmentUploadState() {
  const submitButton = attachmentForm.querySelector('button[type="submit"]');
  const hasSelection = Boolean(state.selectedEventId);
  const ownerId = state.selectedEventOwnerId || state.eventOwners[String(state.selectedEventId)];
  const canUpload = hasSelection && canUploadToEvent(ownerId);

  attachmentFileInput.disabled = !canUpload;

  if (submitButton) {
    submitButton.disabled = !canUpload;
  }

  if (!hasSelection) {
    selectedEventLabel.textContent = "Selecciona un registro para ver o subir adjuntos.";
    return;
  }

  if (canUpload) {
    selectedEventLabel.textContent = `Registro #${state.selectedEventId}`;
    return;
  }

  selectedEventLabel.textContent =
    `Registro #${state.selectedEventId} en modo lectura. Solo admin o dueno puede subir adjuntos.`;
}

function clearSession() {
  state.user = null;
  state.users = [];
  state.templates = [];
  state.setupToken = null;
  state.report = {
    page: 1,
    pageSize: Number(pageSizeInput.value || 20),
    totalPages: 1
  };
  state.selectedEventId = null;
  state.selectedEventOwnerId = null;
  state.eventOwners = {};
  state.authView = getRequestedAuthView();
  state.authPopup = getAuthPopupMode();

  setKpi({});
  dateSummary.innerHTML = "";
  reportBody.innerHTML = "";
  trendByDate.innerHTML = "";
  trendPriority.innerHTML = "";
  trendTopUsers.innerHTML = "";
  templateList.innerHTML = "";
  attachmentList.innerHTML = "";
  attachmentEventId.value = "";
  attachmentFileInput.value = "";
  loginForm.reset();
  registerForm.reset();
  mfaEnableForm.reset();
  eventForm.reset();
  attachmentForm.reset();
  refreshAttachmentUploadState();
}

function setKpi(report) {
  const total = Number(report.totalEvents || 0);
  const alta = (report.events || []).filter((item) => item.prioridad === "alta").length;
  const dias = (report.byDate || []).length;

  kpiTotal.textContent = String(total);
  kpiAlta.textContent = String(alta);
  kpiDias.textContent = String(dias);
}

function renderSummaryChips(report) {
  dateSummary.innerHTML = "";
  const items = Array.isArray(report.byDate) ? report.byDate : [];

  if (items.length === 0) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = "Sin registros en el rango";
    dateSummary.appendChild(chip);
    return;
  }

  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${formatDate(item.fecha)}: ${item.total} registro(s)`;
    dateSummary.appendChild(chip);
  });
}

function renderPagination(pagination) {
  const page = Number(pagination?.page || 1);
  const totalPages = Number(pagination?.totalPages || 1);
  state.report.page = page;
  state.report.totalPages = totalPages;

  reportPageInfo.textContent = `Pagina ${page} de ${totalPages}`;
  reportPrev.disabled = page <= 1;
  reportNext.disabled = page >= totalPages;
}

function renderReportRows(report) {
  reportBody.innerHTML = "";
  const rows = Array.isArray(report.events) ? report.events : [];
  state.eventOwners = {};

  if (rows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.textContent = "No hay datos para el rango seleccionado.";
    row.appendChild(cell);
    reportBody.appendChild(row);
    return;
  }

  rows.forEach((item) => {
    const row = document.createElement("tr");

    const tdFecha = document.createElement("td");
    tdFecha.textContent = formatDate(item.fecha);

    const tdEncargado = document.createElement("td");
    tdEncargado.textContent = item.encargado || "-";

    const tdActividad = document.createElement("td");
    tdActividad.textContent = item.descripcionActividad || "-";

    const tdObservacion = document.createElement("td");
    tdObservacion.textContent = item.observacion || "-";

    const tdPrioridad = document.createElement("td");
    const priorityTag = document.createElement("span");
    const normalizedPriority = ["baja", "media", "alta"].includes(item.prioridad)
      ? item.prioridad
      : "media";
    priorityTag.className = `priority priority-${normalizedPriority}`;
    priorityTag.textContent =
      normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1);
    tdPrioridad.appendChild(priorityTag);

    const tdTemplate = document.createElement("td");
    tdTemplate.textContent = item.templateName || "-";

    const tdAttachments = document.createElement("td");
    const attachmentButton = document.createElement("button");
    attachmentButton.type = "button";
    attachmentButton.className = "btn-link attachment-open";
    attachmentButton.dataset.eventId = String(item.id);
    attachmentButton.dataset.ownerId = String(item.encargadoId || "");
    attachmentButton.textContent = `Adjuntos (${item.attachmentsCount || 0})`;
    tdAttachments.appendChild(attachmentButton);

    const tdActions = document.createElement("td");
    const actionWrap = document.createElement("div");
    actionWrap.className = "row-actions";

    if (canModifyEvent(item.encargadoId)) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "btn btn-ghost event-edit";
      editButton.dataset.eventId = String(item.id);
      editButton.dataset.ownerId = String(item.encargadoId || "");
      editButton.dataset.eventPayload = JSON.stringify({
        fecha: item.fecha,
        descripcionActividad: item.descripcionActividad || "",
        observacion: item.observacion || "",
        prioridad: item.prioridad || "media",
        templateId: item.templateId ?? null
      });
      editButton.textContent = "Editar";

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn btn-ghost event-delete";
      deleteButton.dataset.eventId = String(item.id);
      deleteButton.dataset.ownerId = String(item.encargadoId || "");
      deleteButton.textContent = "Eliminar";

      actionWrap.appendChild(editButton);
      actionWrap.appendChild(deleteButton);
    } else {
      const readOnlyTag = document.createElement("span");
      readOnlyTag.className = "help-text";
      readOnlyTag.textContent = "Solo lectura";
      actionWrap.appendChild(readOnlyTag);
    }

    tdActions.appendChild(actionWrap);

    state.eventOwners[String(item.id)] = Number(item.encargadoId || 0) || null;

    row.appendChild(tdFecha);
    row.appendChild(tdEncargado);
    row.appendChild(tdActividad);
    row.appendChild(tdObservacion);
    row.appendChild(tdPrioridad);
    row.appendChild(tdTemplate);
    row.appendChild(tdAttachments);
    row.appendChild(tdActions);
    reportBody.appendChild(row);
  });
}
function renderBars(container, rows, valueField, labelField) {
  container.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "help-text";
    empty.textContent = "Sin datos en el rango.";
    container.appendChild(empty);
    return;
  }

  const max = Math.max(...rows.map((item) => Number(item[valueField] || 0)), 1);

  rows.forEach((item) => {
    const value = Number(item[valueField] || 0);
    const label = item[labelField];

    const wrap = document.createElement("div");
    wrap.className = "bar-item";

    const meta = document.createElement("div");
    meta.className = "bar-meta";
    meta.innerHTML = `<span>${label}</span><span>${value}</span>`;

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.max((value / max) * 100, 4)}%`;

    track.appendChild(fill);
    wrap.appendChild(meta);
    wrap.appendChild(track);
    container.appendChild(wrap);
  });
}

function renderTrends(data) {
  renderBars(trendByDate, data.byDate || [], "total", "fecha");
  renderBars(trendTopUsers, data.topEncargados || [], "total", "encargado");

  trendPriority.innerHTML = "";
  const priorities = data.byPriority || [];
  if (!priorities.length) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = "Sin datos";
    trendPriority.appendChild(chip);
    return;
  }

  priorities.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${item.prioridad}: ${item.total}`;
    trendPriority.appendChild(chip);
  });
}

function renderUsersOptions() {
  adminUserSelect.innerHTML = "";
  userFilterInput.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "Todos";
  userFilterInput.appendChild(allOption);

  if (state.users.length === 0) {
    const emptyAdminOption = document.createElement("option");
    emptyAdminOption.value = "";
    emptyAdminOption.textContent = "No hay usuarios";
    adminUserSelect.appendChild(emptyAdminOption);
    return;
  }

  state.users.forEach((user) => {
    const userText = `${user.name} (${user.email})`;

    const adminOption = document.createElement("option");
    adminOption.value = String(user.id);
    adminOption.textContent = userText;
    adminUserSelect.appendChild(adminOption);

    const filterOption = document.createElement("option");
    filterOption.value = String(user.id);
    filterOption.textContent = userText;
    userFilterInput.appendChild(filterOption);
  });
}

function renderTemplates() {
  eventTemplateSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Sin plantilla";
  eventTemplateSelect.appendChild(defaultOption);

  state.templates
    .filter((template) => template.isActive)
    .forEach((template) => {
      const option = document.createElement("option");
      option.value = String(template.id);
      option.textContent = `${template.name} (${template.prioridadDefault})`;
      eventTemplateSelect.appendChild(option);
    });

  templateList.innerHTML = "";
  if (!state.templates.length) {
    const empty = document.createElement("p");
    empty.className = "help-text";
    empty.textContent = "No hay plantillas registradas.";
    templateList.appendChild(empty);
    return;
  }

  state.templates.forEach((template) => {
    const item = document.createElement("article");
    item.className = "template-item";

    const header = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = `${template.name} (${template.prioridadDefault})`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-ghost";
    button.dataset.templateId = String(template.id);
    button.dataset.templateActive = String(template.isActive);
    button.textContent = template.isActive ? "Desactivar" : "Activar";

    header.appendChild(title);
    header.appendChild(button);

    const desc = document.createElement("p");
    desc.textContent = `Actividad: ${template.descripcionBase}`;

    const obs = document.createElement("p");
    obs.textContent = `Observacion: ${template.observacionBase}`;

    item.appendChild(header);
    item.appendChild(desc);
    item.appendChild(obs);
    templateList.appendChild(item);
  });
}

function renderAttachments(items) {
  attachmentList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "help-text";
    empty.textContent = "Este registro no tiene adjuntos.";
    attachmentList.appendChild(empty);
    return;
  }

  items.forEach((file) => {
    const item = document.createElement("article");
    item.className = "attachment-item";

    const meta = document.createElement("div");
    const name = document.createElement("p");
    name.textContent = file.originalName;
    const details = document.createElement("p");
    details.className = "help-text";
    details.textContent = `${formatBytes(file.sizeBytes)} | ${formatDate(file.createdAt?.slice(0, 10))}`;
    meta.appendChild(name);
    meta.appendChild(details);

    const link = document.createElement("a");
    link.href = `/events/attachments/${file.id}/download`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Descargar";

    item.appendChild(meta);
    item.appendChild(link);
    attachmentList.appendChild(item);
  });
}

function renderAuthView() {
  if (state.authPopup) {
    applyLayoutMode("auth-popup-mode");
    authSection.classList.remove("hidden");
    landingPanel.classList.add("hidden");
  } else {
    applyLayoutMode("landing-mode");
    authSection.classList.add("hidden");
    landingPanel.classList.remove("hidden");
  }

  dashboardSection.classList.add("hidden");
  mfaSetupCard.classList.add("hidden");
  setAuthView(state.authView);
}

function renderDashboardView() {
  applyLayoutMode("session-active");
  authSection.classList.add("hidden");
  landingPanel.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  eventForm.reset();
  setDateDefaults();

  const roleLabel = {
    admin: "Administrador",
    supervisor: "Supervisor",
    funcionario: "Funcionario"
  }[state.user.role] || state.user.role;

  sessionInfo.textContent = `${state.user.name} | ${roleLabel}`;
  encargadoInput.value = state.user.name;

  if (isAdminSession()) {
    adminTools.classList.remove("hidden");
  } else {
    adminTools.classList.add("hidden");
  }

  if (canManageTemplates()) {
    templateTools.classList.remove("hidden");
  } else {
    templateTools.classList.add("hidden");
  }

  userFilterInput.disabled = !canFilterByUser();
  refreshAttachmentUploadState();
}

function buildReportParams(includePagination = true) {
  const params = new URLSearchParams({
    from: fromDateInput.value,
    to: toDateInput.value
  });

  if (searchTextInput.value.trim()) {
    params.set("q", searchTextInput.value.trim());
  }

  if (priorityFilterInput.value) {
    params.set("priority", priorityFilterInput.value);
  }

  if (canFilterByUser() && userFilterInput.value) {
    params.set("encargadoId", userFilterInput.value);
  }

  if (includePagination) {
    params.set("page", String(state.report.page));
    params.set("pageSize", String(state.report.pageSize));
  }

  return params;
}

function canModifyEvent(eventOwnerId) {
  if (!state.user || !eventOwnerId) {
    return false;
  }

  if (isAdminSession()) {
    return true;
  }

  return String(eventOwnerId) === String(state.user.id);
}

function openReportWindow() {
  const params = buildReportParams(false);
  params.set("page", "1");
  params.set("pageSize", String(Math.max(Number(pageSizeInput.value || 20), 100)));
  const width = 1400;
  const height = 860;
  const left = Math.max(0, Math.round((window.screen.width - width) / 2));
  const top = Math.max(0, Math.round((window.screen.height - height) / 2));
  const popup = window.open(
    `/report-view.html?${params.toString()}`,
    "bitacora-report-view",
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`
  );

  if (popup) {
    popup.focus();
  }

  return Boolean(popup);
}

function parseContentDispositionFileName(headerValue) {
  if (!headerValue) {
    return null;
  }
  const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }
  const match = headerValue.match(/filename="?([^";]+)"?/i);
  return match?.[1] || null;
}

async function api(path, options = {}) {
  const requestOptions = {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(path, requestOptions);
    let data = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    }
    return { response, data, networkError: false };
  } catch (_error) {
    return { response: null, data: null, networkError: true };
  }
}

async function refreshSession() {
  if (!state.pendingRefresh) {
    state.pendingRefresh = api("/auth/refresh", {
      method: "POST"
    }).finally(() => {
      state.pendingRefresh = null;
    });
  }

  const result = await state.pendingRefresh;
  return result.response?.ok;
}

async function apiAuth(path, options = {}, allowRetry = true) {
  const firstTry = await api(path, options);
  if (firstTry.networkError || !firstTry.response || firstTry.response.status !== 401 || !allowRetry) {
    return firstTry;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    return firstTry;
  }

  return api(path, options);
}

function handleUnauthorized(shouldNotify = true) {
  clearSession();
  renderAuthView();
  if (shouldNotify) {
    showToast("Sesion expirada. Inicia sesion nuevamente.", "error");
  }
}

async function loadUsers() {
  if (!canFilterByUser()) {
    return;
  }

  const { response, data, networkError } = await apiAuth("/users");
  if (networkError) {
    showToast("No hay conexion para cargar usuarios.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  state.users = Array.isArray(data) ? data : [];
  renderUsersOptions();
}

async function loadTemplates() {
  const { response, data, networkError } = await apiAuth("/templates");

  if (networkError) {
    showToast("No hay conexion para cargar plantillas.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  state.templates = Array.isArray(data) ? data : [];
  renderTemplates();
}

async function loadReport() {
  const from = fromDateInput.value;
  const to = toDateInput.value;

  if (!from || !to) {
    showToast("Debes seleccionar un rango de fechas.", "error");
    return;
  }

  if (from > to) {
    showToast("La fecha inicial no puede ser mayor a la fecha final.", "error");
    return;
  }

  state.report.pageSize = Number(pageSizeInput.value || 20);
  const params = buildReportParams(true);

  reportRange.textContent = `Rango: ${formatDate(from)} - ${formatDate(to)}`;

  const { response, data, networkError } = await apiAuth(`/events/report?${params.toString()}`);

  if (networkError) {
    showToast("No hay conexion con el servidor.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  setKpi(data);
  renderSummaryChips(data);
  renderReportRows(data);
  renderPagination(data.pagination);
}

async function loadTrends() {
  const params = new URLSearchParams({
    from: fromDateInput.value,
    to: toDateInput.value
  });

  const { response, data, networkError } = await apiAuth(`/events/trends?${params.toString()}`);

  if (networkError) {
    showToast("No hay conexion para cargar tendencias.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  renderTrends(data);
}

async function loadAttachments(eventId, eventOwnerId = null) {
  state.selectedEventId = Number(eventId);
  const ownerIdFromState = state.eventOwners[String(eventId)];
  const parsedOwnerId = Number(eventOwnerId || ownerIdFromState || 0);
  state.selectedEventOwnerId = Number.isFinite(parsedOwnerId) && parsedOwnerId > 0 ? parsedOwnerId : null;
  attachmentEventId.value = String(eventId);
  refreshAttachmentUploadState();

  const { response, data, networkError } = await apiAuth(`/events/${eventId}/attachments`);

  if (networkError) {
    showToast("No hay conexion para cargar adjuntos.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  renderAttachments(Array.isArray(data) ? data : []);
}

async function loadCurrentSession() {
  const { response, data, networkError } = await apiAuth("/auth/me");

  if (networkError) {
    showToast("No hay conexion con el servidor.", "error");
    return false;
  }

  if (!response.ok) {
    return false;
  }

  state.user = data;
  return true;
}

async function loadDashboardData() {
  await loadUsers();
  await loadTemplates();
  await loadReport();
  await loadTrends();
}
async function handleLogin(event) {
  event.preventDefault();
  const submitButton = event.submitter || loginForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Validando...");

  const payload = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    mfaToken: document.getElementById("mfaToken").value.trim() || undefined
  };

  const { response, data, networkError } = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast("No hay conexion con el servidor.", "error");
    return;
  }

  if (response.ok) {
    state.user = data?.user || null;
    if (!state.user) {
      const sessionLoaded = await loadCurrentSession();
      if (!sessionLoaded) {
        showToast("No se pudo recuperar la sesion.", "error");
        return;
      }
    }

    if (state.authPopup) {
      if (window.opener && !window.opener.closed) {
        window.opener.location.reload();
      }
      window.close();
      window.location.href = "/";
      return;
    }

    renderDashboardView();
    await loadDashboardData();
    showToast("Sesion iniciada.", "success");
    return;
  }

  if (response.status === 403 && data?.error === "mfa_setup_required") {
    state.setupToken = data.setupToken;
    setAuthView("login");
    mfaSetupCard.classList.remove("hidden");
    await loadMfaSetup();
    showToast("Configura MFA para completar el acceso.", "info");
    return;
  }

  if (response.status === 423) {
    showToast(`Cuenta bloqueada hasta ${data?.lockedUntil || "nuevo aviso"}.`, "error");
    return;
  }

  showToast(resolveErrorMessage(data?.error, data?.details), "error");
}

async function loadMfaSetup() {
  if (!state.setupToken) {
    return;
  }

  const { response, data, networkError } = await api("/auth/mfa/setup", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${state.setupToken}`
    }
  });

  if (networkError) {
    showToast("No hay conexion para generar el QR MFA.", "error");
    return;
  }

  if (!response.ok) {
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  mfaQr.src = data.qrDataUrl;
  mfaManualKey.textContent = data.manualKey;
}

async function handleMfaEnable(event) {
  event.preventDefault();
  const submitButton = event.submitter || mfaEnableForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Verificando...");

  const token = document.getElementById("mfaEnableToken").value.trim();
  const { response, data, networkError } = await api("/auth/mfa/enable", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.setupToken}`
    },
    body: JSON.stringify({ token })
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast("No hay conexion para activar MFA.", "error");
    return;
  }

  if (!response.ok) {
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  state.setupToken = null;
  mfaSetupCard.classList.add("hidden");
  mfaEnableForm.reset();
  state.user = data?.user || null;

  if (!state.user) {
    const sessionLoaded = await loadCurrentSession();
    if (!sessionLoaded) {
      showToast("No se pudo recuperar la sesion.", "error");
      return;
    }
  }

  if (state.authPopup) {
    if (window.opener && !window.opener.closed) {
      window.opener.location.reload();
    }
    window.close();
    window.location.href = "/";
    return;
  }

  renderDashboardView();
  await loadDashboardData();
  showToast("MFA habilitado y sesion iniciada.", "success");
}

async function handleRegister(event) {
  event.preventDefault();
  const submitButton = event.submitter || registerForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Creando...");

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const passwordConfirm = document.getElementById("registerPasswordConfirm").value;

  if (password !== passwordConfirm) {
    setButtonBusy(submitButton, false);
    showToast("Las contrasenas no coinciden.", "error");
    return;
  }

  const { response, data, networkError } = await api("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast("No hay conexion para registrar el usuario.", "error");
    return;
  }

  if (!response.ok) {
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  registerForm.reset();

  if (data?.setupRequired && data?.setupToken) {
    state.setupToken = data.setupToken;
    state.authView = "login";
    setAuthView("login");
    mfaSetupCard.classList.remove("hidden");
    await loadMfaSetup();
    showToast("Cuenta creada. Configura MFA para activar el acceso.", "info");
    return;
  }

  state.user = data?.user || null;
  if (state.user) {
    if (state.authPopup) {
      if (window.opener && !window.opener.closed) {
        window.opener.location.reload();
      }
      window.close();
      window.location.href = "/";
      return;
    }

    renderDashboardView();
    await loadDashboardData();
    showToast("Cuenta creada y sesion iniciada.", "success");
    return;
  }

  showToast("Cuenta creada. Inicia sesion para continuar.", "success");
}

async function handleCreateEvent(event) {
  event.preventDefault();
  const submitButton = event.submitter || eventForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Guardando...");

  const payload = {
    fecha: fechaInput.value,
    descripcionActividad: document.getElementById("descripcionActividad").value.trim(),
    observacion: document.getElementById("observacion").value.trim(),
    prioridad: document.getElementById("prioridad").value,
    templateId: eventTemplateSelect.value ? Number(eventTemplateSelect.value) : undefined
  };

  const { response, data, networkError } = await apiAuth("/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast("No hay conexion para guardar el registro.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  document.getElementById("descripcionActividad").value = "";
  document.getElementById("observacion").value = "";
  eventTemplateSelect.value = "";
  if (!fromDateInput.value || payload.fecha < fromDateInput.value) {
    fromDateInput.value = payload.fecha;
  }
  if (!toDateInput.value || payload.fecha > toDateInput.value) {
    toDateInput.value = payload.fecha;
  }
  syncDateConstraints();
  showToast("Registro guardado en bitacora.", "success");
  await loadReport();
  await loadTrends();
}

async function handleAttachmentSubmit(event) {
  event.preventDefault();
  const submitButton = event.submitter || attachmentForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Subiendo...");

  const eventId = Number(attachmentEventId.value);
  const file = attachmentFileInput.files?.[0];
  const ownerId = state.selectedEventOwnerId || state.eventOwners[String(eventId)];

  if (!eventId) {
    setButtonBusy(submitButton, false);
    showToast("Selecciona un registro en la tabla para adjuntar.", "error");
    return;
  }

  if (!canUploadToEvent(ownerId)) {
    setButtonBusy(submitButton, false);
    showToast("Solo admin o dueno del registro puede subir adjuntos.", "error");
    return;
  }

  if (!file) {
    setButtonBusy(submitButton, false);
    showToast("Debes seleccionar un archivo.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  let uploadResponse = await fetch(`/events/${eventId}/attachments`, {
    method: "POST",
    body: formData,
    credentials: "same-origin"
  });

  if (uploadResponse.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      uploadResponse = await fetch(`/events/${eventId}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "same-origin"
      });
    }
  }

  setButtonBusy(submitButton, false);

  let data = null;
  const contentType = uploadResponse.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await uploadResponse.json();
  }

  if (!uploadResponse.ok) {
    if (uploadResponse.status === 401) {
      handleUnauthorized();
      return;
    }

    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  attachmentFileInput.value = "";
  showToast("Adjunto cargado correctamente.", "success");
  await loadAttachments(eventId);
  await loadReport();
}

async function handleEventEdit(button) {
  const eventId = Number(button.dataset.eventId || 0);
  const ownerId = Number(button.dataset.ownerId || 0);

  if (!eventId || !canModifyEvent(ownerId)) {
    showToast("No tienes permisos para editar este registro.", "error");
    return;
  }

  let current = null;
  try {
    current = JSON.parse(button.dataset.eventPayload || "{}");
  } catch (_error) {
    current = null;
  }

  if (!current) {
    showToast("No se pudo cargar la informacion del registro.", "error");
    return;
  }

  const fecha = window.prompt("Fecha (YYYY-MM-DD)", current.fecha || toLocalISODate());
  if (fecha === null) {
    return;
  }

  const descripcionActividad = window.prompt(
    "Descripcion de actividad",
    current.descripcionActividad || ""
  );
  if (descripcionActividad === null) {
    return;
  }

  const observacion = window.prompt("Observacion", current.observacion || "");
  if (observacion === null) {
    return;
  }

  const prioridadRaw = window.prompt(
    "Prioridad (baja, media, alta)",
    String(current.prioridad || "media")
  );
  if (prioridadRaw === null) {
    return;
  }

  const prioridad = prioridadRaw.trim().toLowerCase();
  if (!["baja", "media", "alta"].includes(prioridad)) {
    showToast("Prioridad invalida. Usa baja, media o alta.", "error");
    return;
  }

  const payload = {
    fecha: fecha.trim(),
    descripcionActividad: descripcionActividad.trim(),
    observacion: observacion.trim(),
    prioridad
  };

  const { response, data, networkError } = await apiAuth(`/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (networkError) {
    showToast("No hay conexion para editar el registro.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  showToast("Registro actualizado correctamente.", "success");
  await loadReport();
  await loadTrends();
}

async function handleEventDelete(button) {
  const eventId = Number(button.dataset.eventId || 0);
  const ownerId = Number(button.dataset.ownerId || 0);

  if (!eventId || !canModifyEvent(ownerId)) {
    showToast("No tienes permisos para eliminar este registro.", "error");
    return;
  }

  if (!window.confirm(`Confirma eliminar el registro #${eventId}. Esta accion no se puede deshacer.`)) {
    return;
  }

  const { response, data, networkError } = await apiAuth(`/events/${eventId}`, {
    method: "DELETE"
  });

  if (networkError) {
    showToast("No hay conexion para eliminar el registro.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  if (String(state.selectedEventId) === String(eventId)) {
    state.selectedEventId = null;
    state.selectedEventOwnerId = null;
    attachmentList.innerHTML = "";
    attachmentEventId.value = "";
    refreshAttachmentUploadState();
  }

  showToast("Registro eliminado correctamente.", "success");
  await loadReport();
  await loadTrends();
}

async function handleAdminPasswordUpdate(event) {
  event.preventDefault();
  const submitButton =
    event.submitter || adminPasswordForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Actualizando...");

  if (!isAdminSession()) {
    setButtonBusy(submitButton, false);
    showToast("Operacion solo disponible para administradores.", "error");
    return;
  }

  const userId = adminUserSelect.value;
  const newPassword = adminNewPassword.value.trim();

  if (!userId) {
    setButtonBusy(submitButton, false);
    showToast("Selecciona un usuario.", "error");
    return;
  }

  const { response, data, networkError } = await apiAuth(`/users/${userId}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword })
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast("No hay conexion para actualizar la contrasena.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  adminNewPassword.value = "";
  showToast("Contrasena actualizada correctamente.", "success");
}

async function handleAdminUnlockUser() {
  if (!isAdminSession()) {
    showToast("Operacion solo disponible para administradores.", "error");
    return;
  }

  const userId = Number(adminUserSelect.value || 0);
  if (!userId) {
    showToast("Selecciona un usuario.", "error");
    return;
  }

  const { response, data, networkError } = await apiAuth(`/users/${userId}/unlock`, {
    method: "POST"
  });

  if (networkError) {
    showToast("No hay conexion para desbloquear usuario.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  showToast("Usuario desbloqueado correctamente.", "success");
}

async function handleAdminSelfPasswordUpdate(event) {
  event.preventDefault();
  const submitButton =
    event.submitter || adminSelfPasswordForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Actualizando...");

  if (!isAdminSession()) {
    setButtonBusy(submitButton, false);
    showToast("Operacion solo disponible para administradores.", "error");
    return;
  }

  const currentPassword = adminCurrentPassword.value;
  const newPassword = adminSelfNewPassword.value;
  const confirmPassword = adminSelfNewPasswordConfirm.value;

  if (newPassword !== confirmPassword) {
    setButtonBusy(submitButton, false);
    showToast("La nueva contrasena y su confirmacion no coinciden.", "error");
    return;
  }

  const { response, data, networkError } = await apiAuth("/users/me/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword })
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast("No hay conexion para cambiar tu contrasena.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  adminSelfPasswordForm.reset();
  await api("/auth/logout", { method: "POST" });
  clearSession();
  renderAuthView();
  setDateDefaults();
  showToast("Contrasena actualizada. Inicia sesion nuevamente.", "success");
}

async function handleAdminUserDelete() {
  if (!isAdminSession()) {
    showToast("Operacion solo disponible para administradores.", "error");
    return;
  }

  const userId = Number(adminUserSelect.value || 0);
  if (!userId) {
    showToast("Selecciona un usuario.", "error");
    return;
  }

  const selectedOption = adminUserSelect.options[adminUserSelect.selectedIndex];
  const label = selectedOption ? selectedOption.textContent : `ID ${userId}`;

  if (!window.confirm(`Confirma eliminar el usuario ${label}. Se borraran sus bitacoras y adjuntos.`)) {
    return;
  }

  const { response, data, networkError } = await apiAuth(`/users/${userId}`, {
    method: "DELETE"
  });

  if (networkError) {
    showToast("No hay conexion para eliminar usuario.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  showToast("Usuario eliminado correctamente.", "success");
  await loadUsers();
  await loadReport();
  await loadTrends();
}

async function handleTemplateCreate(event) {
  event.preventDefault();
  const submitButton = event.submitter || templateForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Guardando...");

  const templateName = templateNameInput.value.trim();
  const templateGroup = templateGroupInput.value.trim();
  const scopedName = templateGroup ? `${templateGroup} :: ${templateName}` : templateName;

  const payload = {
    name: scopedName,
    descripcionBase: templateDescripcionInput.value.trim(),
    observacionBase: templateObservacionInput.value.trim(),
    prioridadDefault: templatePrioridadInput.value
  };

  const { response, data, networkError } = await apiAuth("/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast("No hay conexion para crear la plantilla.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  templateForm.reset();
  showToast("Plantilla creada correctamente.", "success");
  await loadTemplates();
}

async function handleTemplateToggle(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.templateId) {
    return;
  }

  const templateId = target.dataset.templateId;
  const currentActive = target.dataset.templateActive === "true";

  const { response, data, networkError } = await apiAuth(`/templates/${templateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive: !currentActive })
  });

  if (networkError) {
    showToast("No hay conexion para actualizar plantilla.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  showToast("Estado de plantilla actualizado.", "success");
  await loadTemplates();
}

function handleTemplateSelectChange() {
  const selectedId = Number(eventTemplateSelect.value);
  if (!selectedId) {
    return;
  }

  const template = state.templates.find((item) => Number(item.id) === selectedId);
  if (!template) {
    return;
  }

  document.getElementById("descripcionActividad").value = template.descripcionBase || "";
  document.getElementById("observacion").value = template.observacionBase || "";
  document.getElementById("prioridad").value = template.prioridadDefault || "media";
}

async function handleExportClick(event) {
  const button = event.currentTarget;
  const format = button.dataset.format;
  setButtonBusy(button, true, "Exportando...");

  const params = buildReportParams(false);
  params.set("format", format);

  let response = await fetch(`/events/report/export?${params.toString()}`, {
    method: "GET",
    credentials: "same-origin"
  });

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await fetch(`/events/report/export?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin"
      });
    }
  }

  setButtonBusy(button, false);

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    let data = null;
    try {
      data = await response.json();
    } catch (_error) {
      data = null;
    }

    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  const blob = await response.blob();
  const header = response.headers.get("content-disposition");
  const fallbackName = `bitacora.${format}`;
  const fileName = parseContentDispositionFileName(header) || fallbackName;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showToast("Reporte exportado correctamente.", "success");
}

function generateStrongPassword(length = 20) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const special = "!@#$%^&*_-+=";
  const all = upper + lower + nums + special;

  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    special[Math.floor(Math.random() * special.length)]
  ];

  while (required.length < length) {
    required.push(all[Math.floor(Math.random() * all.length)]);
  }

  for (let i = required.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join("");
}

function handleGenerateAdminPassword() {
  adminNewPassword.value = generateStrongPassword();
  showToast("Contrasena fuerte generada.", "info");
}

async function handleLogout() {
  await api("/auth/logout", { method: "POST" });
  clearSession();
  loginForm.reset();
  registerForm.reset();
  mfaEnableForm.reset();
  eventForm.reset();
  renderAuthView();
  setDateDefaults();
  showToast("Sesion cerrada.", "info");
}

async function handleFilterSubmit(event) {
  event.preventDefault();
  state.report.page = 1;
  const opened = openReportWindow();
  if (!opened) {
    showToast("Tu navegador bloqueo la nueva ventana. Habilita popups para este sitio.", "error");
  }
  await loadReport();
  await loadTrends();
}

function handleOpenReportClick() {
  const opened = openReportWindow();
  if (!opened) {
    showToast("Tu navegador bloqueo la nueva ventana. Habilita popups para este sitio.", "error");
  }
}

function handleAuthLaunchClick(event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const requestedView = target.dataset.auth === "register" ? "register" : "login";
  const opened = openAuthPopup(requestedView);
  if (!opened) {
    showToast("Tu navegador bloqueo la ventana emergente de autenticacion.", "error");
    return;
  }

  event.preventDefault();
}

function handleAuthTabClick(event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.id === "authRegisterTab") {
    setAuthView("register");
    return;
  }

  setAuthView("login");
}

function handleSwitchToRegister() {
  setAuthView("register");
  const nameInput = document.getElementById("registerName");
  if (nameInput instanceof HTMLInputElement) {
    nameInput.focus();
  }
}

function handleSwitchToLogin() {
  setAuthView("login");
  const emailInput = document.getElementById("email");
  if (emailInput instanceof HTMLInputElement) {
    emailInput.focus();
  }
}

function handleForgotPasswordHint() {
  showToast("Recuperacion de contrasena: contacta al administrador del sistema.", "info");
}

async function handleReportTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const editButton = target.closest(".event-edit");
  if (editButton instanceof HTMLButtonElement) {
    await handleEventEdit(editButton);
    return;
  }

  const deleteButton = target.closest(".event-delete");
  if (deleteButton instanceof HTMLButtonElement) {
    await handleEventDelete(deleteButton);
    return;
  }

  const attachmentButton = target.closest(".attachment-open");
  if (!(attachmentButton instanceof HTMLButtonElement)) {
    return;
  }

  const eventId = attachmentButton.dataset.eventId;
  if (!eventId) {
    return;
  }

  const ownerId = Number(attachmentButton.dataset.ownerId || 0);
  const normalizedOwnerId = Number.isFinite(ownerId) && ownerId > 0 ? ownerId : null;
  await loadAttachments(Number(eventId), normalizedOwnerId);
}

async function handlePrevPage() {
  if (state.report.page <= 1) {
    return;
  }

  state.report.page -= 1;
  await loadReport();
}

async function handleNextPage() {
  if (state.report.page >= state.report.totalPages) {
    return;
  }

  state.report.page += 1;
  await loadReport();
}

function setupCardPointerMotion() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    card.classList.add("mouse-reactive");

    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        return;
      }

      const relativeX = (event.clientX - bounds.left) / bounds.width;
      const relativeY = (event.clientY - bounds.top) / bounds.height;
      const rotateY = (relativeX - 0.5) * 8;
      const rotateX = (0.5 - relativeY) * 7;

      card.style.setProperty("--rx", `${rotateX.toFixed(2)}deg`);
      card.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  });
}

function startMatrixRain() {
  const canvas = document.getElementById("matrixCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.style.display = "none";
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const glyphs = ["0", "1"];
  const fontSize = 16;
  const fadeColor = "rgba(2, 10, 5, 0.13)";
  let columns = 0;
  let drops = [];
  let viewportWidth = Math.max(window.innerWidth, 320);
  let viewportHeight = Math.max(window.innerHeight, 320);

  function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(window.innerWidth, 320);
    const height = Math.max(window.innerHeight, 320);
    viewportWidth = width;
    viewportHeight = height;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    columns = Math.floor(viewportWidth / fontSize) + 1;
    drops = Array.from({ length: columns }, () => Math.floor(Math.random() * 20));
  }

  function drawFrame() {
    context.fillStyle = fadeColor;
    context.fillRect(0, 0, viewportWidth, viewportHeight);

    context.font = `${fontSize}px "Share Tech Mono", monospace`;
    context.textAlign = "left";
    context.textBaseline = "top";

    for (let i = 0; i < columns; i += 1) {
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      const alpha = 0.4 + Math.random() * 0.5;
      context.fillStyle = `rgba(118, 255, 149, ${alpha.toFixed(2)})`;
      context.fillText(glyph, x, y);

      if (y > viewportHeight + fontSize && Math.random() > 0.975) {
        drops[i] = 0;
      } else {
        drops[i] += 1;
      }
    }
  }

  resizeCanvas();
  const timer = window.setInterval(drawFrame, 72);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("beforeunload", () => {
    window.clearInterval(timer);
  });
}

async function bootstrap() {
  state.authView = getRequestedAuthView();
  state.authPopup = getAuthPopupMode();
  setAuthView(state.authView);
  setDateDefaults();

  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
  authLoginTab.addEventListener("click", handleAuthTabClick);
  authRegisterTab.addEventListener("click", handleAuthTabClick);
  if (switchToRegisterBtn) {
    switchToRegisterBtn.addEventListener("click", handleSwitchToRegister);
  }
  if (switchToLoginBtn) {
    switchToLoginBtn.addEventListener("click", handleSwitchToLogin);
  }
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", handleForgotPasswordHint);
  }
  mfaEnableForm.addEventListener("submit", handleMfaEnable);
  eventForm.addEventListener("submit", handleCreateEvent);
  attachmentForm.addEventListener("submit", handleAttachmentSubmit);
  filterForm.addEventListener("submit", handleFilterSubmit);
  openReportBtn.addEventListener("click", handleOpenReportClick);
  reportBody.addEventListener("click", handleReportTableClick);
  reportPrev.addEventListener("click", handlePrevPage);
  reportNext.addEventListener("click", handleNextPage);
  logoutBtn.addEventListener("click", handleLogout);

  adminPasswordForm.addEventListener("submit", handleAdminPasswordUpdate);
  adminGeneratePassword.addEventListener("click", handleGenerateAdminPassword);
  adminUnlockUser.addEventListener("click", handleAdminUnlockUser);
  adminDeleteUser.addEventListener("click", handleAdminUserDelete);
  adminSelfPasswordForm.addEventListener("submit", handleAdminSelfPasswordUpdate);

  templateForm.addEventListener("submit", handleTemplateCreate);
  templateList.addEventListener("click", handleTemplateToggle);
  eventTemplateSelect.addEventListener("change", handleTemplateSelectChange);

  fromDateInput.addEventListener("change", syncDateConstraints);
  toDateInput.addEventListener("change", syncDateConstraints);
  pageSizeInput.addEventListener("change", async () => {
    state.report.page = 1;
    await loadReport();
  });

  exportButtons.forEach((button) => {
    button.addEventListener("click", handleExportClick);
  });
  authLaunchButtons.forEach((button) => {
    button.addEventListener("click", handleAuthLaunchClick);
  });

  setupCardPointerMotion();
  startMatrixRain();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // No interrumpir flujo principal si falla el service worker.
      });
    });
  }

  const hasSession = await loadCurrentSession();
  if (!hasSession) {
    clearSession();
    renderAuthView();
    return;
  }

  renderDashboardView();
  await loadDashboardData();
}

bootstrap();
