
const authSection = document.getElementById("authSection");
const dashboardSection = document.getElementById("dashboardSection");
const landingPanel = document.getElementById("landingPanel");
const mfaSetupCard = document.getElementById("mfaSetupCard");
const mfaQr = document.getElementById("mfaQr");
const mfaManualKey = document.getElementById("mfaManualKey");
const sessionInfo = document.getElementById("sessionInfo");
const toast = document.getElementById("toast");
const reportRange = document.getElementById("reportRange");
const security = window.BitacoraSecurity || {
  toSafeText(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  },
  setSafeText(target, value) {
    if (!target) {
      return;
    }
    target.textContent = this.toSafeText(value);
  }
};

const kpiTotal = document.getElementById("kpiTotal");
const kpiAlta = document.getElementById("kpiAlta");
const kpiDias = document.getElementById("kpiDias");
const kpiSection = document.getElementById("kpiSection");
const dateSummary = document.getElementById("dateSummary");
const reportBody = document.getElementById("reportBody");
const reportPrev = document.getElementById("reportPrev");
const reportNext = document.getElementById("reportNext");
const reportPageInfo = document.getElementById("reportPageInfo");
const mainWorkspaceSection = document.getElementById("mainWorkspaceSection");
const secondaryWorkspaceSection = document.getElementById("secondaryWorkspaceSection");
const registroSection = document.getElementById("registroSection");
const informeSection = document.getElementById("informeSection");
const tendenciasSection = document.getElementById("tendenciasSection");
const attachmentsCard = document.getElementById("attachmentsCard");
const socDashboardSection = document.getElementById("socDashboardSection");
const socTotalRegistros = document.getElementById("socTotalRegistros");
const socRegistrosHoy = document.getElementById("socRegistrosHoy");
const socPrioridadAlta = document.getElementById("socPrioridadAlta");
const socPrioridadMedia = document.getElementById("socPrioridadMedia");
const socPrioridadBaja = document.getElementById("socPrioridadBaja");
const socRangeInfo = document.getElementById("socRangeInfo");
const socUsersChartCanvas = document.getElementById("socUsersChart");
const socCriticalityChartCanvas = document.getElementById("socCriticalityChart");
const socTimelineChartCanvas = document.getElementById("socTimelineChart");

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
const eventFilesInput = document.getElementById("eventFiles");
const pdfCompanyNameInput = document.getElementById("pdfCompanyName");
const pdfDocumentTitleInput = document.getElementById("pdfDocumentTitle");
const pdfCompanyLogoInput = document.getElementById("pdfCompanyLogo");

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
const recoverModal = document.getElementById("recoverModal");
const recoverForm = document.getElementById("recoverForm");
const recoverCancelBtn = document.getElementById("recoverCancelBtn");
const recoverEmailInput = document.getElementById("recoverEmail");
const recoverMfaTokenInput = document.getElementById("recoverMfaToken");
const recoverNewPasswordInput = document.getElementById("recoverNewPassword");
const recoverConfirmPasswordInput = document.getElementById("recoverConfirmPassword");
const adminTools = document.getElementById("adminTools");
const adminPasswordForm = document.getElementById("adminPasswordForm");
const adminUserSelect = document.getElementById("adminUserSelect");
const adminRoleForm = document.getElementById("adminRoleForm");
const adminRoleUserSelect = document.getElementById("adminRoleUserSelect");
const adminRoleSelect = document.getElementById("adminRoleSelect");
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
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const dashboardSidebar = document.getElementById("dashboardSidebar");
const sidebarLinks = document.querySelectorAll(".sidebar-link");
const welcomeMessage = document.getElementById("welcomeMessage");

const PRIORITY_VALUES = ["baja", "media", "alta", "observacion"];
const PRIORITY_LABELS = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  observacion: "Observacion informativa"
};
const PANEL_ROUTES = new Set([
  "/dashboard",
  "/resumen",
  "/registro/nuevo",
  "/informes",
  "/tendencias",
  "/adjuntos",
  "/usuarios",
  "/plantillas"
]);

const ERROR_MESSAGES = {
  unauthorized: "Acceso no autorizado. Inicia sesion.",
  invalid_token: "Sesion invalida. Inicia sesion nuevamente.",
  session_revoked: "La sesion fue revocada. Inicia sesion otra vez.",
  invalid_credentials: "No se pudo completar la autenticacion.",
  auth_failed: "No se pudo completar la autenticacion.",
  account_locked: "Cuenta bloqueada temporalmente por seguridad.",
  mfa_token_required: "Debes ingresar el codigo MFA.",
  invalid_mfa_token: "No se pudo verificar el codigo MFA.",
  mfa_not_enabled: "No se pudo completar la operacion de MFA.",
  invalid_mfa_setup: "No se pudo completar la operacion de MFA.",
  invalid_token_purpose: "Token no valido para esta operacion.",
  mfa_setup_not_started: "Primero debes iniciar la configuracion MFA.",
  mfa_setup_required: "Configura MFA para completar el acceso.",
  weak_password: "No se pudo actualizar la contrasena.",
  registration_disabled: "El registro publico esta deshabilitado.",
  email_already_exists: "No se pudo completar el registro.",
  registration_unavailable: "No se pudo completar el registro.",
  recover_failed: "No se pudo completar la recuperacion de contrasena.",
  validation_error: "No se pudo validar la solicitud.",
  forbidden: "No tienes permisos para esta accion.",
  user_not_found: "No se pudo completar la operacion solicitada.",
  invalid_user_id: "ID de usuario invalido.",
  template_not_found: "No se pudo completar la operacion con la plantilla.",
  template_name_exists: "No se pudo completar la operacion con la plantilla.",
  event_not_found: "No se pudo completar la operacion con el registro.",
  attachment_not_found: "No se pudo completar la operacion con el adjunto.",
  file_required: "Selecciona un archivo para subir.",
  file_too_large: "El archivo supera el tamano permitido.",
  invalid_file_type: "Tipo de archivo no permitido.",
  past_date_not_allowed: "No se permite registrar bitacoras en fechas anteriores.",
  cannot_delete_current_user: "No puedes eliminar tu propio usuario.",
  cannot_change_own_role: "No puedes cambiar tu propio rol admin.",
  last_admin_not_allowed: "No puedes eliminar el ultimo admin del sistema.",
  invalid_current_password: "La contrasena actual es incorrecta.",
  refresh_token_required: "Sesion no disponible. Inicia sesion de nuevo.",
  invalid_refresh_token: "Sesion invalida. Inicia sesion otra vez.",
  refresh_token_expired: "Tu sesion expiro. Inicia sesion nuevamente.",
  too_many_requests: "Demasiados intentos. Espera un momento e intenta de nuevo."
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
  eventPayloadById: {},
  selectedEventId: null,
  selectedEventOwnerId: null,
  eventOwners: {},
  authView: "login",
  authPopup: false,
  pendingRefresh: null,
  chartJsPromise: null,
  performanceLite: false,
  sidebarOpen: true,
  pdfLogoDataUrl: "",
  pdfLogoFileName: "",
  charts: {
    users: null,
    criticality: null,
    timeline: null
  }
};

