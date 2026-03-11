
const authSection = document.getElementById("authSection");
const dashboardSection = document.getElementById("dashboardSection");
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
const adminTools = document.getElementById("adminTools");
const adminPasswordForm = document.getElementById("adminPasswordForm");
const adminUserSelect = document.getElementById("adminUserSelect");
const adminNewPassword = document.getElementById("adminNewPassword");
const adminGeneratePassword = document.getElementById("adminGeneratePassword");

const templateTools = document.getElementById("templateTools");
const templateForm = document.getElementById("templateForm");
const templateNameInput = document.getElementById("templateName");
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
  mfa_setup_required: "Configura MFA para completar el acceso admin.",
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
  fromDateInput.max = toDateInput.value || "";
  toDateInput.min = fromDateInput.value || "";
  fechaInput.max = toLocalISODate();
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

  setKpi({});
  dateSummary.innerHTML = "";
  reportBody.innerHTML = "";
  trendByDate.innerHTML = "";
  trendPriority.innerHTML = "";
  trendTopUsers.innerHTML = "";
  templateList.innerHTML = "";
  attachmentList.innerHTML = "";
  selectedEventLabel.textContent = "Selecciona un registro para ver o subir adjuntos.";
  attachmentEventId.value = "";
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

  if (rows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-link attachment-open";
    button.dataset.eventId = String(item.id);
    button.textContent = `Adjuntos (${item.attachmentsCount || 0})`;
    tdAttachments.appendChild(button);

    row.appendChild(tdFecha);
    row.appendChild(tdEncargado);
    row.appendChild(tdActividad);
    row.appendChild(tdObservacion);
    row.appendChild(tdPrioridad);
    row.appendChild(tdTemplate);
    row.appendChild(tdAttachments);
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
  authSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
  mfaSetupCard.classList.add("hidden");
}

function renderDashboardView() {
  authSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");

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

async function loadAttachments(eventId) {
  state.selectedEventId = Number(eventId);
  attachmentEventId.value = String(eventId);
  selectedEventLabel.textContent = `Registro #${eventId}`;

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

    renderDashboardView();
    await loadDashboardData();
    showToast("Sesion iniciada.", "success");
    return;
  }

  if (response.status === 403 && data?.error === "mfa_setup_required") {
    state.setupToken = data.setupToken;
    mfaSetupCard.classList.remove("hidden");
    await loadMfaSetup();
    showToast("Configura MFA para completar el acceso admin.", "info");
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
  state.user = data?.user || null;
  if (!state.user) {
    const sessionLoaded = await loadCurrentSession();
    if (!sessionLoaded) {
      showToast("No se pudo recuperar la sesion.", "error");
      return;
    }
  }

  renderDashboardView();
  await loadDashboardData();
  showToast("Cuenta creada y sesion iniciada.", "success");
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

  if (!eventId) {
    setButtonBusy(submitButton, false);
    showToast("Selecciona un registro en la tabla para adjuntar.", "error");
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

async function handleTemplateCreate(event) {
  event.preventDefault();
  const submitButton = event.submitter || templateForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Guardando...");

  const payload = {
    name: templateNameInput.value.trim(),
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
  await loadReport();
  await loadTrends();
}

async function handleReportTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest(".attachment-open");
  if (!button) {
    return;
  }

  const eventId = button.dataset.eventId;
  if (!eventId) {
    return;
  }

  await loadAttachments(Number(eventId));
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

async function bootstrap() {
  setDateDefaults();

  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
  mfaEnableForm.addEventListener("submit", handleMfaEnable);
  eventForm.addEventListener("submit", handleCreateEvent);
  attachmentForm.addEventListener("submit", handleAttachmentSubmit);
  filterForm.addEventListener("submit", handleFilterSubmit);
  reportBody.addEventListener("click", handleReportTableClick);
  reportPrev.addEventListener("click", handlePrevPage);
  reportNext.addEventListener("click", handleNextPage);
  logoutBtn.addEventListener("click", handleLogout);

  adminPasswordForm.addEventListener("submit", handleAdminPasswordUpdate);
  adminGeneratePassword.addEventListener("click", handleGenerateAdminPassword);

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