function clearElement(node) {
  if (!node) {
    return;
  }
  node.replaceChildren();
}

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

function persistPdfBrandingDraft() {
  try {
    const payload = {
      companyName: (pdfCompanyNameInput?.value || "").trim(),
      documentTitle: (pdfDocumentTitleInput?.value || "").trim(),
      logoDataUrl: state.pdfLogoDataUrl || "",
      logoFileName: state.pdfLogoFileName || ""
    };
    window.localStorage.setItem("bitacora_pdf_branding_v1", JSON.stringify(payload));
  } catch (_error) {
    // Ignore localStorage failures.
  }
}

function loadPdfBrandingDraft() {
  try {
    const raw = window.localStorage.getItem("bitacora_pdf_branding_v1");
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (pdfCompanyNameInput) {
      pdfCompanyNameInput.value = String(parsed.companyName || "");
    }
    if (pdfDocumentTitleInput) {
      pdfDocumentTitleInput.value = String(parsed.documentTitle || "");
    }
    state.pdfLogoDataUrl = String(parsed.logoDataUrl || "");
    state.pdfLogoFileName = String(parsed.logoFileName || "");

    if (pdfCompanyLogoInput && state.pdfLogoFileName) {
      pdfCompanyLogoInput.setAttribute("title", `Logo cargado: ${state.pdfLogoFileName}`);
    }
  } catch (_error) {
    // Ignore invalid localStorage data.
  }
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("file_read_error"));
    reader.readAsDataURL(file);
  });
}

async function handlePdfLogoChange() {
  const logoFile = pdfCompanyLogoInput?.files?.[0];

  if (!logoFile) {
    state.pdfLogoDataUrl = "";
    state.pdfLogoFileName = "";
    persistPdfBrandingDraft();
    return;
  }

  if (logoFile.size > 512 * 1024) {
    showToast("El logo supera 512KB. Usa un PNG/JPG mas liviano.", "error");
    if (pdfCompanyLogoInput) {
      pdfCompanyLogoInput.value = "";
    }
    state.pdfLogoDataUrl = "";
    state.pdfLogoFileName = "";
    persistPdfBrandingDraft();
    return;
  }

  try {
    state.pdfLogoDataUrl = await readFileAsDataUrl(logoFile);
    state.pdfLogoFileName = logoFile.name || "";
    persistPdfBrandingDraft();
  } catch (_error) {
    showToast("No se pudo leer el logo seleccionado.", "error");
  }
}

function normalizePriority(priority) {
  const value = String(priority || "").toLowerCase();
  return PRIORITY_VALUES.includes(value) ? value : "media";
}

function formatPriorityLabel(priority) {
  const normalized = normalizePriority(priority);
  return PRIORITY_LABELS[normalized] || PRIORITY_LABELS.media;
}

function formatRoleLabel(role) {
  const value = String(role || "").toLowerCase();
  if (value === "admin") {
    return "Administrador";
  }
  if (value === "supervisor") {
    return "Supervisor";
  }
  return "Funcionario";
}

function resolveErrorMessage(errorCode, details) {
  if (!errorCode) {
    return "No se pudo completar la operacion.";
  }
  if (errorCode === "too_many_requests") {
    const retry = Number(details?.retryAfterSeconds || details?.retryAfter || 0);
    if (Number.isFinite(retry) && retry > 0) {
      return `Demasiados intentos. Espera ${retry}s e intenta de nuevo.`;
    }
  }
  return ERROR_MESSAGES[errorCode] || errorCode;
}

function readRetrySeconds(response, data) {
  const retryFromBody = Number(data?.retryAfterSeconds || data?.retryAfter || 0);
  if (Number.isFinite(retryFromBody) && retryFromBody > 0) {
    return Math.ceil(retryFromBody);
  }

  const retryFromHeader = Number(response?.headers?.get?.("ratelimit-reset") || 0);
  if (Number.isFinite(retryFromHeader) && retryFromHeader > 0) {
    return Math.ceil(retryFromHeader);
  }

  return 0;
}

function detectPerformanceLite() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cpuCores = Number(navigator.hardwareConcurrency || 0);
  const deviceMemory = Number(navigator.deviceMemory || 0);
  const lowCores = cpuCores > 0 && cpuCores <= 4;
  const lowMemory = deviceMemory > 0 && deviceMemory <= 4;
  const saveData = Boolean(navigator.connection?.saveData);
  const smallViewport = window.matchMedia("(max-width: 980px)").matches;

  return reducedMotion || saveData || lowCores || lowMemory || smallViewport;
}

function resolvePerformanceLitePreference() {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("lite");
  if (forced === "1") {
    return true;
  }
  if (forced === "0") {
    return false;
  }

  try {
    const stored = window.localStorage.getItem("bitacora_lite_mode");
    if (stored === "1") {
      return true;
    }
    if (stored === "0") {
      return false;
    }
  } catch (_error) {
    // Ignore localStorage access issues.
  }

  return detectPerformanceLite();
}

function applyPerformanceProfile() {
  state.performanceLite = resolvePerformanceLitePreference();
  document.body.classList.toggle("performance-lite", state.performanceLite);
}

async function ensureChartJsLoaded() {
  if (typeof window.Chart === "function") {
    return true;
  }

  if (state.chartJsPromise) {
    return state.chartJsPromise;
  }

  state.chartJsPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "/vendor/chart.js";
    script.async = true;
    script.onload = () => resolve(typeof window.Chart === "function");
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return state.chartJsPromise;
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
  return params.get("popup") === "auth";
}

function normalizePathname(pathname = window.location.pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.replace(/\/+$/, "");
}

function getCurrentPanelPath() {
  return normalizePathname(window.location.pathname);
}

function isPanelRoute(path = getCurrentPanelPath()) {
  return PANEL_ROUTES.has(path);
}

function completeAuthPopupNavigation() {
  if (!state.authPopup) {
    return false;
  }

  let openerRedirected = false;
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.location.href = "/dashboard";
      openerRedirected = true;
    }
  } catch (_error) {
    openerRedirected = false;
  }

  if (openerRedirected) {
    window.close();
  }

  window.location.href = "/dashboard";
  return true;
}

function setElementVisible(element, isVisible) {
  if (!element) {
    return;
  }
  element.classList.toggle("hidden", !isVisible);
}

function applyLayoutMode(mode) {
  document.body.classList.remove("session-active", "landing-mode", "auth-popup-mode", "dashboard-nav-open");
  if (mode) {
    document.body.classList.add(mode);
  }
}

function setSidebarOpen(nextState) {
  if (!dashboardSection || !sidebarToggleBtn) {
    return;
  }

  const isOpen = Boolean(nextState);
  state.sidebarOpen = isOpen;
  dashboardSection.classList.toggle("sidebar-collapsed", !isOpen);
  if (dashboardSidebar) {
    dashboardSidebar.classList.toggle("is-open", isOpen);
  }
  document.body.classList.toggle("dashboard-nav-open", isOpen);
  sidebarToggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  sidebarToggleBtn.textContent = isOpen ? "Ocultar menu" : "Mostrar menu";
}

function syncSidebarActiveLink() {
  const currentPath = getCurrentPanelPath();
  sidebarLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }
    const href = normalizePathname(link.getAttribute("href") || "");
    link.classList.toggle("is-active", href === currentPath);
  });
}

function updateSidebarRoleLinks() {
  sidebarLinks.forEach((button) => {
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const required = button.dataset.requires;
    if (required === "admin") {
      button.classList.toggle("hidden", !isAdminSession());
      return;
    }

    if (required === "templates") {
      button.classList.toggle("hidden", !canManageTemplates());
    }
  });
}

function canUploadToEvent(eventOwnerId) {
  if (!state.user || !eventOwnerId) {
    return false;
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
    `Registro #${state.selectedEventId} en modo lectura. Solo el dueno puede subir adjuntos.`;
}

function clearSession() {
  state.user = null;
  state.users = [];
  state.templates = [];
  state.eventPayloadById = {};
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
  state.sidebarOpen = true;

  setKpi({});
  clearElement(dateSummary);
  clearElement(reportBody);
  clearElement(trendByDate);
  clearElement(trendPriority);
  clearElement(trendTopUsers);
  clearElement(templateList);
  clearElement(attachmentList);
  attachmentEventId.value = "";
  attachmentFileInput.value = "";
  loginForm.reset();
  registerForm.reset();
  mfaEnableForm.reset();
  eventForm.reset();
  if (eventFilesInput) {
    eventFilesInput.value = "";
  }
  attachmentForm.reset();
  if (recoverForm) {
    recoverForm.reset();
  }
  if (adminRoleForm) {
    adminRoleForm.reset();
  }
  closeRecoverModal();
  refreshAttachmentUploadState();
  syncSidebarActiveLink();
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
  clearElement(dateSummary);
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
  clearElement(reportBody);
  const rows = Array.isArray(report.events) ? report.events : [];
  state.eventOwners = {};
  state.eventPayloadById = {};

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
    const normalizedPriority = normalizePriority(item.prioridad);
    priorityTag.className = `priority priority-${normalizedPriority}`;
    priorityTag.textContent = formatPriorityLabel(normalizedPriority);
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

    if (canModifyEvent()) {
      state.eventPayloadById[item.id] = {
        fecha: item.fecha,
        descripcionActividad: item.descripcionActividad || "",
        observacion: item.observacion || "",
        prioridad: normalizePriority(item.prioridad),
        templateId: item.templateId ?? null
      };

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "btn btn-ghost event-edit";
      editButton.dataset.eventId = String(item.id);
      editButton.textContent = "Editar";

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn btn-ghost event-delete";
      deleteButton.dataset.eventId = String(item.id);
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
  clearElement(container);

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
    const labelSpan = document.createElement("span");
    security.setSafeText(labelSpan, label ?? "-");
    const valueSpan = document.createElement("span");
    security.setSafeText(valueSpan, value);
    meta.appendChild(labelSpan);
    meta.appendChild(valueSpan);

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

  clearElement(trendPriority);
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
    chip.textContent = `${formatPriorityLabel(item.prioridad)}: ${item.total}`;
    trendPriority.appendChild(chip);
  });
}

function destroySocCharts() {
  if (state.charts.users) {
    state.charts.users.destroy();
    state.charts.users = null;
  }
  if (state.charts.criticality) {
    state.charts.criticality.destroy();
    state.charts.criticality = null;
  }
  if (state.charts.timeline) {
    state.charts.timeline.destroy();
    state.charts.timeline = null;
  }
}

function renderSocDashboardCharts(data) {
  if (typeof window.Chart !== "function") {
    showToast("No se pudo inicializar Chart.js para el dashboard.", "error");
    return;
  }

  destroySocCharts();

  const byUser = Array.isArray(data.byUser) ? data.byUser : [];
  const byPriority = Array.isArray(data.byPriority) ? data.byPriority : [];
  const byDate = Array.isArray(data.byDate) ? data.byDate : [];

  const userLabels = byUser.map((item) => item.encargado);
  const userValues = byUser.map((item) => Number(item.total || 0));
  const priorityMap = {
    alta: 0,
    media: 0,
    baja: 0
  };
  byPriority.forEach((item) => {
    const key = String(item.prioridad || "").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(priorityMap, key)) {
      priorityMap[key] = Number(item.total || 0);
    }
  });
  const dateLabels = byDate.map((item) => String(item.fecha || "").slice(5));
  const dateValues = byDate.map((item) => Number(item.total || 0));

  if (socUsersChartCanvas instanceof HTMLCanvasElement) {
    state.charts.users = new window.Chart(socUsersChartCanvas, {
      type: "bar",
      data: {
        labels: userLabels,
        datasets: [
          {
            label: "Registros",
            data: userValues,
            borderRadius: 8,
            backgroundColor: "rgba(64, 224, 255, 0.72)",
            borderColor: "rgba(96, 235, 255, 0.96)",
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: "#9cb8de" },
            grid: { color: "rgba(140, 178, 235, 0.16)" }
          },
          x: {
            ticks: { color: "#c4d8f7" },
            grid: { display: false }
          }
        }
      }
    });
  }

  if (socCriticalityChartCanvas instanceof HTMLCanvasElement) {
    state.charts.criticality = new window.Chart(socCriticalityChartCanvas, {
      type: "doughnut",
      data: {
        labels: ["Alta", "Media", "Baja"],
        datasets: [
          {
            data: [priorityMap.alta, priorityMap.media, priorityMap.baja],
            backgroundColor: ["#ff5f74", "#ffd35f", "#63f7ab"],
            borderColor: ["#ff8ea0", "#ffe390", "#96ffca"],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#d6e6ff"
            }
          }
        }
      }
    });
  }

  if (socTimelineChartCanvas instanceof HTMLCanvasElement) {
    state.charts.timeline = new window.Chart(socTimelineChartCanvas, {
      type: "line",
      data: {
        labels: dateLabels,
        datasets: [
          {
            label: "Registros por dia",
            data: dateValues,
            tension: 0.28,
            borderWidth: 2,
            fill: true,
            borderColor: "rgba(109, 255, 177, 0.95)",
            backgroundColor: "rgba(109, 255, 177, 0.16)",
            pointRadius: 2.4,
            pointBackgroundColor: "#7dffc4"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#d6e6ff"
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: "#9cb8de" },
            grid: { color: "rgba(140, 178, 235, 0.16)" }
          },
          x: {
            ticks: { color: "#c4d8f7" },
            grid: { display: false }
          }
        }
      }
    });
  }
}

async function loadSocDashboard() {
  const { response, data, networkError } = await apiAuth("/events/dashboard?days=30");

  if (networkError) {
    showToast("No hay conexion para cargar el dashboard SOC.", "error");
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

  socTotalRegistros.textContent = String(Number(data?.totals?.total || 0));
  socRegistrosHoy.textContent = String(Number(data?.totals?.hoy || 0));
  socPrioridadAlta.textContent = String(Number(data?.totals?.alta || 0));
  socPrioridadMedia.textContent = String(Number(data?.totals?.media || 0));
  socPrioridadBaja.textContent = String(Number(data?.totals?.baja || 0));

  if (socRangeInfo) {
    socRangeInfo.textContent = `Rango ${formatDate(data?.range?.from)} - ${formatDate(data?.range?.to)}`;
  }

  const chartReady = await ensureChartJsLoaded();
  if (!chartReady) {
    destroySocCharts();
    showToast("No se pudo cargar el modulo de graficas del dashboard.", "error");
    return;
  }

  renderSocDashboardCharts(data);
}

function renderUsersOptions() {
  clearElement(adminUserSelect);
  if (adminRoleUserSelect) {
    clearElement(adminRoleUserSelect);
  }
  clearElement(userFilterInput);

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "Todos";
  userFilterInput.appendChild(allOption);

  if (state.users.length === 0) {
    const emptyAdminOption = document.createElement("option");
    emptyAdminOption.value = "";
    emptyAdminOption.textContent = "No hay usuarios";
    adminUserSelect.appendChild(emptyAdminOption);
    if (adminRoleUserSelect) {
      const emptyRoleOption = document.createElement("option");
      emptyRoleOption.value = "";
      emptyRoleOption.textContent = "No hay usuarios";
      adminRoleUserSelect.appendChild(emptyRoleOption);
    }
    return;
  }

  state.users.forEach((user) => {
    const userText = `${user.name} (${user.email}) - ${formatRoleLabel(user.role)}`;

    const adminOption = document.createElement("option");
    adminOption.value = String(user.id);
    adminOption.textContent = userText;
    adminUserSelect.appendChild(adminOption);

    if (adminRoleUserSelect) {
      const roleOption = document.createElement("option");
      roleOption.value = String(user.id);
      roleOption.textContent = userText;
      adminRoleUserSelect.appendChild(roleOption);
    }

    const filterOption = document.createElement("option");
    filterOption.value = String(user.id);
    filterOption.textContent = userText;
    userFilterInput.appendChild(filterOption);
  });

  if (adminRoleUserSelect && adminRoleSelect) {
    const selectedUserId = Number(adminRoleUserSelect.value || state.users[0].id);
    adminRoleUserSelect.value = String(selectedUserId);
    const selectedUser = state.users.find((user) => Number(user.id) === selectedUserId);
    adminRoleSelect.value = selectedUser?.role || "funcionario";
  }
}

function renderTemplates() {
  clearElement(eventTemplateSelect);

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Sin plantilla";
  eventTemplateSelect.appendChild(defaultOption);

  state.templates
    .filter((template) => template.isActive)
    .forEach((template) => {
      const option = document.createElement("option");
      option.value = String(template.id);
      option.textContent = `${template.name} (${formatPriorityLabel(template.prioridadDefault)})`;
      eventTemplateSelect.appendChild(option);
    });

  clearElement(templateList);
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
    title.textContent = `${template.name} (${formatPriorityLabel(template.prioridadDefault)})`;

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
  clearElement(attachmentList);

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

function applyRouteMode() {
  const route = getCurrentPanelPath();
  const showDashboard = route === "/dashboard";
  const showResumen = route === "/resumen";
  const showRegistro = route === "/registro/nuevo";
  const showInformes = route === "/informes";
  const showTendencias = route === "/tendencias";
  const showAdjuntos = route === "/adjuntos";
  const showUsuarios = route === "/usuarios";
  const showPlantillas = route === "/plantillas";

  if (showUsuarios && !isAdminSession()) {
    window.location.href = "/dashboard";
    return;
  }

  if (showPlantillas && !canManageTemplates()) {
    window.location.href = "/dashboard";
    return;
  }

  setElementVisible(socDashboardSection, showDashboard);
  setElementVisible(kpiSection, showResumen);
  setElementVisible(registroSection, showRegistro);
  setElementVisible(informeSection, showInformes || showAdjuntos);
  setElementVisible(tendenciasSection, showTendencias || showResumen);
  setElementVisible(attachmentsCard, showAdjuntos);
  setElementVisible(mainWorkspaceSection, showRegistro || showInformes || showAdjuntos);
  setElementVisible(secondaryWorkspaceSection, showTendencias || showAdjuntos || showResumen);
  setElementVisible(adminTools, showUsuarios && isAdminSession());
  setElementVisible(templateTools, showPlantillas && canManageTemplates());

  if (mainWorkspaceSection) {
    mainWorkspaceSection.classList.toggle(
      "single-column",
      showRegistro || showInformes || showAdjuntos
    );
    mainWorkspaceSection.classList.toggle("registro-focus", showRegistro);
  }

  if (secondaryWorkspaceSection) {
    secondaryWorkspaceSection.classList.toggle(
      "single-column",
      showTendencias || showResumen || showAdjuntos
    );
  }

  syncSidebarActiveLink();
}

function renderAuthView() {
  applyLayoutMode(state.authPopup ? "auth-popup-mode" : "landing-mode");
  dashboardSection.classList.add("hidden");
  dashboardSection.classList.add("sidebar-collapsed");
  authSection.hidden = !state.authPopup;
  authSection.classList.toggle("hidden", !state.authPopup);
  if (landingPanel) {
    landingPanel.classList.toggle("hidden", state.authPopup);
  }
  if (welcomeMessage) {
    welcomeMessage.textContent = "";
  }
  if (sessionInfo) {
    sessionInfo.textContent = "";
  }
  mfaSetupCard.classList.add("hidden");
  setAuthView(state.authView);
}

function renderDashboardView() {
  applyLayoutMode("session-active");
  authSection.hidden = true;
  authSection.classList.add("hidden");
  if (landingPanel) {
    landingPanel.classList.add("hidden");
  }
  dashboardSection.classList.remove("hidden");
  eventForm.reset();
  setDateDefaults();

  const roleLabel = formatRoleLabel(state.user.role);

  if (welcomeMessage) {
    welcomeMessage.textContent = `Bienvenido, ${state.user.name}`;
  }
  sessionInfo.textContent = `${roleLabel} | ${state.user.email}`;
  encargadoInput.value = state.user.name;

  userFilterInput.disabled = !canFilterByUser();
  refreshAttachmentUploadState();
  updateSidebarRoleLinks();
  applyRouteMode();

  const shouldOpenSidebar = !window.matchMedia("(max-width: 980px)").matches;
  setSidebarOpen(shouldOpenSidebar);
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

function canModifyEvent() {
  if (!state.user) {
    return false;
  }
  return isAdminSession();
}

function isSafeMfaQrDataUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 900000) {
    return false;
  }
  return /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(raw);
}

function openReportWindow() {
  const params = buildReportParams(false);
  params.set("page", "1");
  const fullViewMinRows = state.performanceLite ? 120 : 250;
  params.set("pageSize", String(Math.max(Number(pageSizeInput.value || 20), fullViewMinRows)));
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

function openAuthWindow(requestedView = "login") {
  const authView = requestedView === "register" ? "register" : "login";
  const params = new URLSearchParams({
    popup: "auth",
    auth: authView
  });

  const width = 620;
  const height = 850;
  const left = Math.max(0, Math.round((window.screen.width - width) / 2));
  const top = Math.max(0, Math.round((window.screen.height - height) / 2));
  const popup = window.open(
    `/?${params.toString()}`,
    "bitacora-auth-view",
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`
  );

  if (popup) {
    popup.focus();
  }

  return popup;
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

function reportParamsToPayload(params) {
  const payload = {
    from: params.get("from"),
    to: params.get("to"),
    format: params.get("format") || "csv"
  };

  const q = params.get("q");
  if (q) {
    payload.q = q;
  }

  const priority = params.get("priority");
  if (priority) {
    payload.priority = priority;
  }

  const encargadoId = params.get("encargadoId");
  if (encargadoId) {
    payload.encargadoId = Number(encargadoId);
  }

  return payload;
}

function readCookie(name) {
  const escapedName = String(name || "").replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function getCsrfToken() {
  return readCookie("bitacora_csrf");
}

function addCsrfHeaderIfNeeded(headers = {}, method = "GET") {
  const normalizedMethod = String(method || "GET").toUpperCase();
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD" || normalizedMethod === "OPTIONS") {
    return headers;
  }

  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    return headers;
  }

  return {
    ...headers,
    "x-csrf-token": csrfToken
  };
}

async function api(path, options = {}) {
  const { timeoutMs = 20000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const method = String(fetchOptions.method || "GET").toUpperCase();

  const requestOptions = {
    credentials: "same-origin",
    ...fetchOptions,
    signal: controller.signal,
    method,
    headers: addCsrfHeaderIfNeeded(fetchOptions.headers || {}, method)
  };

  try {
    const response = await fetch(path, requestOptions);
    let data = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    }
    return { response, data, networkError: false };
  } catch (error) {
    return {
      response: null,
      data: null,
      networkError: true,
      timedOut: error?.name === "AbortError"
    };
  } finally {
    window.clearTimeout(timeoutId);
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
  const { response, data, networkError } = await api("/auth/me", {
    timeoutMs: state.authPopup ? 3500 : 5000
  });

  if (networkError) {
    if (!state.authPopup) {
      showToast("No hay conexion con el servidor.", "error");
    }
    return false;
  }

  if (!response.ok) {
    return false;
  }

  state.user = data;
  return true;
}

async function loadDashboardData() {
  const route = getCurrentPanelPath();

  if (route === "/dashboard") {
    await loadSocDashboard();
    return;
  }

  if (route === "/resumen") {
    await Promise.all([loadReport(), loadTrends()]);
    return;
  }

  if (route === "/registro/nuevo") {
    await loadTemplates();
    return;
  }

  if (route === "/informes") {
    await Promise.all([loadUsers(), loadReport()]);
    return;
  }

  if (route === "/tendencias") {
    await loadTrends();
    return;
  }

  if (route === "/adjuntos") {
    await Promise.all([loadUsers(), loadReport()]);
    return;
  }

  if (route === "/usuarios") {
    await loadUsers();
    return;
  }

  if (route === "/plantillas") {
    await loadTemplates();
    return;
  }

  await Promise.all([loadUsers(), loadTemplates(), loadReport(), loadTrends()]);
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

  const { response, data, networkError, timedOut } = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast(
      timedOut ? "Tiempo de espera agotado. Revisa la conexion e intenta de nuevo." : "No hay conexion con el servidor.",
      "error"
    );
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

    if (completeAuthPopupNavigation()) {
      return;
    }

    window.location.href = "/dashboard";
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

  if (response.status === 429) {
    const retry = readRetrySeconds(response, data);
    showToast(
      retry > 0
        ? `Demasiados intentos de inicio de sesion. Espera ${retry}s.`
        : "Demasiados intentos de inicio de sesion. Intenta de nuevo en unos minutos.",
      "error"
    );
    return;
  }

  if (data?.error === "mfa_token_required" || data?.error === "invalid_mfa_token") {
    const mfaInput = document.getElementById("mfaToken");
    if (mfaInput instanceof HTMLInputElement) {
      mfaInput.focus();
      mfaInput.select();
    }
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
    if (response.status === 429) {
      const retry = readRetrySeconds(response, data);
      showToast(
        retry > 0
          ? `Demasiadas solicitudes MFA. Espera ${retry}s.`
          : "Demasiadas solicitudes MFA. Intenta de nuevo en unos minutos.",
        "error"
      );
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  if (!isSafeMfaQrDataUrl(data?.qrDataUrl)) {
    showToast("No se pudo generar un QR MFA valido.", "error");
    return;
  }

  mfaQr.removeAttribute("src");
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
    if (response.status === 429) {
      const retry = readRetrySeconds(response, data);
      showToast(
        retry > 0
          ? `Demasiados intentos de registro. Espera ${retry}s.`
          : "Demasiados intentos de registro. Intenta de nuevo en unos minutos.",
        "error"
      );
      return;
    }
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

  if (completeAuthPopupNavigation()) {
    return;
  }

  window.location.href = "/dashboard";
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

  const { response, data, networkError, timedOut } = await api("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast(
      timedOut
        ? "Tiempo de espera agotado al registrar. Intenta nuevamente."
        : "No hay conexion para registrar el usuario.",
      "error"
    );
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
    if (completeAuthPopupNavigation()) {
      return;
    }

    window.location.href = "/dashboard";
    return;
  }

  showToast("Cuenta creada. Inicia sesion para continuar.", "success");
}

async function uploadEventAttachmentByFile(eventId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const csrfToken = getCsrfToken();

  let uploadResponse = await fetch(`/events/${eventId}/attachments`, {
    method: "POST",
    body: formData,
    credentials: "same-origin",
    headers: csrfToken ? { "x-csrf-token": csrfToken } : {}
  });

  if (uploadResponse.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      uploadResponse = await fetch(`/events/${eventId}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : {}
      });
    }
  }

  let data = null;
  const contentType = uploadResponse.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await uploadResponse.json();
  }

  return {
    ok: uploadResponse.ok,
    status: uploadResponse.status,
    data
  };
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

  const createdEventId = Number(data?.id || 0);
  const selectedFiles = eventFilesInput?.files ? Array.from(eventFilesInput.files) : [];
  let uploadedFiles = 0;
  let failedUploads = 0;

  if (createdEventId && selectedFiles.length > 0) {
    for (const file of selectedFiles) {
      // eslint-disable-next-line no-await-in-loop
      const uploadResult = await uploadEventAttachmentByFile(createdEventId, file);
      if (uploadResult.ok) {
        uploadedFiles += 1;
      } else {
        failedUploads += 1;
      }
    }
  }

  document.getElementById("descripcionActividad").value = "";
  document.getElementById("observacion").value = "";
  eventTemplateSelect.value = "";
  if (eventFilesInput) {
    eventFilesInput.value = "";
  }
  if (!fromDateInput.value || payload.fecha < fromDateInput.value) {
    fromDateInput.value = payload.fecha;
  }
  if (!toDateInput.value || payload.fecha > toDateInput.value) {
    toDateInput.value = payload.fecha;
  }
  syncDateConstraints();

  if (uploadedFiles > 0 && failedUploads === 0) {
    showToast(`Registro guardado y ${uploadedFiles} archivo(s) adjuntado(s).`, "success");
  } else if (uploadedFiles > 0 && failedUploads > 0) {
    showToast(
      `Registro guardado. ${uploadedFiles} adjunto(s) cargados y ${failedUploads} con error.`,
      "info"
    );
  } else if (failedUploads > 0) {
    showToast("Registro guardado, pero los adjuntos fallaron. Intenta subirlos desde Adjuntos.", "error");
  } else {
    showToast("Registro guardado en bitacora.", "success");
  }

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
    showToast("Solo el dueno del registro puede subir adjuntos.", "error");
    return;
  }

  if (!file) {
    setButtonBusy(submitButton, false);
    showToast("Debes seleccionar un archivo.", "error");
    return;
  }

  const uploadResult = await uploadEventAttachmentByFile(eventId, file);
  setButtonBusy(submitButton, false);

  if (!uploadResult.ok) {
    if (uploadResult.status === 401) {
      handleUnauthorized();
      return;
    }

    showToast(resolveErrorMessage(uploadResult.data?.error, uploadResult.data?.details), "error");
    return;
  }

  attachmentFileInput.value = "";
  showToast("Adjunto cargado correctamente.", "success");
  await loadAttachments(eventId);
  await loadReport();
}

async function handleEventEdit(button) {
  const eventId = Number(button.dataset.eventId || 0);

  if (!eventId || !canModifyEvent()) {
    showToast("No tienes permisos para editar este registro.", "error");
    return;
  }

  const current = state.eventPayloadById[eventId] || null;

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
    "Prioridad (baja, media, alta, observacion)",
    String(current.prioridad || "media")
  );
  if (prioridadRaw === null) {
    return;
  }

  const prioridad = prioridadRaw.trim().toLowerCase();
  if (!PRIORITY_VALUES.includes(prioridad)) {
    showToast("Prioridad invalida. Usa baja, media, alta u observacion.", "error");
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

  if (!eventId || !canModifyEvent()) {
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
    clearElement(attachmentList);
    attachmentEventId.value = "";
    refreshAttachmentUploadState();
  }

  showToast("Registro eliminado correctamente.", "success");
  await loadReport();
  await loadTrends();
}

function syncSelectedRoleUser() {
  if (!adminRoleUserSelect || !adminRoleSelect) {
    return;
  }
  const userId = Number(adminRoleUserSelect.value || 0);
  const selectedUser = state.users.find((user) => Number(user.id) === userId);
  adminRoleSelect.value = selectedUser?.role || "funcionario";
}

async function handleAdminRoleUpdate(event) {
  event.preventDefault();
  const submitButton = event.submitter || adminRoleForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Actualizando...");

  if (!isAdminSession()) {
    setButtonBusy(submitButton, false);
    showToast("Operacion solo disponible para administradores.", "error");
    return;
  }

  const userId = Number(adminRoleUserSelect?.value || 0);
  const role = (adminRoleSelect?.value || "").trim();
  if (!userId || !role) {
    setButtonBusy(submitButton, false);
    showToast("Selecciona usuario y rol.", "error");
    return;
  }

  const { response, data, networkError } = await apiAuth(`/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast("No hay conexion para actualizar rol.", "error");
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

  showToast("Rol actualizado correctamente.", "success");
  await loadUsers();
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
  document.getElementById("prioridad").value = normalizePriority(template.prioridadDefault);
}

async function handleExportClick(event) {
  const button = event.currentTarget;
  const format = button.dataset.format;
  setButtonBusy(button, true, "Exportando...");

  const params = buildReportParams(false);
  params.set("format", format);
  let response = null;

  try {
    if (format === "pdf") {
      const logoFile = pdfCompanyLogoInput?.files?.[0];
      if (logoFile) {
        if (logoFile.size > 512 * 1024) {
          setButtonBusy(button, false);
          showToast("El logo supera 512KB. Usa un PNG/JPG mas liviano.", "error");
          return;
        }
        state.pdfLogoDataUrl = await readFileAsDataUrl(logoFile);
        state.pdfLogoFileName = logoFile.name || "";
      }

      const exportPayload = {
        ...reportParamsToPayload(params),
        companyName: (pdfCompanyNameInput?.value || "").trim() || undefined,
        documentTitle: (pdfDocumentTitleInput?.value || "").trim() || undefined,
        logoDataUrl: state.pdfLogoDataUrl || undefined
      };

      persistPdfBrandingDraft();

      response = await fetch("/events/report/export", {
        method: "POST",
        credentials: "same-origin",
        headers: addCsrfHeaderIfNeeded({ "Content-Type": "application/json" }, "POST"),
        body: JSON.stringify(exportPayload)
      });

      if (response.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) {
          response = await fetch("/events/report/export", {
            method: "POST",
            credentials: "same-origin",
            headers: addCsrfHeaderIfNeeded({ "Content-Type": "application/json" }, "POST"),
            body: JSON.stringify(exportPayload)
          });
        }
      }
    } else {
      response = await fetch(`/events/report/export?${params.toString()}`, {
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
    }
  } catch (_error) {
    setButtonBusy(button, false);
    showToast("No hay conexion para exportar el reporte.", "error");
    return;
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
  window.location.href = "/";
}

async function handleFilterSubmit(event) {
  event.preventDefault();
  state.report.page = 1;
  await loadReport();
  if (getCurrentPanelPath() === "/resumen" || getCurrentPanelPath() === "/tendencias") {
    await loadTrends();
  }
}

function handleOpenReportClick() {
  const opened = openReportWindow();
  if (!opened) {
    showToast("Tu navegador bloqueo la nueva ventana. Habilita popups para este sitio.", "error");
  }
}

function handleAuthLaunchClick(event) {
  event.preventDefault();
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const requestedView = target.dataset.auth === "register" ? "register" : "login";
  if (state.authPopup) {
    setAuthView(requestedView);
    const focusId = requestedView === "register" ? "registerName" : "email";
    const focusField = document.getElementById(focusId);
    if (focusField instanceof HTMLElement) {
      focusField.focus();
    }
    return;
  }

  const popup = openAuthWindow(requestedView);
  if (!popup) {
    window.location.href = `/?popup=auth&auth=${requestedView}`;
  }
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

function openRecoverModal() {
  if (!recoverModal) {
    return;
  }

  if (recoverForm) {
    recoverForm.reset();
  }

  const emailInput = document.getElementById("email");
  const suggestedEmail = emailInput instanceof HTMLInputElement ? emailInput.value.trim() : "";
  if (recoverEmailInput) {
    recoverEmailInput.value = suggestedEmail;
  }

  recoverModal.classList.remove("hidden");
  recoverModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (recoverMfaTokenInput instanceof HTMLInputElement) {
    window.setTimeout(() => recoverMfaTokenInput.focus(), 60);
  }
}

function closeRecoverModal() {
  if (!recoverModal) {
    return;
  }
  recoverModal.classList.add("hidden");
  recoverModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function handleForgotPasswordHint() {
  openRecoverModal();
}

async function handleRecoverPasswordSubmit(event) {
  event.preventDefault();

  const submitButton = event.submitter || recoverForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, true, "Actualizando...");

  const email = (recoverEmailInput?.value || "").trim();
  const mfaToken = (recoverMfaTokenInput?.value || "").trim();
  const newPassword = recoverNewPasswordInput?.value || "";
  const confirmPassword = recoverConfirmPasswordInput?.value || "";

  if (newPassword !== confirmPassword) {
    setButtonBusy(submitButton, false);
    showToast("La nueva contrasena y su confirmacion no coinciden.", "error");
    return;
  }

  const { response, data, networkError, timedOut } = await api("/auth/password/recover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      mfaToken,
      newPassword
    })
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast(
      timedOut ? "Tiempo de espera agotado al recuperar contrasena." : "No hay conexion para recuperar contrasena.",
      "error"
    );
    return;
  }

  if (!response.ok) {
    if (response.status === 429) {
      const retry = readRetrySeconds(response, data);
      showToast(
        retry > 0
          ? `Demasiados intentos de recuperacion. Espera ${retry}s.`
          : "Demasiados intentos de recuperacion. Intenta de nuevo en unos minutos.",
        "error"
      );
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  const emailInput = document.getElementById("email");
  if (emailInput instanceof HTMLInputElement) {
    emailInput.value = email.toLowerCase();
  }
  const passwordInput = document.getElementById("password");
  if (passwordInput instanceof HTMLInputElement) {
    passwordInput.value = newPassword;
  }
  const mfaInput = document.getElementById("mfaToken");
  if (mfaInput instanceof HTMLInputElement) {
    mfaInput.value = "";
  }

  recoverForm.reset();
  closeRecoverModal();
  showToast("Contrasena actualizada. Inicia sesion con la nueva contrasena.", "success");
}

function handleSidebarToggle() {
  setSidebarOpen(!state.sidebarOpen);
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

function startMatrixRain(options = {}) {
  const lowPower = Boolean(options.lowPower);
  const canvas = document.getElementById("matrixCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  if (state.performanceLite) {
    canvas.style.display = "none";
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

  const glyphs = "01N1NJA<>[]{}+-*/\\|=~#".split("");
  const palette = [
    { r: 87, g: 224, b: 255 },
    { r: 116, g: 255, b: 176 },
    { r: 60, g: 186, b: 255 },
    { r: 162, g: 244, b: 255 }
  ];
  const fontSize = lowPower ? 16 : 12;
  const trailFade = lowPower ? "rgba(1, 8, 20, 0.16)" : "rgba(1, 8, 20, 0.08)";
  const frameInterval = lowPower ? 1000 / 20 : 1000 / 42;

  let streamLayers = [[], [], []];
  let viewportWidth = Math.max(window.innerWidth, 320);
  let viewportHeight = Math.max(window.innerHeight, 320);
  let frameId = null;
  let lastFrameTime = 0;

  function createStream(columnIndex, layerIndex) {
    const profiles = [
      { xOffset: 0, speedBase: 1.05, speedRange: 2.25, lengthBase: 36, lengthRange: 42 },
      { xOffset: fontSize / 2, speedBase: 0.72, speedRange: 1.8, lengthBase: 30, lengthRange: 36 },
      { xOffset: fontSize * 0.25, speedBase: 0.58, speedRange: 1.4, lengthBase: 24, lengthRange: 30 }
    ];
    const profile = profiles[layerIndex] || profiles[1];

    return {
      x: columnIndex * fontSize + profile.xOffset + (Math.random() * 1.6 - 0.8),
      y: -(Math.random() * viewportHeight * 1.4),
      speed: profile.speedBase + Math.random() * profile.speedRange,
      length: profile.lengthBase + Math.floor(Math.random() * profile.lengthRange),
      paletteIndex: Math.floor(Math.random() * palette.length),
      glyphShift: Math.floor(Math.random() * glyphs.length),
      frame: 0,
      opacity: 0.66 + Math.random() * 0.34
    };
  }

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

    const columns = Math.floor(viewportWidth / fontSize) + 4;
    if (lowPower) {
      streamLayers = [Array.from({ length: columns }, (_unused, index) => createStream(index, 1))];
      return;
    }
    streamLayers = [
      Array.from({ length: columns }, (_unused, index) => createStream(index, 0)),
      Array.from({ length: columns }, (_unused, index) => createStream(index, 1)),
      Array.from({ length: columns }, (_unused, index) => createStream(index, 2))
    ];
  }

  function drawFrame(timestamp) {
    frameId = window.requestAnimationFrame(drawFrame);
    if (document.hidden) {
      return;
    }
    if (timestamp - lastFrameTime < frameInterval) {
      return;
    }
    lastFrameTime = timestamp;

    context.fillStyle = trailFade;
    context.fillRect(0, 0, viewportWidth, viewportHeight);

    context.font = `600 ${fontSize}px "Share Tech Mono", monospace`;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.globalCompositeOperation = "screen";

    streamLayers.forEach((layer, layerIndex) => {
      const layerOpacity = lowPower ? 0.8 : layerIndex === 0 ? 1 : layerIndex === 1 ? 0.72 : 0.56;

      layer.forEach((stream, index) => {
        for (let offset = 0; offset < stream.length; offset += 1) {
          const y = stream.y - offset * fontSize;
          if (y < -fontSize || y > viewportHeight + fontSize) {
            continue;
          }

          const glyphIndex =
            (stream.glyphShift + stream.frame + offset + index + layerIndex) % glyphs.length;
          const glyph = glyphs[glyphIndex];
          const tone = palette[(stream.paletteIndex + offset + layerIndex) % palette.length];
          const trailProgress = 1 - offset / stream.length;
          const tailStrength = Math.pow(Math.max(0.02, trailProgress), 1.48);
          const alpha = Math.max(0.025, tailStrength * stream.opacity * layerOpacity);

          if (!lowPower && offset === 0) {
            context.shadowColor = `rgba(${tone.r}, ${tone.g}, ${tone.b}, 0.95)`;
            context.shadowBlur = layerIndex === 0 ? 18 : 12;
          } else if (!lowPower && offset < 4) {
            context.shadowColor = `rgba(${tone.r}, ${tone.g}, ${tone.b}, 0.48)`;
            context.shadowBlur = 6;
          } else {
            context.shadowBlur = 0;
          }

          context.fillStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${alpha.toFixed(3)})`;
          context.fillText(glyph, stream.x, y);
        }

        if (!lowPower && Math.random() > 0.92) {
          const headTone = palette[stream.paletteIndex % palette.length];
          context.fillStyle = `rgba(${headTone.r}, ${headTone.g}, ${headTone.b}, 0.92)`;
          context.shadowColor = `rgba(${headTone.r}, ${headTone.g}, ${headTone.b}, 0.9)`;
          context.shadowBlur = 14;
          context.fillText(glyphs[(stream.frame + index) % glyphs.length], stream.x, stream.y);
        }

        stream.y += stream.speed;
        stream.frame += 1;

        if (stream.y - stream.length * fontSize > viewportHeight + fontSize) {
          layer[index] = createStream(index, layerIndex);
        }
      });
    });

    context.globalCompositeOperation = "source-over";
    context.shadowBlur = 0;
  }

  resizeCanvas();
  frameId = window.requestAnimationFrame(drawFrame);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("beforeunload", () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }
  });
}

async function bootstrap() {
  state.authView = getRequestedAuthView();
  state.authPopup = getAuthPopupMode();
  applyPerformanceProfile();
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
  if (recoverForm) {
    recoverForm.addEventListener("submit", handleRecoverPasswordSubmit);
  }
  if (recoverCancelBtn) {
    recoverCancelBtn.addEventListener("click", closeRecoverModal);
  }
  if (recoverModal) {
    recoverModal.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.hasAttribute("data-recover-close")) {
        closeRecoverModal();
      }
    });
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && recoverModal && !recoverModal.classList.contains("hidden")) {
      closeRecoverModal();
    }
  });

  mfaEnableForm.addEventListener("submit", handleMfaEnable);
  eventForm.addEventListener("submit", handleCreateEvent);
  attachmentForm.addEventListener("submit", handleAttachmentSubmit);
  filterForm.addEventListener("submit", handleFilterSubmit);
  openReportBtn.addEventListener("click", handleOpenReportClick);
  reportBody.addEventListener("click", handleReportTableClick);
  reportPrev.addEventListener("click", handlePrevPage);
  reportNext.addEventListener("click", handleNextPage);
  logoutBtn.addEventListener("click", handleLogout);
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", handleSidebarToggle);
  }

  adminPasswordForm.addEventListener("submit", handleAdminPasswordUpdate);
  if (adminRoleForm) {
    adminRoleForm.addEventListener("submit", handleAdminRoleUpdate);
  }
  if (adminRoleUserSelect) {
    adminRoleUserSelect.addEventListener("change", syncSelectedRoleUser);
  }
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
  if (pdfCompanyNameInput) {
    pdfCompanyNameInput.addEventListener("change", persistPdfBrandingDraft);
  }
  if (pdfDocumentTitleInput) {
    pdfDocumentTitleInput.addEventListener("change", persistPdfBrandingDraft);
  }
  if (pdfCompanyLogoInput) {
    pdfCompanyLogoInput.addEventListener("change", handlePdfLogoChange);
  }
  authLaunchButtons.forEach((button) => {
    button.addEventListener("click", handleAuthLaunchClick);
  });

  loadPdfBrandingDraft();

  if (!state.authPopup && !state.performanceLite) {
    setupCardPointerMotion();
  }
  startMatrixRain({ lowPower: state.authPopup });

  if ("serviceWorker" in navigator) {
    let swRefreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (swRefreshing) {
        return;
      }
      swRefreshing = true;
      window.location.reload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js?v=13")
        .then((registration) => registration.update())
        .catch(() => {
          // No interrumpir flujo principal si falla el service worker.
        });
    });
  }

  const currentPath = getCurrentPanelPath();
  const hasSession = await loadCurrentSession();
  if (!hasSession) {
    if (isPanelRoute(currentPath)) {
      window.location.href = "/?popup=auth&auth=login";
      return;
    }
    clearSession();
    renderAuthView();
    return;
  }

  if (completeAuthPopupNavigation()) {
    return;
  }

  if (currentPath === "/" || !isPanelRoute(currentPath)) {
    window.location.href = "/dashboard";
    return;
  }

  renderDashboardView();
  await loadDashboardData();
}

bootstrap();
