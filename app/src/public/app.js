
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
const registroTitle = document.getElementById("registroTitle");
const registroModeHint = document.getElementById("registroModeHint");
const registroNewEventBtn = document.getElementById("registroNewEventBtn");
const registroComposerPanel = document.getElementById("registroComposerPanel");
const informeSection = document.getElementById("informeSection");
const tendenciasSection = document.getElementById("tendenciasSection");
const attachmentsCard = document.getElementById("attachmentsCard");
const tasksSection = document.getElementById("tasksSection");
const resumenOpsSection = document.getElementById("resumenOpsSection");
const auditSection = document.getElementById("auditSection");
const auditTimeline = document.getElementById("auditTimeline");
const auditFilterForm = document.getElementById("auditFilterForm");
const auditUserFilter = document.getElementById("auditUserFilter");
const auditActionFilter = document.getElementById("auditActionFilter");
const auditFromDate = document.getElementById("auditFromDate");
const auditToDate = document.getElementById("auditToDate");
const auditResetBtn = document.getElementById("auditResetBtn");
const auditTableMeta = document.getElementById("auditTableMeta");
const settingsSection = document.getElementById("settingsSection");
const systemSettingsForm = document.getElementById("systemSettingsForm");
const settingsMeta = document.getElementById("settingsMeta");
const settingsReloadBtn = document.getElementById("settingsReloadBtn");
const settingsSaveBtn = document.getElementById("settingsSaveBtn");
const settingReportPageSizeDefaultInput = document.getElementById("settingReportPageSizeDefault");
const settingReportPageSizeMaxInput = document.getElementById("settingReportPageSizeMax");
const settingTasksPageSizeDefaultInput = document.getElementById("settingTasksPageSizeDefault");
const settingTasksPageSizeMaxInput = document.getElementById("settingTasksPageSizeMax");
const settingEventsDaysInput = document.getElementById("settingEventsDays");
const settingTasksSummaryDaysInput = document.getElementById("settingTasksSummaryDays");
const settingTasksRecentLimitInput = document.getElementById("settingTasksRecentLimit");
const settingSessionIdleTimeoutInput = document.getElementById("settingSessionIdleTimeout");
const settingSessionWarningMinutesInput = document.getElementById("settingSessionWarningMinutes");
const settingSessionKeepAliveMinutesInput = document.getElementById("settingSessionKeepAliveMinutes");
const settingTemplatesEnabledInput = document.getElementById("settingTemplatesEnabled");
const settingTaskExportsEnabledInput = document.getElementById("settingTaskExportsEnabled");
const settingReportExportsEnabledInput = document.getElementById("settingReportExportsEnabled");
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
const dashboardTasksSummaryCard = document.getElementById("dashboardTasksSummaryCard");
const dashboardTasksRange = document.getElementById("dashboardTasksRange");
const dashboardTasksTotal = document.getElementById("dashboardTasksTotal");
const dashboardTasksPending = document.getElementById("dashboardTasksPending");
const dashboardTasksInProgress = document.getElementById("dashboardTasksInProgress");
const dashboardTasksCompleted = document.getElementById("dashboardTasksCompleted");
const dashboardTasksOverdue = document.getElementById("dashboardTasksOverdue");
const dashboardTasksAssignedToMe = document.getElementById("dashboardTasksAssignedToMe");
const dashboardTasksLoading = document.getElementById("dashboardTasksLoading");
const dashboardTasksRecentList = document.getElementById("dashboardTasksRecentList");
const dashboardTasksEmptyState = document.getElementById("dashboardTasksEmptyState");
const dashboardAlertsList = document.getElementById("dashboardAlertsList");
const dashboardActivityList = document.getElementById("dashboardActivityList");
const dashboardActivityEmpty = document.getElementById("dashboardActivityEmpty");

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
const resumenNewEventBtn = document.getElementById("resumenNewEventBtn");

const eventTemplateSelect = document.getElementById("eventTemplateSelect");
const eventFilesInput = document.getElementById("eventFiles");
const pdfCompanyNameInput = document.getElementById("pdfCompanyName");
const pdfDocumentTitleInput = document.getElementById("pdfDocumentTitle");
const pdfCompanyLogoInput = document.getElementById("pdfCompanyLogo");

const loginForm = document.getElementById("loginForm");
const mfaEnableForm = document.getElementById("mfaEnableForm");
const eventForm = document.getElementById("eventForm");
const eventSubmitBtn = document.getElementById("eventSubmitBtn");
const eventCancelBtn = document.getElementById("eventCancelBtn");
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
const entityModal = document.getElementById("entityModal");
const entityModalTitle = document.getElementById("entityModalTitle");
const entityModalMeta = document.getElementById("entityModalMeta");
const entityModalBody = document.getElementById("entityModalBody");
const entityModalActions = document.getElementById("entityModalActions");
const entityModalClose = document.getElementById("entityModalClose");
const attachmentPreviewModal = document.getElementById("attachmentPreviewModal");
const attachmentPreviewClose = document.getElementById("attachmentPreviewClose");
const attachmentPreviewMeta = document.getElementById("attachmentPreviewMeta");
const attachmentPreviewImage = document.getElementById("attachmentPreviewImage");
const attachmentPreviewFrame = document.getElementById("attachmentPreviewFrame");
const attachmentPreviewText = document.getElementById("attachmentPreviewText");
const attachmentPreviewFallback = document.getElementById("attachmentPreviewFallback");
const attachmentPreviewActions = document.getElementById("attachmentPreviewActions");
const attachmentPreviewOpenLink = document.getElementById("attachmentPreviewOpenLink");
const attachmentPreviewDownloadLink = document.getElementById("attachmentPreviewDownloadLink");
const recoverEmailInput = document.getElementById("recoverEmail");
const recoverMfaTokenInput = document.getElementById("recoverMfaToken");
const recoverNewPasswordInput = document.getElementById("recoverNewPassword");
const recoverConfirmPasswordInput = document.getElementById("recoverConfirmPassword");
const registerNameInput = document.getElementById("registerName");
const registerEmailInput = document.getElementById("registerEmail");
const registerPasswordInput = document.getElementById("registerPassword");
const registerPasswordConfirmInput = document.getElementById("registerPasswordConfirm");
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

const rbacSection = document.getElementById("rbacSection");
const rbacRoleSelect = document.getElementById("rbacRoleSelect");
const rbacReloadBtn = document.getElementById("rbacReloadBtn");
const rbacSaveBtn = document.getElementById("rbacSaveBtn");
const rbacTableBody = document.getElementById("rbacTableBody");
const rbacMeta = document.getElementById("rbacMeta");

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
const attachmentsContext = document.getElementById("attachmentsContext");
const attachmentsRepoFiltersForm = document.getElementById("attachmentsRepoFilters");
const attachmentsFilterQueryInput = document.getElementById("attachmentsFilterQuery");
const attachmentsFilterTypeInput = document.getElementById("attachmentsFilterType");
const attachmentsFilterOwnerInput = document.getElementById("attachmentsFilterOwner");
const attachmentsFilterFromInput = document.getElementById("attachmentsFilterFrom");
const attachmentsFilterToInput = document.getElementById("attachmentsFilterTo");
const attachmentsRepoBody = document.getElementById("attachmentsRepoBody");
const attachmentsRepoMeta = document.getElementById("attachmentsRepoMeta");
const attachmentsRepoPrevBtn = document.getElementById("attachmentsRepoPrev");
const attachmentsRepoNextBtn = document.getElementById("attachmentsRepoNext");
const attachmentsRepoPageInfo = document.getElementById("attachmentsRepoPageInfo");

const exportButtons = document.querySelectorAll(".export-btn");
const openReportBtn = document.getElementById("openReportBtn");
const authLaunchButtons = document.querySelectorAll(".auth-launch");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const dashboardSidebar = document.getElementById("dashboardSidebar");
const sidebarLinks = document.querySelectorAll(".sidebar-link");
const sidebarGroupToggles = document.querySelectorAll(".sidebar-group-toggle");
const sidebarGroups = document.querySelectorAll(".sidebar-group.is-collapsible");
const welcomeMessage = document.getElementById("welcomeMessage");
const notificationsBtn = document.getElementById("notificationsBtn");
const notificationsBadge = document.getElementById("notificationsBadge");
const notificationsDropdown = document.getElementById("notificationsDropdown");
const notificationsList = document.getElementById("notificationsList");
const notificationsEmpty = document.getElementById("notificationsEmpty");
const notificationsMarkAllBtn = document.getElementById("notificationsMarkAllBtn");
const notificationsOverlayRoot =
  document.getElementById("overlay-root") || document.getElementById("notificationsOverlayRoot");

const PRIORITY_VALUES = ["baja", "media", "alta", "observacion"];
const PRIORITY_LABELS = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  observacion: "Observacion informativa"
};
const TASK_STATUS_LABELS = Object.freeze({
  sin_realizar: "Sin realizar",
  en_proceso: "En proceso",
  pendiente_revision: "Pendiente revision",
  completada: "Completada",
  cancelada: "Cancelada"
});
const TASK_PRIORITY_LABELS = Object.freeze({
  baja: "Baja",
  media: "Media",
  alta: "Alta"
});
const PANEL_ROUTE_ALIASES = Object.freeze({
  "/bitacoras": "/resumen",
  "/reportes": "/informes"
});

const RBAC_ADMIN_REQUIRED_ACTIONS = Object.freeze([
  ["dashboard", "view"],
  ["resumen", "view"],
  ["registroNuevo", "view"],
  ["usuarios", "view"],
  ["usuarios", "administer"],
  ["auditoria", "view"],
  ["configuracion", "view"],
  ["configuracion", "administer"]
]);

const PANEL_ROUTES = new Set([
  "/dashboard",
  "/resumen",
  "/bitacoras",
  "/registro/nuevo",
  "/informes",
  "/reportes",
  "/tendencias",
  "/adjuntos",
  "/tareas",
  "/usuarios",
  "/usuarios/roles",
  "/plantillas",
  "/auditoria",
  "/configuracion"
]);
const PANEL_ROUTE_CAPABILITY_MAP = Object.freeze({
  "/dashboard": "dashboard",
  "/resumen": "resumen",
  "/bitacoras": "resumen",
  "/registro/nuevo": "registroNuevo",
  "/informes": "informes",
  "/reportes": "informes",
  "/tendencias": "tendencias",
  "/adjuntos": "adjuntos",
  "/tareas": "tareas",
  "/usuarios": "usuarios",
  "/usuarios/roles": "usuarios",
  "/plantillas": "plantillas",
  "/auditoria": "auditoria",
  "/configuracion": "configuracion"
});
const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 120;
const FULL_NAME_REGEX = /^[A-Za-z0-9]+(?:[ -][A-Za-z0-9]+)*$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "admin123",
  "123456",
  "123456789",
  "qwerty123",
  "letmein",
  "welcome",
  "changeme",
  "bitacora2026",
  "n1njahack2026"
]);

const ERROR_MESSAGES = {
  unauthorized: "Acceso no autorizado. Inicia sesion.",
  invalid_token: "Sesion invalida. Inicia sesion nuevamente.",
  invalid_csrf_token: "La sesion de seguridad vencio. Intenta nuevamente.",
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
  weak_password:
    "La contrasena debe tener minimo 12 caracteres, mayuscula, minuscula, numero y simbolo.",
  invalid_name: "Nombre completo invalido. Usa letras, numeros, espacios y guion medio.",
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
  invalid_file_name: "El nombre del archivo no es valido.",
  invalid_file_extension: "La extension del archivo no es valida para su tipo.",
  upload_storage_unavailable: "No hay espacio o permisos para guardar adjuntos. Contacta al administrador.",
  internal_server_error: "No se pudo completar la carga del archivo en este momento.",
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
    totalPages: 1,
    loading: false
  },
  sessionCapabilities: null,
  eventPayloadById: {},
  eventActionPermissions: {},
  editingEventId: null,
  selectedEventId: null,
  selectedEventPermissions: null,
  attachmentsRepo: {
    page: 1,
    pageSize: 20,
    totalPages: 1,
    total: 0
  },
  authView: "login",
  authPopup: false,
  pendingRefresh: null,
  chartJsPromise: null,
  performanceLite: false,
  sidebarOpen: true,
  pdfLogoDataUrl: "",
  pdfLogoFileName: "",
  rolePermissionMetadata: {
    roles: [],
    actions: [],
    modules: []
  },
  rolePermissionPolicies: {},
  rolePermissionLimits: {},
  rolePermissionUpdated: {},
  selectedRolePolicy: "funcionario",
  systemSettings: null,
  charts: {
    users: null,
    criticality: null,
    timeline: null
  },
  sidebarGroups: {},
  notifications: {
    items: [],
    unread: 0,
    open: false
  },
  sessionRuntime: {
    idleTimeoutMinutes: 120,
    warningMinutes: 5,
    keepAliveIntervalMinutes: 5
  },
  sessionLastActivityAt: null,
  sessionLastRefreshAt: null,
  sessionWarningVisible: false,
  registroComposerOpen: false,
  tasksComposerOpen: false,
  auditItemsById: {}
};

const APP_TIMEZONE = "America/Caracas";
const APP_TIMEZONE_OFFSET_MINUTES = 240;
const CARACAS_DATE_FORMATTER = new Intl.DateTimeFormat("es-VE", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric"
});
const CARACAS_DATETIME_FORMATTER = new Intl.DateTimeFormat("es-VE", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});
const SIDEBAR_GROUPS_STORAGE_KEY = "bitacora_sidebar_groups_v2";
const SIDEBAR_OPEN_STORAGE_KEY = "bitacora_sidebar_open_v1";
const REPORT_FILTER_DEBOUNCE_MS = 420;
const REALTIME_ROUTE_REFRESH_DEBOUNCE_MS = 260;
const REALTIME_RECONNECT_BASE_MS = 1500;
const REALTIME_RECONNECT_MAX_MS = 30000;
const sessionActivityEvents = ["mousemove", "click", "keydown", "scroll", "touchstart"];
let sessionWarningTimer = null;
let sessionExpiryTimer = null;
let sessionKeepAliveTimer = null;
let sessionLastRescheduleAt = 0;
let notificationsPollTimer = null;
let realtimeEventSource = null;
let realtimeReconnectTimer = null;
let realtimeReconnectDelayMs = REALTIME_RECONNECT_BASE_MS;
let realtimeRouteRefreshTimer = null;
let realtimeLastPayload = null;
let realtimeManualClose = false;
let reportFiltersDebounceTimer = null;
let reportLoadAbortController = null;
let reportLoadRequestId = 0;
let sidebarNavigationInFlight = false;
let reportWindowLaunchInFlight = false;

function clearElement(node) {
  if (!node) {
    return;
  }
  node.replaceChildren();
}

function toLocalISODate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
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

function normalizeDateInputValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch?.[1]) {
    return isoMatch[1];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const normalized = normalizeDateInputValue(dateValue);
  if (!normalized) {
    return String(dateValue);
  }

  const date = new Date(`${normalized}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return CARACAS_DATE_FORMATTER.format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return CARACAS_DATETIME_FORMATTER.format(parsed);
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

function normalizeFullNameInput(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function validateFullNameInput(value) {
  const normalized = normalizeFullNameInput(value);
  if (normalized.length < FULL_NAME_MIN_LENGTH || normalized.length > FULL_NAME_MAX_LENGTH) {
    return {
      valid: false,
      value: normalized,
      message: `El nombre debe tener entre ${FULL_NAME_MIN_LENGTH} y ${FULL_NAME_MAX_LENGTH} caracteres.`
    };
  }

  if (!FULL_NAME_REGEX.test(normalized)) {
    return {
      valid: false,
      value: normalized,
      message: "El nombre solo permite letras, numeros, espacios simples y guion medio."
    };
  }

  return { valid: true, value: normalized };
}

function compactIdentity(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s\-_@.]+/g, "");
}

function validateStrongPasswordInput(password, options = {}) {
  const value = String(password || "");
  if (!STRONG_PASSWORD_REGEX.test(value)) {
    return {
      valid: false,
      message:
        "La contrasena debe tener minimo 12 caracteres, mayuscula, minuscula, numero y simbolo."
    };
  }

  const compactPassword = compactIdentity(value);
  if (COMMON_WEAK_PASSWORDS.has(value.toLowerCase()) || COMMON_WEAK_PASSWORDS.has(compactPassword)) {
    return {
      valid: false,
      message: "La contrasena es muy comun. Usa una mas robusta."
    };
  }

  const normalizedEmail = String(options.email || "").trim().toLowerCase();
  if (normalizedEmail) {
    const emailLocalPart = normalizedEmail.split("@")[0] || normalizedEmail;
    if (
      value.toLowerCase() === normalizedEmail ||
      compactPassword === compactIdentity(emailLocalPart)
    ) {
      return {
        valid: false,
        message: "La contrasena no puede ser igual a tu correo."
      };
    }
  }

  const normalizedName = normalizeFullNameInput(options.name || "");
  if (normalizedName && compactPassword === compactIdentity(normalizedName)) {
    return {
      valid: false,
      message: "La contrasena no puede ser igual a tu nombre."
    };
  }

  return { valid: true };
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
      return `Demasiadas solicitudes. Intenta en ${retry}s.`;
    }
    return "Demasiadas solicitudes. Intenta en unos segundos.";
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

function canAccessPanel(path = getCurrentPanelPath()) {
  const capabilityKey = PANEL_ROUTE_CAPABILITY_MAP[path];
  if (!capabilityKey) {
    return false;
  }
  return Boolean(state.sessionCapabilities?.panels?.[capabilityKey]);
}

function canManageTemplates() {
  return Boolean(state.sessionCapabilities?.actions?.templates?.manage);
}

function canFilterByUser() {
  return Boolean(state.sessionCapabilities?.actions?.reports?.filterByUser);
}

function canManageUsers() {
  return Boolean(state.sessionCapabilities?.actions?.users?.manage);
}

function canViewTasksScope() {
  const taskActions = state.sessionCapabilities?.actions?.tasks;
  return Boolean(taskActions?.viewAny || taskActions?.viewOwnCreated || taskActions?.viewAssigned);
}

function canChangeOwnPassword() {
  return Boolean(state.sessionCapabilities?.actions?.users?.changeOwnPassword);
}

function canCreateEvent() {
  return Boolean(state.sessionCapabilities?.actions?.events?.create);
}

function canExportReports() {
  return Boolean(state.sessionCapabilities?.actions?.reports?.export);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getRolePolicyFor(roleKey) {
  if (!roleKey) {
    return null;
  }
  const policy = state.rolePermissionPolicies?.[roleKey];
  if (!policy || typeof policy !== "object") {
    return null;
  }
  return policy;
}

function getRolePolicyLimitFor(roleKey) {
  if (!roleKey) {
    return null;
  }
  const limit = state.rolePermissionLimits?.[roleKey];
  if (!limit || typeof limit !== "object") {
    return null;
  }
  return limit;
}

function isAdminRequiredRbacAction(roleKey, moduleKey, actionKey) {
  if (roleKey !== "admin") {
    return false;
  }
  return RBAC_ADMIN_REQUIRED_ACTIONS.some(
    ([requiredModule, requiredAction]) => requiredModule === moduleKey && requiredAction === actionKey
  );
}

function formatRbacUpdatedMeta(roleKey) {
  const record = state.rolePermissionUpdated?.[roleKey];
  if (!record) {
    return "Sin historial reciente.";
  }

  const updatedBy = record.updatedByName || record.updatedByEmail || "Sistema";
  const updatedAt = record.updatedAt ? formatDateTime(record.updatedAt) : "sin fecha";
  return `Ultima actualizacion: ${updatedAt} por ${updatedBy}.`;
}

function setRbacMetaMessage(message) {
  if (!rbacMeta) {
    return;
  }
  security.setSafeText(rbacMeta, message);
}

function renderRolePolicyRoleOptions() {
  if (!rbacRoleSelect) {
    return;
  }

  clearElement(rbacRoleSelect);
  const roles = Array.isArray(state.rolePermissionMetadata?.roles)
    ? state.rolePermissionMetadata.roles
    : [];

  if (!roles.length) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Sin roles";
    rbacRoleSelect.appendChild(emptyOption);
    rbacRoleSelect.disabled = true;
    return;
  }

  roles.forEach((roleKey) => {
    const option = document.createElement("option");
    option.value = roleKey;
    option.textContent = formatRoleLabel(roleKey);
    rbacRoleSelect.appendChild(option);
  });

  if (!roles.includes(state.selectedRolePolicy)) {
    state.selectedRolePolicy = roles[0];
  }

  rbacRoleSelect.value = state.selectedRolePolicy;
  rbacRoleSelect.disabled = false;
}

function renderRolePolicyTable() {
  if (!rbacTableBody) {
    return;
  }

  clearElement(rbacTableBody);

  const roleKey = state.selectedRolePolicy;
  const modules = Array.isArray(state.rolePermissionMetadata?.modules)
    ? state.rolePermissionMetadata.modules
    : [];
  const actions = Array.isArray(state.rolePermissionMetadata?.actions)
    ? state.rolePermissionMetadata.actions
    : [];
  const rolePolicy = getRolePolicyFor(roleKey);
  const roleLimit = getRolePolicyLimitFor(roleKey);

  if (!roleKey || !modules.length || !actions.length || !rolePolicy || !roleLimit) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "No hay politicas para mostrar.";
    row.appendChild(cell);
    rbacTableBody.appendChild(row);
    setRbacMetaMessage("Sin politicas disponibles.");
    return;
  }

  modules.forEach((moduleItem) => {
    const row = document.createElement("tr");

    const moduleCell = document.createElement("td");
    const title = document.createElement("strong");
    title.textContent = moduleItem.label || moduleItem.key;
    moduleCell.appendChild(title);

    if (moduleItem.description) {
      const description = document.createElement("p");
      description.className = "help-text rbac-module-description";
      description.textContent = moduleItem.description;
      moduleCell.appendChild(description);
    }

    row.appendChild(moduleCell);

    actions.forEach((actionKey) => {
      const value = Boolean(rolePolicy?.[moduleItem.key]?.[actionKey]);
      const allowedByLimit = Boolean(roleLimit?.[moduleItem.key]?.[actionKey]);
      const isRequiredAdminAction = isAdminRequiredRbacAction(roleKey, moduleItem.key, actionKey);

      const cell = document.createElement("td");
      cell.className = "rbac-action-cell";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = value;
      checkbox.dataset.role = roleKey;
      checkbox.dataset.module = moduleItem.key;
      checkbox.dataset.action = actionKey;

      const shouldDisable =
        !canManageUsers() ||
        (!allowedByLimit && !value) ||
        isRequiredAdminAction;

      checkbox.disabled = shouldDisable;
      if (!allowedByLimit && !value) {
        checkbox.title = "Bloqueado por limite base del rol";
      }
      if (isRequiredAdminAction) {
        checkbox.title = "Accion critica requerida para el rol administrador";
      }

      cell.appendChild(checkbox);

      if (isRequiredAdminAction) {
        const badge = document.createElement("span");
        badge.className = "rbac-lock-indicator";
        badge.textContent = "Critico";
        cell.appendChild(badge);
      } else if (!allowedByLimit && !value) {
        const badge = document.createElement("span");
        badge.className = "rbac-limit-indicator";
        badge.textContent = "Base";
        cell.appendChild(badge);
      }

      row.appendChild(cell);
    });

    rbacTableBody.appendChild(row);
  });

  setRbacMetaMessage(formatRbacUpdatedMeta(roleKey));
}

function getSystemSettingsPayloadFromForm() {
  const payload = {
    pagination: {
      reportPageSizeDefault: Number(settingReportPageSizeDefaultInput?.value || 0),
      reportPageSizeMax: Number(settingReportPageSizeMaxInput?.value || 0),
      tasksPageSizeDefault: Number(settingTasksPageSizeDefaultInput?.value || 0),
      tasksPageSizeMax: Number(settingTasksPageSizeMaxInput?.value || 0)
    },
    dashboard: {
      eventsDays: Number(settingEventsDaysInput?.value || 0),
      tasksSummaryDays: Number(settingTasksSummaryDaysInput?.value || 0),
      tasksRecentLimit: Number(settingTasksRecentLimitInput?.value || 0)
    },
    features: {
      templatesEnabled: Boolean(settingTemplatesEnabledInput?.checked),
      taskExportsEnabled: Boolean(settingTaskExportsEnabledInput?.checked),
      reportExportsEnabled: Boolean(settingReportExportsEnabledInput?.checked)
    },
    session: {
      idleTimeoutMinutes: Number(settingSessionIdleTimeoutInput?.value || 0),
      warningMinutes: Number(settingSessionWarningMinutesInput?.value || 0),
      keepAliveIntervalMinutes: Number(settingSessionKeepAliveMinutesInput?.value || 0)
    }
  };

  return payload;
}

function setSystemSettingsFormValues(settings) {
  if (!settings || typeof settings !== "object") {
    return;
  }

  if (settingReportPageSizeDefaultInput) {
    settingReportPageSizeDefaultInput.value = String(settings?.pagination?.reportPageSizeDefault ?? "");
  }
  if (settingReportPageSizeMaxInput) {
    settingReportPageSizeMaxInput.value = String(settings?.pagination?.reportPageSizeMax ?? "");
  }
  if (settingTasksPageSizeDefaultInput) {
    settingTasksPageSizeDefaultInput.value = String(settings?.pagination?.tasksPageSizeDefault ?? "");
  }
  if (settingTasksPageSizeMaxInput) {
    settingTasksPageSizeMaxInput.value = String(settings?.pagination?.tasksPageSizeMax ?? "");
  }
  if (settingEventsDaysInput) {
    settingEventsDaysInput.value = String(settings?.dashboard?.eventsDays ?? "");
  }
  if (settingTasksSummaryDaysInput) {
    settingTasksSummaryDaysInput.value = String(settings?.dashboard?.tasksSummaryDays ?? "");
  }
  if (settingTasksRecentLimitInput) {
    settingTasksRecentLimitInput.value = String(settings?.dashboard?.tasksRecentLimit ?? "");
  }
  if (settingTemplatesEnabledInput) {
    settingTemplatesEnabledInput.checked = Boolean(settings?.features?.templatesEnabled);
  }
  if (settingTaskExportsEnabledInput) {
    settingTaskExportsEnabledInput.checked = Boolean(settings?.features?.taskExportsEnabled);
  }
  if (settingReportExportsEnabledInput) {
    settingReportExportsEnabledInput.checked = Boolean(settings?.features?.reportExportsEnabled);
  }
  if (settingSessionIdleTimeoutInput) {
    settingSessionIdleTimeoutInput.value = String(settings?.session?.idleTimeoutMinutes ?? "");
  }
  if (settingSessionWarningMinutesInput) {
    settingSessionWarningMinutesInput.value = String(settings?.session?.warningMinutes ?? "");
  }
  if (settingSessionKeepAliveMinutesInput) {
    settingSessionKeepAliveMinutesInput.value = String(settings?.session?.keepAliveIntervalMinutes ?? "");
  }
}

function validateSystemSettingsPayload(payload) {
  const pagination = payload?.pagination || {};
  const session = payload?.session || {};

  if (pagination.reportPageSizeDefault > pagination.reportPageSizeMax) {
    return {
      valid: false,
      message: "El default de reportes no puede ser mayor al maximo."
    };
  }

  if (pagination.tasksPageSizeDefault > pagination.tasksPageSizeMax) {
    return {
      valid: false,
      message: "El default de tareas no puede ser mayor al maximo."
    };
  }

  if (session.warningMinutes >= session.idleTimeoutMinutes) {
    return {
      valid: false,
      message: "La advertencia de sesion debe ser menor al timeout de inactividad."
    };
  }

  if (session.keepAliveIntervalMinutes >= session.idleTimeoutMinutes) {
    return {
      valid: false,
      message: "El keepalive debe ser menor al timeout de inactividad."
    };
  }

  return { valid: true };
}

function setSettingsMetaMessage(message) {
  if (!settingsMeta) {
    return;
  }
  security.setSafeText(settingsMeta, message);
}

function getEventActionPermissions(eventId) {
  return state.eventActionPermissions[String(eventId)] || null;
}

function canModifyEvent(eventId) {
  return Boolean(getEventActionPermissions(eventId)?.canEdit);
}

function canDeleteEvent(eventId) {
  return Boolean(getEventActionPermissions(eventId)?.canDelete);
}

function canUploadToSelectedEvent() {
  return Boolean(state.selectedEventPermissions?.canUpload);
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
  const raw = String(pathname || "").split("#")[0].split("?")[0].trim();
  if (!raw || raw === "/") {
    return "/";
  }
  return raw.replace(/\/+$/, "");
}

function toCanonicalPanelPath(pathname = window.location.pathname) {
  const normalized = normalizePathname(pathname);
  return PANEL_ROUTE_ALIASES[normalized] || normalized;
}

function getCurrentPanelPath() {
  const canonicalPath = toCanonicalPanelPath(window.location.pathname);
  const hashValue = String(window.location.hash || "").toLowerCase();
  if (canonicalPath === "/usuarios" && hashValue === "#roles") {
    return "/usuarios/roles";
  }
  return canonicalPath;
}

function isPanelRoute(path = getCurrentPanelPath()) {
  return PANEL_ROUTES.has(path) || Boolean(PANEL_ROUTE_ALIASES[path]);
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

function saveSidebarOpenPreference() {
  try {
    window.localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, state.sidebarOpen ? "1" : "0");
  } catch (_error) {
    // Ignore localStorage errors.
  }
}

function loadSidebarOpenPreference() {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    if (raw === "1") {
      return true;
    }
    if (raw === "0") {
      return false;
    }
  } catch (_error) {
    // Ignore localStorage errors.
  }
  return null;
}

function loadSidebarGroupPreferences() {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch (_error) {
    return {};
  }
}

function saveSidebarGroupPreferences() {
  try {
    window.localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(state.sidebarGroups || {}));
  } catch (_error) {
    // Ignore localStorage errors.
  }
}

function setSidebarOpen(nextState, options = {}) {
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

  if (options.persist !== false) {
    saveSidebarOpenPreference();
  }
}

function setSidebarGroupExpanded(groupId, expanded, options = {}) {
  const normalizedGroupId = String(groupId || "").trim();
  if (!normalizedGroupId) {
    return;
  }

  const group = Array.from(sidebarGroups).find((item) => item.dataset.groupId === normalizedGroupId);
  if (!group) {
    return;
  }

  const isExpanded = Boolean(expanded);
  const content = group.querySelector(".sidebar-group-content");
  const toggle = group.querySelector(".sidebar-group-toggle");
  group.classList.toggle("is-collapsed", !isExpanded);
  if (content) {
    content.classList.toggle("hidden", !isExpanded);
  }
  if (toggle) {
    toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  }

  state.sidebarGroups[normalizedGroupId] = isExpanded;
  if (options.persist !== false) {
    saveSidebarGroupPreferences();
  }
}

function syncSidebarActiveLink() {
  const currentPath = getCurrentPanelPath();
  let activeGroupId = "";

  sidebarLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }
    const href = toCanonicalPanelPath(link.getAttribute("href") || "");
    const isActive = href === currentPath;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      activeGroupId = String(link.dataset.group || "");
    }
  });

  sidebarGroups.forEach((group) => {
    const groupId = String(group.dataset.groupId || "");
    group.classList.toggle("is-active", Boolean(groupId && groupId === activeGroupId));
  });

  if (activeGroupId && activeGroupId !== "dashboard") {
    setSidebarGroupExpanded(activeGroupId, true, { persist: false });
  }
}

function syncSidebarGroupsVisibility() {
  sidebarGroups.forEach((group) => {
    const groupLinks = Array.from(group.querySelectorAll(".sidebar-link"));
    const visibleLinks = groupLinks.filter((link) => !link.classList.contains("hidden"));
    const shouldHide = visibleLinks.length === 0;
    group.classList.toggle("hidden", shouldHide);
    if (!shouldHide) {
      const groupId = String(group.dataset.groupId || "");
      const preferred = state.sidebarGroups[groupId];
      setSidebarGroupExpanded(groupId, preferred !== false, { persist: false });
    }
  });
}

function updateSidebarRoleLinks() {
  sidebarLinks.forEach((button) => {
    if (!(button instanceof HTMLAnchorElement)) {
      return;
    }

    const required = button.dataset.requires;
    const hrefPath = toCanonicalPanelPath(button.getAttribute("href") || "");

    if (required === "templates") {
      button.classList.toggle("hidden", !canAccessPanel("/plantillas"));
      return;
    }

    if (required === "admin") {
      if (hrefPath === "/usuarios" || hrefPath === "/usuarios/roles") {
        button.classList.toggle("hidden", !(canAccessPanel("/usuarios") && canManageUsers()));
        return;
      }
      button.classList.toggle("hidden", !canAccessPanel(hrefPath));
      return;
    }
  });

  syncSidebarGroupsVisibility();
  syncSidebarActiveLink();
}

function initializeSidebarGroups() {
  state.sidebarGroups = loadSidebarGroupPreferences();

  sidebarGroupToggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLButtonElement)) {
      return;
    }
    const group = toggle.closest(".sidebar-group");
    const groupId = String(group?.dataset.groupId || "");
    if (!groupId) {
      return;
    }

    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") !== "true";
      setSidebarGroupExpanded(groupId, isExpanded);
    });
  });

  syncSidebarGroupsVisibility();
}

function setEventEditorMode(nextMode = "create", options = {}) {
  const requestedEditId = Number(options.eventId || 0);
  const isEditMode = nextMode === "edit" && Number.isInteger(requestedEditId) && requestedEditId > 0;
  state.editingEventId = isEditMode ? requestedEditId : null;

  if (registroSection) {
    registroSection.classList.toggle("registro-editing", isEditMode);
  }

  if (registroTitle) {
    registroTitle.textContent = isEditMode ? `Editar bitacora #${requestedEditId}` : "Nueva bitacora";
  }

  if (registroModeHint) {
    if (isEditMode) {
      registroModeHint.textContent =
        "Actualiza los campos necesarios y guarda cambios sobre el mismo registro.";
      registroModeHint.classList.remove("hidden");
    } else {
      registroModeHint.textContent = "";
      registroModeHint.classList.add("hidden");
    }
  }

  if (eventSubmitBtn) {
    eventSubmitBtn.textContent = isEditMode ? "Guardar cambios" : "Guardar en bitacora";
  }

  if (eventCancelBtn) {
    eventCancelBtn.classList.toggle("hidden", !isEditMode);
  }

  if (!isEditMode && state.user?.name && encargadoInput) {
    encargadoInput.value = state.user.name;
  }

  state.registroComposerOpen = isEditMode || state.registroComposerOpen;
  syncRegistroComposerState();
}

function syncRegistroComposerState() {
  if (!registroComposerPanel) {
    return;
  }

  const isEditMode = Number.isInteger(state.editingEventId) && Number(state.editingEventId) > 0;
  const shouldShow = isEditMode || Boolean(state.registroComposerOpen);
  registroComposerPanel.classList.toggle("hidden", !shouldShow);

  if (registroNewEventBtn) {
    registroNewEventBtn.disabled = isEditMode;
    registroNewEventBtn.setAttribute("aria-expanded", shouldShow ? "true" : "false");
    registroNewEventBtn.textContent = shouldShow && !isEditMode ? "Cerrar panel" : "+ Nueva bitacora";
  }

  if (resumenNewEventBtn) {
    resumenNewEventBtn.disabled = isEditMode;
    resumenNewEventBtn.setAttribute("aria-expanded", shouldShow ? "true" : "false");
    resumenNewEventBtn.textContent = shouldShow && !isEditMode ? "Cerrar panel" : "+ Nueva bitacora";
  }
}

function openRegistroComposer() {
  state.registroComposerOpen = true;
  if (eventForm) {
    eventForm.reset();
  }
  setDateDefaults();
  setEventEditorMode("create");
  syncRegistroComposerState();
  const currentRoute = getCurrentPanelPath();
  if (currentRoute === "/resumen" || currentRoute === "/informes") {
    applyRouteMode();
  }
}

function closeRegistroComposer() {
  const isEditMode = Number.isInteger(state.editingEventId) && Number(state.editingEventId) > 0;
  if (isEditMode) {
    return;
  }
  state.registroComposerOpen = false;
  syncRegistroComposerState();
  const currentRoute = getCurrentPanelPath();
  if (currentRoute === "/resumen" || currentRoute === "/informes") {
    applyRouteMode();
  }
}

function refreshAttachmentUploadState() {
  const submitButton = attachmentForm.querySelector('button[type="submit"]');
  const hasSelection = Boolean(state.selectedEventId);
  const canUpload = hasSelection && canUploadToSelectedEvent();

  if (attachmentsContext) {
    attachmentsContext.classList.toggle("hidden", !hasSelection);
  }

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
    `Registro #${state.selectedEventId} en modo lectura. No tienes permisos para subir adjuntos.`;
}

function clearSession() {
  state.user = null;
  state.sessionCapabilities = null;
  state.users = [];
  state.templates = [];
  state.eventPayloadById = {};
  state.eventActionPermissions = {};
  state.setupToken = null;
  state.report = {
    page: 1,
    pageSize: Number(pageSizeInput.value || 20),
    totalPages: 1
  };
  state.editingEventId = null;
  state.selectedEventId = null;
  state.selectedEventPermissions = null;
  state.attachmentsRepo = { page: 1, pageSize: 20, totalPages: 1, total: 0 };
  state.authView = getRequestedAuthView();
  state.authPopup = getAuthPopupMode();
  state.sidebarOpen = true;
  state.rolePermissionMetadata = {
    roles: [],
    actions: [],
    modules: []
  };
  state.rolePermissionPolicies = {};
  state.rolePermissionLimits = {};
  state.rolePermissionUpdated = {};
  state.selectedRolePolicy = "funcionario";
  state.systemSettings = null;
  state.sidebarGroups = loadSidebarGroupPreferences();
  state.notifications = { items: [], unread: 0, open: false };
  state.sessionRuntime = { idleTimeoutMinutes: 120, warningMinutes: 5, keepAliveIntervalMinutes: 5 };
  state.sessionLastActivityAt = null;
  state.sessionLastRefreshAt = null;
  state.sessionWarningVisible = false;
  state.registroComposerOpen = false;
  state.tasksComposerOpen = false;
  state.auditItemsById = {};

  stopSessionRuntimeHandlers();
  stopNotificationsPolling();
  stopRealtimeStream();
  setNotificationsOpen(false);

  setKpi({});
  clearElement(dateSummary);
  clearElement(reportBody);
  clearElement(trendByDate);
  clearElement(trendPriority);
  clearElement(trendTopUsers);
  clearElement(templateList);
  clearElement(notificationsList);
  clearElement(attachmentList);
  clearElement(attachmentsRepoBody);
  attachmentEventId.value = "";
  attachmentFileInput.value = "";
  if (attachmentsRepoMeta) {
    attachmentsRepoMeta.textContent = "";
  }
  if (attachmentsRepoPageInfo) {
    attachmentsRepoPageInfo.textContent = "Pagina 1 de 1";
  }
  if (attachmentsRepoFiltersForm) {
    attachmentsRepoFiltersForm.reset();
  }
  loginForm.reset();
  registerForm.reset();
  mfaEnableForm.reset();
  eventForm.reset();
  setEventEditorMode("create");
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
  if (rbacRoleSelect) {
    rbacRoleSelect.replaceChildren();
  }
  if (rbacTableBody) {
    clearElement(rbacTableBody);
  }
  if (rbacMeta) {
    rbacMeta.textContent = "Sin datos de permisos.";
  }
  if (systemSettingsForm) {
    systemSettingsForm.reset();
  }
  if (notificationsDropdown) {
    notificationsDropdown.classList.add("hidden");
  }
  if (notificationsBtn) {
    notificationsBtn.setAttribute("aria-expanded", "false");
  }
  if (notificationsBadge) {
    notificationsBadge.classList.add("hidden");
    notificationsBadge.textContent = "0";
  }
  closeAttachmentPreview();
  if (settingsMeta) {
    settingsMeta.textContent = "Sin configuracion cargada.";
  }
  closeRecoverModal();
  refreshAttachmentUploadState();
  syncSidebarActiveLink();
}

function applySessionUser(userPayload) {
  if (!userPayload || typeof userPayload !== "object") {
    state.user = null;
    state.sessionCapabilities = null;
    return false;
  }

  const userId = Number(userPayload.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    state.user = null;
    state.sessionCapabilities = null;
    return false;
  }

  state.user = {
    id: userId,
    name: String(userPayload.name || ""),
    email: String(userPayload.email || ""),
    role: String(userPayload.role || "")
  };
  state.sessionCapabilities = userPayload.capabilities && typeof userPayload.capabilities === "object"
    ? userPayload.capabilities
    : null;

  return Boolean(state.sessionCapabilities);
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
  state.eventPayloadById = {};
  state.eventActionPermissions = {};

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
    const rowPermissions = item?.permissions || {};
    const eventId = Number(item.id || 0);
    const canEdit = Boolean(rowPermissions.canEdit);
    const canDelete = Boolean(rowPermissions.canDelete);
    const canViewAttachments = rowPermissions.canViewAttachments !== false;
    const canUploadAttachments = Boolean(rowPermissions.canUploadAttachments);

    state.eventActionPermissions[String(eventId)] = {
      canEdit,
      canDelete,
      canUploadAttachments,
      canViewAttachments
    };

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
    attachmentButton.dataset.eventId = String(eventId);
    attachmentButton.textContent = `Adjuntos (${item.attachmentsCount || 0})`;
    attachmentButton.disabled = !canViewAttachments;
    tdAttachments.appendChild(attachmentButton);

    const tdActions = document.createElement("td");
    const actionWrap = document.createElement("div");
    actionWrap.className = "row-actions";

    state.eventPayloadById[eventId] = {
      id: eventId,
      fecha: normalizeDateInputValue(item.fecha),
      descripcionActividad: item.descripcionActividad || "",
      observacion: item.observacion || "",
      prioridad: normalizePriority(item.prioridad),
      templateName: item.templateName || "-",
      templateId:
        item.templateId === null || item.templateId === undefined
          ? null
          : Number(item.templateId),
      encargado: item.encargado || "-"
    };

    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "btn btn-ghost event-view";
    viewButton.dataset.eventId = String(eventId);
    viewButton.textContent = "Ver";
    actionWrap.appendChild(viewButton);

    if (canEdit) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "btn btn-ghost event-edit";
      editButton.dataset.eventId = String(eventId);
      editButton.textContent = "Editar";
      actionWrap.appendChild(editButton);
    }

    if (canDelete) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn btn-ghost event-delete";
      deleteButton.dataset.eventId = String(eventId);
      deleteButton.textContent = "Eliminar";
      actionWrap.appendChild(deleteButton);
    }

    if (!canEdit && !canDelete) {
      const readOnlyTag = document.createElement("span");
      readOnlyTag.className = "help-text";
      readOnlyTag.textContent = "Solo lectura";
      actionWrap.appendChild(readOnlyTag);
    }

    tdActions.appendChild(actionWrap);

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

function renderDashboardAlerts(alerts = {}) {
  if (!dashboardAlertsList) {
    return;
  }

  clearElement(dashboardAlertsList);
  if (!canViewTasksScope()) {
    const empty = document.createElement("article");
    empty.className = "dashboard-alert-empty";
    empty.textContent = "No tienes permisos para visualizar tareas.";
    dashboardAlertsList.appendChild(empty);
    return;
  }

  const items = [
    {
      label: "Tareas vencidas",
      value: Number(alerts.tareasVencidas || 0),
      className: "alert-critical",
      route: "/tareas?alert=vencidas"
    },
    {
      label: "Tareas criticas",
      value: Number(alerts.tareasCriticas || 0),
      className: "alert-critical",
      route: "/tareas?alert=criticas&priority=alta"
    },
    {
      label: "Tareas prioridad alta",
      value: Number(alerts.tareasAlta || alerts.tareasCriticas || 0),
      className: "alert-high",
      route: "/tareas?priority=alta"
    },
    {
      label: "Tareas prioridad media",
      value: Number(alerts.tareasMedia || 0),
      className: "alert-medium",
      route: "/tareas?priority=media"
    },
    {
      label: "Tareas prioridad baja",
      value: Number(alerts.tareasBaja || 0),
      className: "alert-low",
      route: "/tareas?priority=baja"
    },
    {
      label: "Pendientes de revision",
      value: Number(alerts.tareasPendienteRevision || 0),
      className: "alert-medium",
      route: "/tareas?status=pendiente_revision"
    },
    {
      label: "En proceso",
      value: Number(alerts.tareasEnProceso || 0),
      className: "alert-neutral",
      route: "/tareas?status=en_proceso"
    },
    {
      label: "Sin realizar",
      value: Number(alerts.tareasSinRealizar || 0),
      className: "alert-neutral",
      route: "/tareas?status=sin_realizar"
    },
    {
      label: "Bitacoras criticas (7 dias)",
      value: Number(alerts.bitacorasCriticas || 0),
      className: "alert-neutral",
      route: "/resumen"
    }
  ];

  if (!items.length) {
    const empty = document.createElement("article");
    empty.className = "dashboard-alert-empty";
    empty.textContent = "No hay alertas operativas";
    dashboardAlertsList.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const chip = document.createElement("article");
    chip.className = `dashboard-alert-chip ${item.className} dashboard-alert-chip-clickable`;
    if (Number(item.value) === 0) {
      chip.classList.add("is-zero");
    }
    chip.tabIndex = 0;
    chip.setAttribute("role", "button");
    chip.setAttribute("aria-label", `Abrir ${item.label}`);

    const title = document.createElement("p");
    title.className = "dashboard-alert-label";
    security.setSafeText(title, item.label);

    const value = document.createElement("strong");
    value.className = "dashboard-alert-value";
    security.setSafeText(value, item.value);

    const meta = document.createElement("p");
    meta.className = "dashboard-alert-meta";
    security.setSafeText(meta, Number(item.value) > 0 ? "Requiere atencion" : "Sin pendientes");

    chip.addEventListener("click", () => {
      if (item.route) {
        window.location.href = item.route;
      }
    });
    chip.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && item.route) {
        event.preventDefault();
        window.location.href = item.route;
      }
    });

    chip.appendChild(title);
    chip.appendChild(value);
    chip.appendChild(meta);
    dashboardAlertsList.appendChild(chip);
  });
}

function renderDashboardActivity(items = []) {
  if (!dashboardActivityList || !dashboardActivityEmpty) {
    return;
  }

  clearElement(dashboardActivityList);
  const entries = Array.isArray(items) ? items : [];
  dashboardActivityEmpty.classList.toggle("hidden", entries.length > 0);

  entries.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    li.className = "dashboard-activity-item";

    const action = document.createElement("p");
    action.className = "dashboard-activity-action";
    security.setSafeText(
      action,
      `${item.userName || "Sistema"}: ${String(item.action || "accion").replace(/_/g, " ")}`
    );

    const meta = document.createElement("p");
    meta.className = "dashboard-activity-meta";
    security.setSafeText(meta, `${item.entity || "sistema"} #${item.entityId || "-"} | ${formatDateTime(item.createdAt)}`);

    li.appendChild(action);
    li.appendChild(meta);
    dashboardActivityList.appendChild(li);
  });
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

  renderDashboardAlerts(data?.alerts || {});
  renderDashboardActivity(data?.recentActivity || []);

  const chartReady = await ensureChartJsLoaded();
  if (!chartReady) {
    destroySocCharts();
    showToast("No se pudo cargar el modulo de graficas del dashboard.", "error");
    return;
  }

  renderSocDashboardCharts(data);
}

function formatDashboardTaskDate(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "-";
  }
  const parsed = new Date(`${normalized}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }
  return CARACAS_DATE_FORMATTER.format(parsed);
}

function renderDashboardTaskChip(content, extraClassName = "") {
  const chip = document.createElement("span");
  chip.className = `dashboard-task-chip ${extraClassName}`.trim();
  security.setSafeText(chip, content);
  return chip;
}

function setDashboardTasksSummaryLoading(isLoading, message = "Cargando resumen de tareas...") {
  if (dashboardTasksLoading) {
    dashboardTasksLoading.classList.toggle("hidden", !isLoading);
    security.setSafeText(dashboardTasksLoading, message);
  }
}

function buildDashboardTaskDetailBody(task) {
  const assignees = Array.isArray(task?.assignedUserIds)
    ? task.assignedUserIds.map((id) => `#${id}`).join(", ")
    : "-";

  return [
    `Titulo: ${task?.title || "-"}`,
    `Descripcion: ${task?.description || "-"}`,
    `Estado: ${TASK_STATUS_LABELS[task?.status] || task?.status || "-"}`,
    `Prioridad: ${TASK_PRIORITY_LABELS[task?.priority] || task?.priority || "-"}`,
    `Asignado principal: ${task?.assignedTo?.name || "Sin asignar"}`,
    `Asignados: ${assignees}`,
    `Inicio: ${formatDashboardTaskDate(task?.startDate)}`,
    `Vence: ${formatDashboardTaskDate(task?.dueDate)}`,
    `Actualizada: ${formatDateTime(task?.updatedAt)}`,
    "",
    "Adjuntos: gestionados en modulo Adjuntos.",
    "Auditoria: disponible en el modulo Auditoria."
  ].join("\n");
}

async function openDashboardTaskDetail(task) {
  const taskId = Number(task?.id || 0);
  if (!taskId) {
    return;
  }

  const { response, data, networkError } = await apiAuth(`/tasks/${taskId}`);
  if (networkError) {
    showToast("No hay conexion para cargar detalle de tarea.", "error");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (response.status === 403) {
      showToast("No tienes permisos para consultar esta tarea.", "error");
      return;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return;
  }

  const detail = data && typeof data === "object" ? data : task;
  const meta = [
    `Estado: ${TASK_STATUS_LABELS[detail.status] || detail.status || "-"}`,
    `Prioridad: ${TASK_PRIORITY_LABELS[detail.priority] || detail.priority || "-"}`,
    `Asignado: ${detail.assignedTo?.name || "Sin asignar"}`
  ].join(" | ");

  openEntityModal({
    title: `Tarea #${taskId}`,
    meta,
    body: buildDashboardTaskDetailBody(detail),
    actions: [
      {
        label: "Abrir en Tareas",
        href: `/tareas?focus=${taskId}`
      }
    ]
  });
}

function renderDashboardTasksSummary(summary) {
  if (!dashboardTasksSummaryCard) {
    return;
  }

  const totals = summary?.totals || {};
  const recent = Array.isArray(summary?.recent) ? summary.recent : [];
  const dueSoonDays = Number(summary?.range?.dueSoonDays || 7);

  security.setSafeText(dashboardTasksRange, `Vencimiento proximo en ${dueSoonDays} dia(s)`);
  security.setSafeText(dashboardTasksTotal, Number(totals.total || 0));
  security.setSafeText(dashboardTasksPending, Number(totals.sinRealizar || 0));
  security.setSafeText(dashboardTasksInProgress, Number(totals.enProceso || 0));
  security.setSafeText(dashboardTasksCompleted, Number(totals.completada || 0));
  security.setSafeText(dashboardTasksOverdue, Number(totals.vencidas || 0));
  security.setSafeText(dashboardTasksAssignedToMe, Number(totals.asignadasAMi || 0));

  clearElement(dashboardTasksRecentList);
  setDashboardTasksSummaryLoading(false);

  if (!recent.length) {
    if (dashboardTasksEmptyState) {
      dashboardTasksEmptyState.classList.remove("hidden");
    }
    return;
  }

  if (dashboardTasksEmptyState) {
    dashboardTasksEmptyState.classList.add("hidden");
  }

  recent.forEach((task) => {
    const item = document.createElement("li");
    item.className = "dashboard-task-item dashboard-task-item-clickable";
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Ver detalle de tarea ${task.title || task.id}`);

    const title = document.createElement("p");
    title.className = "dashboard-task-item-title";
    security.setSafeText(title, `#${task.id} ${task.title || "Tarea"}`);

    const meta = document.createElement("p");
    meta.className = "dashboard-task-item-meta";
    const assignedTo = task.assignedTo?.name || "Sin asignar";
    security.setSafeText(
      meta,
      `Asignado: ${assignedTo} | Vence: ${formatDashboardTaskDate(task.dueDate)}`
    );

    const badges = document.createElement("div");
    badges.className = "dashboard-task-item-badges";
    badges.appendChild(
      renderDashboardTaskChip(
        TASK_STATUS_LABELS[task.status] || task.status || "Sin estado",
        `status-${String(task.status || "").toLowerCase()}`
      )
    );
    badges.appendChild(
      renderDashboardTaskChip(
        TASK_PRIORITY_LABELS[task.priority] || task.priority || "Sin prioridad",
        `priority-${String(task.priority || "").toLowerCase()}`
      )
    );

    const openLink = document.createElement("a");
    openLink.href = `/tareas?focus=${task.id}`;
    openLink.className = "dashboard-task-open-link";
    openLink.textContent = "Abrir en Tareas";
    openLink.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    item.addEventListener("click", () => {
      void openDashboardTaskDetail(task);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void openDashboardTaskDetail(task);
      }
    });

    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(badges);
    item.appendChild(openLink);
    dashboardTasksRecentList.appendChild(item);
  });
}

async function loadDashboardTasksSummary() {
  if (!dashboardTasksSummaryCard || !canViewTasksScope()) {
    return;
  }

  setDashboardTasksSummaryLoading(true);
  if (dashboardTasksEmptyState) {
    dashboardTasksEmptyState.classList.add("hidden");
  }

  const { response, data, networkError } = await apiAuth("/tasks/dashboard-summary?days=7&recentLimit=5");
  if (networkError) {
    setDashboardTasksSummaryLoading(false, "No hay conexion para resumen de tareas.");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    setDashboardTasksSummaryLoading(false, resolveErrorMessage(data?.error, data?.details));
    return;
  }

  renderDashboardTasksSummary(data);
}

function resolveAuditEventAppearance(action) {
  const normalized = String(action || "").toLowerCase();
  if (normalized.startsWith("auth.")) {
    return { icon: "AUTH", className: "audit-auth" };
  }
  if (normalized.startsWith("task.")) {
    return { icon: "TASK", className: "audit-task" };
  }
  if (normalized.startsWith("events.")) {
    return { icon: "BIT", className: "audit-event" };
  }
  if (normalized.startsWith("settings.") || normalized.startsWith("rbac.")) {
    return { icon: "CFG", className: "audit-config" };
  }
  return { icon: "LOG", className: "audit-generic" };
}

function renderAuditTimeline(items = []) {
  if (!auditTimeline) {
    return;
  }

  clearElement(auditTimeline);
  state.auditItemsById = {};

  if (!Array.isArray(items) || items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "audit-timeline-empty";
    security.setSafeText(empty, "Sin eventos auditados en el rango seleccionado.");
    auditTimeline.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const id = Number(item.id || 0);
    if (id > 0) {
      state.auditItemsById[String(id)] = item;
    }

    const appearance = resolveAuditEventAppearance(item.action);

    const li = document.createElement("li");
    li.className = `audit-timeline-item ${appearance.className}`;

    const icon = document.createElement("span");
    icon.className = "audit-timeline-icon";
    security.setSafeText(icon, appearance.icon);

    const content = document.createElement("div");
    content.className = "audit-timeline-content";

    const title = document.createElement("p");
    title.className = "audit-timeline-title";
    security.setSafeText(title, String(item.action || "accion").replace(/_/g, " "));

    const meta = document.createElement("p");
    meta.className = "audit-timeline-meta";
    security.setSafeText(
      meta,
      `${item.userName || "Sistema"} | ${item.entity || "sistema"} #${item.entityId || "-"} | ${formatDateTime(
        item.createdAt
      )}`
    );

    const detailBtn = document.createElement("button");
    detailBtn.type = "button";
    detailBtn.className = "btn btn-ghost audit-detail-btn";
    detailBtn.dataset.auditId = String(id || "");
    detailBtn.textContent = "Detalle";

    content.appendChild(title);
    content.appendChild(meta);
    content.appendChild(detailBtn);

    li.appendChild(icon);
    li.appendChild(content);
    auditTimeline.appendChild(li);
  });
}

function populateAuditUserFilterOptions(items = []) {
  if (!auditUserFilter) {
    return;
  }

  const selected = String(auditUserFilter.value || "");
  const optionsById = new Map();

  if (Array.isArray(state.users)) {
    state.users.forEach((user) => {
      const id = Number(user?.id || 0);
      if (id > 0) {
        optionsById.set(String(id), String(user.name || user.email || `Usuario #${id}`));
      }
    });
  }

  if (Array.isArray(items)) {
    items.forEach((item) => {
      const id = Number(item?.userId || 0);
      if (id > 0 && !optionsById.has(String(id))) {
        optionsById.set(String(id), String(item.userName || item.userEmail || `Usuario #${id}`));
      }
    });
  }

  clearElement(auditUserFilter);

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "Todos";
  auditUserFilter.appendChild(allOption);

  Array.from(optionsById.entries())
    .sort((left, right) => left[1].localeCompare(right[1], "es", { sensitivity: "base" }))
    .forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      auditUserFilter.appendChild(option);
    });

  if (selected && optionsById.has(selected)) {
    auditUserFilter.value = selected;
  }
}

function resolveAuditDetailRoute(item) {
  const entity = String(item?.entity || "").toLowerCase();
  const entityId = Number(item?.entityId || 0);
  if (entity === "task" && entityId > 0) {
    return `/tareas?focus=${entityId}`;
  }
  if (entity === "event") {
    return "/informes";
  }
  if (entity === "role_permission_policy") {
    return "/usuarios/roles";
  }
  if (entity === "system_settings") {
    return "/configuracion";
  }
  return "";
}

function handleAuditTimelineClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const detailButton = target.closest(".audit-detail-btn");
  if (!(detailButton instanceof HTMLButtonElement)) {
    return;
  }

  const auditId = String(detailButton.dataset.auditId || "").trim();
  const item = state.auditItemsById?.[auditId];
  if (!item) {
    return;
  }

  const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const body = [
    `Accion: ${String(item.action || "-").replace(/_/g, " ")}`,
    `Entidad: ${item.entity || "-"}`,
    `ID entidad: ${item.entityId || "-"}`,
    `Usuario: ${item.userName || item.userEmail || "Sistema"}`,
    `IP: ${item.ipAddress || "-"}`,
    `User-Agent: ${item.userAgent || "-"}`,
    "",
    "Metadata:",
    JSON.stringify(metadata, null, 2)
  ].join("\n");

  const detailRoute = resolveAuditDetailRoute(item);
  const actions = detailRoute
    ? [
        {
          label: "Abrir recurso",
          href: detailRoute
        }
      ]
    : [];

  openEntityModal({
    title: `Auditoria #${item.id}`,
    meta: `${formatDateTime(item.createdAt)} | ${item.userName || "Sistema"}`,
    body,
    actions
  });
}

async function loadAuditPanel() {
  if (!auditSection || !auditTimeline || !auditTableMeta) {
    return;
  }

  if (!canAccessPanel("/auditoria")) {
    security.setSafeText(auditTableMeta, "Sin permisos para consultar auditoria.");
    renderAuditTimeline([]);
    return;
  }

  if (canFilterByUser() && state.users.length === 0) {
    await loadUsers();
  }

  security.setSafeText(auditTableMeta, "Cargando auditoria...");

  const params = new URLSearchParams({ page: "1", pageSize: "40" });
  const from = String(auditFromDate?.value || "").trim();
  const to = String(auditToDate?.value || "").trim();
  const action = String(auditActionFilter?.value || "").trim();
  const userId = Number(auditUserFilter?.value || 0);

  if (from) {
    params.set("from", from);
  }
  if (to) {
    params.set("to", to);
  }
  if (action) {
    params.set("action", action);
  }
  if (Number.isInteger(userId) && userId > 0) {
    params.set("userId", String(userId));
  }

  const { response, data, networkError } = await apiAuth(`/audit?${params.toString()}`);

  if (networkError) {
    security.setSafeText(auditTableMeta, "No hay conexion para cargar auditoria.");
    renderAuditTimeline([]);
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (response.status === 403) {
      security.setSafeText(auditTableMeta, "Sin permisos para consultar auditoria.");
      renderAuditTimeline([]);
      return;
    }
    security.setSafeText(auditTableMeta, resolveErrorMessage(data?.error, data?.details));
    renderAuditTimeline([]);
    return;
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  renderAuditTimeline(items);
  populateAuditUserFilterOptions(items);

  const total = Number(data?.pagination?.totalItems || items.length || 0);
  security.setSafeText(auditTableMeta, `Mostrando ${items.length} de ${total} evento(s).`);
}

async function loadRolePermissionsPanel() {
  if (!rbacSection || !rbacRoleSelect || !rbacTableBody) {
    return;
  }

  if (!canManageUsers()) {
    setRbacMetaMessage("Sin permisos para administrar roles y permisos.");
    clearElement(rbacTableBody);
    return;
  }

  setButtonBusy(rbacSaveBtn, true, "Cargando...");
  setRbacMetaMessage("Cargando politicas de permisos...");

  const { response, data, networkError } = await apiAuth("/roles-permissions");
  setButtonBusy(rbacSaveBtn, false);

  if (networkError) {
    setRbacMetaMessage("No hay conexion para cargar roles y permisos.");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (response.status === 403) {
      setRbacMetaMessage("Sin permisos para administrar roles y permisos.");
      return;
    }
    setRbacMetaMessage(resolveErrorMessage(data?.error, data?.details));
    return;
  }

  state.rolePermissionMetadata = {
    roles: Array.isArray(data?.roles) ? data.roles : [],
    actions: Array.isArray(data?.actions) ? data.actions : [],
    modules: Array.isArray(data?.modules) ? data.modules : []
  };
  state.rolePermissionPolicies =
    data?.policies && typeof data.policies === "object" ? cloneJson(data.policies) : {};
  state.rolePermissionLimits =
    data?.limits && typeof data.limits === "object" ? cloneJson(data.limits) : {};
  state.rolePermissionUpdated =
    data?.updated && typeof data.updated === "object" ? cloneJson(data.updated) : {};

  renderRolePolicyRoleOptions();
  renderRolePolicyTable();
}

async function handleRbacRoleChange(event) {
  const nextRole = String(event?.target?.value || "").trim();
  if (!nextRole) {
    return;
  }
  state.selectedRolePolicy = nextRole;
  renderRolePolicyTable();
}

function handleRbacTableChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
    return;
  }

  const roleKey = String(target.dataset.role || "").trim();
  const moduleKey = String(target.dataset.module || "").trim();
  const actionKey = String(target.dataset.action || "").trim();
  if (!roleKey || !moduleKey || !actionKey) {
    return;
  }

  const policy = getRolePolicyFor(roleKey);
  const limit = getRolePolicyLimitFor(roleKey);
  if (!policy || !limit) {
    target.checked = false;
    return;
  }

  const allowedByLimit = Boolean(limit?.[moduleKey]?.[actionKey]);
  const isRequiredAdminAction = isAdminRequiredRbacAction(roleKey, moduleKey, actionKey);
  if ((target.checked && !allowedByLimit) || (!target.checked && isRequiredAdminAction)) {
    target.checked = Boolean(policy?.[moduleKey]?.[actionKey]);
    return;
  }

  if (!policy[moduleKey]) {
    policy[moduleKey] = {};
  }
  policy[moduleKey][actionKey] = target.checked;

  state.rolePermissionPolicies[roleKey] = policy;
}

async function handleRbacSave() {
  if (!canManageUsers()) {
    showToast("No tienes permisos para administrar roles y permisos.", "error");
    return;
  }

  const roleKey = String(rbacRoleSelect?.value || "").trim();
  const policy = getRolePolicyFor(roleKey);
  if (!roleKey || !policy) {
    showToast("Selecciona un rol valido.", "error");
    return;
  }

  setButtonBusy(rbacSaveBtn, true, "Guardando...");

  const { response, data, networkError } = await apiAuth(`/roles-permissions/${roleKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions: policy })
  });

  setButtonBusy(rbacSaveBtn, false);

  if (networkError) {
    showToast("No hay conexion para guardar permisos.", "error");
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

  if (data?.permissions) {
    state.rolePermissionPolicies[roleKey] = cloneJson(data.permissions);
  }

  setRbacMetaMessage("Permisos actualizados correctamente. Recargando estado...");
  showToast("Permisos del rol actualizados correctamente.", "success");
  await loadRolePermissionsPanel();
}

async function handleRbacReload() {
  await loadRolePermissionsPanel();
}

async function loadSystemSettingsPanel() {
  if (!settingsSection || !systemSettingsForm) {
    return;
  }

  if (!canAccessPanel("/configuracion")) {
    setSettingsMetaMessage("Sin permisos para consultar configuracion.");
    return;
  }

  setButtonBusy(settingsSaveBtn, true, "Cargando...");
  setSettingsMetaMessage("Cargando configuracion...");

  const { response, data, networkError } = await apiAuth("/settings");
  setButtonBusy(settingsSaveBtn, false);

  if (networkError) {
    setSettingsMetaMessage("No hay conexion para cargar configuracion.");
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (response.status === 403) {
      setSettingsMetaMessage("Sin permisos para consultar configuracion.");
      return;
    }
    setSettingsMetaMessage(resolveErrorMessage(data?.error, data?.details));
    return;
  }

  state.systemSettings = cloneJson(data || {});
  setSystemSettingsFormValues(state.systemSettings);
  state.sessionRuntime = normalizeSessionRuntimeConfig(state.systemSettings?.session);
  setSettingsMetaMessage("Configuracion cargada correctamente.");
}

async function handleSystemSettingsSave(event) {
  event.preventDefault();

  if (!canAccessPanel("/configuracion")) {
    showToast("No tienes permisos para modificar configuracion.", "error");
    return;
  }

  const payload = getSystemSettingsPayloadFromForm();
  const validation = validateSystemSettingsPayload(payload);
  if (!validation.valid) {
    showToast(validation.message, "error");
    return;
  }

  setButtonBusy(settingsSaveBtn, true, "Guardando...");

  const { response, data, networkError } = await apiAuth("/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  setButtonBusy(settingsSaveBtn, false);

  if (networkError) {
    showToast("No hay conexion para actualizar configuracion.", "error");
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

  if (data?.settings) {
    state.systemSettings = cloneJson(data.settings);
    setSystemSettingsFormValues(state.systemSettings);
    state.sessionRuntime = normalizeSessionRuntimeConfig(state.systemSettings?.session);
    if (state.user) {
      state.sessionLastActivityAt = Date.now();
      scheduleSessionRuntimeHandlers();
    }
  }

  setSettingsMetaMessage("Configuracion actualizada correctamente.");
  showToast("Configuracion actualizada correctamente.", "success");
}

async function handleSystemSettingsReload() {
  await loadSystemSettingsPanel();
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

function isAttachmentPreviewable(mimeType) {
  const normalized = String(mimeType || "").toLowerCase();
  return [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain"
  ].includes(normalized);
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
    security.setSafeText(name, file.originalName);
    const details = document.createElement("p");
    details.className = "help-text";
    security.setSafeText(
      details,
      `${formatBytes(file.sizeBytes)} | ${formatDate(file.createdAt?.slice(0, 10))} | ${file.mimeType || "desconocido"}`
    );
    meta.appendChild(name);
    meta.appendChild(details);

    const actions = document.createElement("div");
    actions.className = "attachment-actions";

    if (isAttachmentPreviewable(file.mimeType)) {
      const previewBtn = document.createElement("button");
      previewBtn.type = "button";
      previewBtn.className = "btn btn-ghost attachment-preview";
      previewBtn.dataset.attachmentId = String(file.id);
      previewBtn.dataset.attachmentName = String(file.originalName || "Adjunto");
      previewBtn.dataset.attachmentMime = String(file.mimeType || "");
      previewBtn.textContent = "Preview";
      actions.appendChild(previewBtn);
    }

    const link = document.createElement("a");
    link.href = `/events/attachments/${file.id}/download`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Descargar";
    link.dataset.attachmentId = String(file.id);
    actions.appendChild(link);

    if (file?.permissions?.canEdit) {
      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      renameBtn.className = "btn btn-ghost attachment-rename";
      renameBtn.dataset.attachmentId = String(file.id);
      renameBtn.dataset.attachmentName = String(file.originalName || "");
      renameBtn.textContent = "Renombrar";
      actions.appendChild(renameBtn);
    }

    if (file?.permissions?.canDelete) {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-ghost attachment-delete";
      deleteBtn.dataset.attachmentId = String(file.id);
      deleteBtn.textContent = "Eliminar";
      actions.appendChild(deleteBtn);
    }

    item.appendChild(meta);
    item.appendChild(actions);
    attachmentList.appendChild(item);
  });
}

function setAttachmentsRepositoryMeta(message = "") {
  if (attachmentsRepoMeta) {
    attachmentsRepoMeta.textContent = message;
  }
}

function syncAttachmentsRepositoryPagination() {
  const page = Number(state.attachmentsRepo?.page || 1);
  const totalPages = Math.max(1, Number(state.attachmentsRepo?.totalPages || 1));
  const total = Math.max(0, Number(state.attachmentsRepo?.total || 0));

  if (attachmentsRepoPageInfo) {
    attachmentsRepoPageInfo.textContent = `Pagina ${page} de ${totalPages}`;
  }
  if (attachmentsRepoPrevBtn) {
    attachmentsRepoPrevBtn.disabled = page <= 1;
  }
  if (attachmentsRepoNextBtn) {
    attachmentsRepoNextBtn.disabled = page >= totalPages;
  }

  setAttachmentsRepositoryMeta(total > 0 ? `Adjuntos encontrados: ${total}` : "No hay adjuntos para los filtros aplicados.");
}

function renderAttachmentsRepository(items = []) {
  if (!attachmentsRepoBody) {
    return;
  }

  clearElement(attachmentsRepoBody);
  const rows = Array.isArray(items) ? items : [];

  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.className = "help-text";
    td.textContent = "No hay adjuntos operativos para mostrar.";
    tr.appendChild(td);
    attachmentsRepoBody.appendChild(tr);
    syncAttachmentsRepositoryPagination();
    return;
  }

  rows.forEach((file) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    const nameStrong = document.createElement("strong");
    security.setSafeText(nameStrong, file.originalName || "-");
    nameTd.appendChild(nameStrong);

    const typeTd = document.createElement("td");
    security.setSafeText(typeTd, file.mimeType || "-");

    const sizeTd = document.createElement("td");
    security.setSafeText(sizeTd, formatBytes(file.sizeBytes || 0));

    const ownerTd = document.createElement("td");
    security.setSafeText(ownerTd, file.ownerName || file.ownerEmail || `Usuario #${file.ownerId || "-"}`);

    const dateTd = document.createElement("td");
    security.setSafeText(dateTd, formatDateTime(file.createdAt));

    const relationTd = document.createElement("td");
    const relationBtn = document.createElement("button");
    relationBtn.type = "button";
    relationBtn.className = "btn btn-ghost attachments-select-event";
    relationBtn.dataset.eventId = String(file.eventId || "");
    relationBtn.textContent = file.relationLabel || `Bitacora #${file.eventId || "-"}`;
    relationTd.appendChild(relationBtn);

    const actionsTd = document.createElement("td");
    actionsTd.className = "attachment-actions";

    if (isAttachmentPreviewable(file.mimeType)) {
      const previewBtn = document.createElement("button");
      previewBtn.type = "button";
      previewBtn.className = "btn btn-ghost attachment-preview";
      previewBtn.dataset.attachmentId = String(file.id);
      previewBtn.dataset.attachmentName = String(file.originalName || "Adjunto");
      previewBtn.dataset.attachmentMime = String(file.mimeType || "");
      previewBtn.textContent = "Preview";
      actionsTd.appendChild(previewBtn);
    }

    const downloadLink = document.createElement("a");
    downloadLink.href = `/events/attachments/${file.id}/download`;
    downloadLink.target = "_blank";
    downloadLink.rel = "noopener noreferrer";
    downloadLink.className = "btn btn-ghost";
    downloadLink.textContent = "Descargar";
    actionsTd.appendChild(downloadLink);

    if (file?.permissions?.canEdit) {
      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      renameBtn.className = "btn btn-ghost attachment-rename";
      renameBtn.dataset.attachmentId = String(file.id);
      renameBtn.dataset.attachmentName = String(file.originalName || "");
      renameBtn.textContent = "Renombrar";
      actionsTd.appendChild(renameBtn);
    }

    if (file?.permissions?.canDelete) {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-ghost attachment-delete";
      deleteBtn.dataset.attachmentId = String(file.id);
      deleteBtn.textContent = "Eliminar";
      actionsTd.appendChild(deleteBtn);
    }

    tr.appendChild(nameTd);
    tr.appendChild(typeTd);
    tr.appendChild(sizeTd);
    tr.appendChild(ownerTd);
    tr.appendChild(dateTd);
    tr.appendChild(relationTd);
    tr.appendChild(actionsTd);
    attachmentsRepoBody.appendChild(tr);
  });

  syncAttachmentsRepositoryPagination();
}

function syncAttachmentsOwnerFilter() {
  if (!attachmentsFilterOwnerInput) {
    return;
  }

  const previousValue = String(attachmentsFilterOwnerInput.value || "");
  clearElement(attachmentsFilterOwnerInput);

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "Todos";
  attachmentsFilterOwnerInput.appendChild(allOption);

  if (Array.isArray(state.users) && state.users.length > 0) {
    state.users.forEach((user) => {
      const option = document.createElement("option");
      option.value = String(user.id);
      option.textContent = `${user.name || user.email || `Usuario #${user.id}`}`;
      attachmentsFilterOwnerInput.appendChild(option);
    });
  } else if (state.user?.sub) {
    const option = document.createElement("option");
    option.value = String(state.user.sub);
    option.textContent = `${state.user.name || state.user.email || "Mi usuario"}`;
    attachmentsFilterOwnerInput.appendChild(option);
  }

  attachmentsFilterOwnerInput.value = previousValue;
}

function buildAttachmentsRepositoryParams() {
  const params = new URLSearchParams();
  const page = Number(state.attachmentsRepo?.page || 1);
  const pageSize = Number(state.attachmentsRepo?.pageSize || 20);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  if (attachmentsFilterQueryInput?.value?.trim()) {
    params.set("q", attachmentsFilterQueryInput.value.trim());
  }
  if (attachmentsFilterTypeInput?.value) {
    params.set("mimeType", attachmentsFilterTypeInput.value);
  }
  if (attachmentsFilterOwnerInput?.value) {
    params.set("ownerId", attachmentsFilterOwnerInput.value);
  }
  if (attachmentsFilterFromInput?.value) {
    params.set("from", attachmentsFilterFromInput.value);
  }
  if (attachmentsFilterToInput?.value) {
    params.set("to", attachmentsFilterToInput.value);
  }

  return params;
}

async function loadAttachmentsRepository({ keepPage = false } = {}) {
  if (!attachmentsRepoBody) {
    return;
  }

  if (!keepPage) {
    state.attachmentsRepo.page = 1;
  }

  const params = buildAttachmentsRepositoryParams();
  setAttachmentsRepositoryMeta("Cargando adjuntos...");
  const { response, data, networkError } = await apiAuth(`/events/attachments?${params.toString()}`);

  if (networkError) {
    setAttachmentsRepositoryMeta("No hay conexion para cargar adjuntos.");
    return;
  }

  if (!response?.ok) {
    if (response?.status === 401) {
      handleUnauthorized();
      return;
    }
    setAttachmentsRepositoryMeta(resolveErrorMessage(data?.error, data?.details));
    return;
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  const pagination = data?.pagination && typeof data.pagination === "object" ? data.pagination : {};
  state.attachmentsRepo.page = Math.max(1, Number(pagination.page || state.attachmentsRepo.page || 1));
  state.attachmentsRepo.pageSize = Math.max(5, Number(pagination.pageSize || state.attachmentsRepo.pageSize || 20));
  state.attachmentsRepo.totalPages = Math.max(1, Number(pagination.totalPages || 1));
  state.attachmentsRepo.total = Math.max(0, Number(pagination.total || items.length));

  renderAttachmentsRepository(items);
}

function applyRouteMode() {
  const route = getCurrentPanelPath();
  const isEditingRecord =
    Number.isInteger(state.editingEventId) && Number(state.editingEventId) > 0;
  const showDashboard = route === "/dashboard";
  const showResumen = route === "/resumen";
  const showInformes = route === "/informes" && !isEditingRecord;
  const showTendencias = route === "/tendencias" && !isEditingRecord;
  const showAdjuntos = route === "/adjuntos";
  const showTareas = route === "/tareas";
  const showUsuarios = route === "/usuarios";
  const showRolesPermisos = route === "/usuarios/roles";
  const showPlantillas = route === "/plantillas";
  const showAuditoria = route === "/auditoria";
  const showConfiguracion = route === "/configuracion";
  const showBitacoraReport = showInformes || showResumen;
  const showRegistro =
    route === "/registro/nuevo" ||
    isEditingRecord ||
    (showBitacoraReport && Boolean(state.registroComposerOpen));

  if (!showRegistro) {
    state.registroComposerOpen = false;
  }

  if (isPanelRoute(route) && !canAccessPanel(route)) {
    window.location.href = "/dashboard";
    return;
  }

  setElementVisible(socDashboardSection, showDashboard);
  setElementVisible(dashboardTasksSummaryCard, showDashboard && canViewTasksScope());
  setElementVisible(kpiSection, showResumen);
  setElementVisible(registroSection, showRegistro);
  setElementVisible(informeSection, showBitacoraReport);
  setElementVisible(tendenciasSection, showTendencias || showResumen);
  setElementVisible(attachmentsCard, showAdjuntos);
  setElementVisible(tasksSection, showTareas);
  setElementVisible(resumenOpsSection, false);
  setElementVisible(mainWorkspaceSection, showRegistro || showBitacoraReport);
  setElementVisible(secondaryWorkspaceSection, showTendencias || showAdjuntos || showResumen);
  setElementVisible(adminTools, showUsuarios && canManageUsers());
  setElementVisible(rbacSection, showRolesPermisos && canManageUsers());
  setElementVisible(templateTools, showPlantillas && canManageTemplates());
  setElementVisible(auditSection, showAuditoria && canAccessPanel("/auditoria"));
  setElementVisible(settingsSection, showConfiguracion && canAccessPanel("/configuracion"));

  if (mainWorkspaceSection) {
    mainWorkspaceSection.classList.toggle("single-column", showRegistro || showBitacoraReport);
    mainWorkspaceSection.classList.toggle("registro-focus", showRegistro);
  }

  if (secondaryWorkspaceSection) {
    secondaryWorkspaceSection.classList.toggle(
      "single-column",
      showTendencias || showResumen || showAdjuntos
    );
  }

  syncRegistroComposerState();

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
  setEventEditorMode("create");
  setDateDefaults();

  const roleLabel = formatRoleLabel(state.user.role);

  if (welcomeMessage) {
    welcomeMessage.textContent = `Bienvenido, ${state.user.name}`;
  }
  sessionInfo.textContent = `${roleLabel} | ${state.user.email}`;
  encargadoInput.value = state.user.name;

  userFilterInput.disabled = !canFilterByUser();
  refreshAttachmentUploadState();
  syncAttachmentsOwnerFilter();
  updateSidebarRoleLinks();
  applyRouteMode();

  const savedSidebar = loadSidebarOpenPreference();
  const fallbackSidebar = !window.matchMedia("(max-width: 980px)").matches;
  setSidebarOpen(savedSidebar === null ? fallbackSidebar : savedSidebar, { persist: false });

  state.sessionLastActivityAt = Date.now();
  void loadSessionRuntimeConfig().then(() => {
    startSessionRuntimeHandlers();
  });
  startNotificationsPolling();
  startRealtimeStream();
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

function addClientTimezoneHeader(headers = {}) {
  return {
    ...headers,
    "x-client-timezone-offset": String(APP_TIMEZONE_OFFSET_MINUTES)
  };
}

function addCsrfHeaderIfNeeded(headers = {}, method = "GET") {
  const baseHeaders = addClientTimezoneHeader(headers);
  const normalizedMethod = String(method || "GET").toUpperCase();
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD" || normalizedMethod === "OPTIONS") {
    return baseHeaders;
  }

  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    return baseHeaders;
  }

  return {
    ...baseHeaders,
    "x-csrf-token": csrfToken
  };
}

async function api(path, options = {}) {
  const { timeoutMs = 20000, signal: externalSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const method = String(fetchOptions.method || "GET").toUpperCase();
  const forwardAbort = () => controller.abort();

  if (externalSignal && typeof externalSignal === "object" && "aborted" in externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", forwardAbort, { once: true });
    }
  }

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
    if (externalSignal && typeof externalSignal === "object" && "removeEventListener" in externalSignal) {
      externalSignal.removeEventListener("abort", forwardAbort);
    }
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
  const refreshed = Boolean(result.response?.ok);
  if (refreshed) {
    const now = Date.now();
    state.sessionLastRefreshAt = now;
    state.sessionLastActivityAt = now;
    state.sessionWarningVisible = false;
  }
  return refreshed;
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
  clearReportReloadDebounce();
  cancelPendingReportLoad();
  clearSession();
  renderAuthView();
  if (shouldNotify) {
    showToast("Sesion expirada. Inicia sesion nuevamente.", "error");
  }
}

async function loadUsers() {
  if (!canFilterByUser()) {
    state.users = [];
    syncAttachmentsOwnerFilter();
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
  syncAttachmentsOwnerFilter();
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

function setReportLoading(isLoading) {
  state.report.loading = Boolean(isLoading);

  const submitButton = filterForm?.querySelector('button[type="submit"]');
  if (submitButton instanceof HTMLButtonElement) {
    setButtonBusy(submitButton, state.report.loading, "Consultando...");
  }

  if (reportPrev instanceof HTMLButtonElement) {
    reportPrev.disabled = state.report.loading || state.report.page <= 1;
  }

  if (reportNext instanceof HTMLButtonElement) {
    reportNext.disabled = state.report.loading || state.report.page >= state.report.totalPages;
  }

  if (openReportBtn instanceof HTMLButtonElement) {
    openReportBtn.disabled = state.report.loading;
  }

  if (pageSizeInput instanceof HTMLSelectElement) {
    pageSizeInput.disabled = state.report.loading;
  }

  exportButtons.forEach((button) => {
    if (button instanceof HTMLButtonElement) {
      button.disabled = state.report.loading;
    }
  });
}

function clearReportReloadDebounce() {
  if (!reportFiltersDebounceTimer) {
    return;
  }
  window.clearTimeout(reportFiltersDebounceTimer);
  reportFiltersDebounceTimer = null;
}

function scheduleReportReload() {
  clearReportReloadDebounce();
  reportFiltersDebounceTimer = window.setTimeout(() => {
    reportFiltersDebounceTimer = null;
    const route = getCurrentPanelPath();
    if (route !== "/resumen" && route !== "/informes" && route !== "/tendencias") {
      return;
    }
    state.report.page = 1;
    void loadReport();
    if (route === "/resumen" || route === "/tendencias") {
      void loadTrends();
    }
  }, REPORT_FILTER_DEBOUNCE_MS);
}

function cancelPendingReportLoad() {
  if (reportLoadAbortController) {
    reportLoadAbortController.abort();
    reportLoadAbortController = null;
  }
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

  cancelPendingReportLoad();
  const currentController = new AbortController();
  reportLoadAbortController = currentController;
  const requestId = ++reportLoadRequestId;
  setReportLoading(true);

  try {
    const { response, data, networkError, timedOut } = await apiAuth(`/events/report?${params.toString()}`, {
      signal: currentController.signal
    });

    if (requestId !== reportLoadRequestId) {
      return;
    }

    if (networkError) {
      if (currentController.signal.aborted || timedOut) {
        return;
      }
      showToast("No hay conexion con el servidor.", "error");
      return;
    }

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      showToast(resolveErrorMessage(data?.error, data?.details || data), "error");
      return;
    }

    setKpi(data);
    renderSummaryChips(data);
    renderReportRows(data);
    renderPagination(data.pagination);
  } finally {
    if (requestId === reportLoadRequestId) {
      if (reportLoadAbortController === currentController) {
        reportLoadAbortController = null;
      }
      setReportLoading(false);
    }
  }
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
  state.selectedEventPermissions = null;
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

  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  const payloadPermissions = data && !Array.isArray(data) ? data.permissions : null;
  const fallbackPermissions = getEventActionPermissions(eventId);

  state.selectedEventPermissions = {
    canUpload: payloadPermissions
      ? Boolean(payloadPermissions.canUpload)
      : Boolean(fallbackPermissions?.canUploadAttachments),
    canView: payloadPermissions
      ? payloadPermissions.canView !== false
      : fallbackPermissions?.canViewAttachments !== false
  };
  refreshAttachmentUploadState();
  renderAttachments(items);
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

  return applySessionUser(data);
}


function normalizeSessionRuntimeConfig(runtime) {
  const source = runtime && typeof runtime === "object" ? runtime : {};

  const idleCandidate = Number(source.idleTimeoutMinutes || 120);
  const idleTimeoutMinutes = Math.min(1440, Math.max(5, Number.isFinite(idleCandidate) ? Math.trunc(idleCandidate) : 120));

  const warningCandidate = Number(source.warningMinutes || 5);
  const keepAliveCandidate = Number(source.keepAliveIntervalMinutes || 5);

  const warningMinutes = Math.min(
    idleTimeoutMinutes - 1,
    Math.max(1, Number.isFinite(warningCandidate) ? Math.trunc(warningCandidate) : 5)
  );
  const keepAliveIntervalMinutes = Math.min(
    idleTimeoutMinutes - 1,
    Math.max(1, Number.isFinite(keepAliveCandidate) ? Math.trunc(keepAliveCandidate) : 5)
  );

  return {
    idleTimeoutMinutes,
    warningMinutes,
    keepAliveIntervalMinutes
  };
}

async function loadSessionRuntimeConfig() {
  const { response, data, networkError } = await apiAuth("/auth/session-config", {
    timeoutMs: 8000
  });

  if (networkError || !response?.ok) {
    state.sessionRuntime = normalizeSessionRuntimeConfig(state.sessionRuntime);
    return state.sessionRuntime;
  }

  state.sessionRuntime = normalizeSessionRuntimeConfig(data?.session);
  return state.sessionRuntime;
}

function showSessionExpiryWarning() {
  if (!state.user || state.sessionWarningVisible) {
    return;
  }

  const runtime = normalizeSessionRuntimeConfig(state.sessionRuntime);
  state.sessionWarningVisible = true;

  openEntityModal({
    title: "Advertencia de sesion",
    meta: `Tu sesion expira en ${runtime.warningMinutes} minuto(s) por inactividad.`,
    body: "Selecciona continuar sesion para extender el tiempo activo y evitar cierre inesperado.",
    actions: [
      {
        label: "Continuar sesion",
        onClick: async () => {
          const refreshed = await refreshSession();
          if (!refreshed) {
            state.sessionWarningVisible = false;
            closeEntityModal();
            handleUnauthorized(false);
            showToast("La sesion no pudo renovarse. Inicia sesion nuevamente.", "error");
            return;
          }

          state.sessionWarningVisible = false;
          closeEntityModal();
          scheduleSessionRuntimeHandlers();
          showToast("Sesion extendida correctamente.", "success");
        }
      },
      {
        label: "Cerrar aviso",
        onClick: () => {
          state.sessionWarningVisible = false;
          closeEntityModal();
        }
      }
    ]
  });
}

async function handleSessionKeepAliveTick() {
  if (!state.user) {
    return;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    handleUnauthorized(false);
    showToast("La sesion no pudo renovarse. Inicia sesion nuevamente.", "error");
    return;
  }
}

function scheduleSessionRuntimeHandlers() {
  if (sessionWarningTimer) {
    window.clearTimeout(sessionWarningTimer);
    sessionWarningTimer = null;
  }
  if (sessionExpiryTimer) {
    window.clearTimeout(sessionExpiryTimer);
    sessionExpiryTimer = null;
  }
  if (sessionKeepAliveTimer) {
    window.clearInterval(sessionKeepAliveTimer);
    sessionKeepAliveTimer = null;
  }

  if (!state.user) {
    return;
  }

  const runtime = normalizeSessionRuntimeConfig(state.sessionRuntime);
  state.sessionRuntime = runtime;
  state.sessionWarningVisible = false;

  const now = Date.now();
  const lastActivityAt = Number(state.sessionLastActivityAt || now);
  const elapsed = Math.max(0, now - lastActivityAt);
  const idleTimeoutMs = runtime.idleTimeoutMinutes * 60 * 1000;

  if (elapsed >= idleTimeoutMs) {
    handleUnauthorized(false);
    showToast("Sesion expirada por inactividad.", "error");
    return;
  }

  const warningOffsetMs = runtime.warningMinutes * 60 * 1000;
  const warningDelay = Math.max(0, idleTimeoutMs - warningOffsetMs - elapsed);
  const expiryDelay = Math.max(0, idleTimeoutMs - elapsed);

  sessionWarningTimer = window.setTimeout(showSessionExpiryWarning, warningDelay);
  sessionExpiryTimer = window.setTimeout(() => {
    handleUnauthorized(false);
    showToast("Sesion expirada por inactividad.", "error");
  }, expiryDelay);

  const keepAliveMs = runtime.keepAliveIntervalMinutes * 60 * 1000;
  sessionKeepAliveTimer = window.setInterval(() => {
    if (!document.hidden) {
      void handleSessionKeepAliveTick();
    }
  }, keepAliveMs);
}

function handleSessionActivityEvent() {
  if (!state.user) {
    return;
  }

  const now = Date.now();
  state.sessionLastActivityAt = now;
  if (state.sessionWarningVisible) {
    state.sessionWarningVisible = false;
    closeEntityModal();
  }

  if (now - sessionLastRescheduleAt >= 1000) {
    sessionLastRescheduleAt = now;
    scheduleSessionRuntimeHandlers();
  }

  const runtime = normalizeSessionRuntimeConfig(state.sessionRuntime);
  const keepAliveMs = runtime.keepAliveIntervalMinutes * 60 * 1000;
  const lastRefreshAt = Number(state.sessionLastRefreshAt || 0);
  const shouldTouchSession = now - lastRefreshAt >= Math.max(60000, Math.trunc(keepAliveMs * 0.8));
  if (shouldTouchSession && !document.hidden) {
    void handleSessionKeepAliveTick();
  }
}

function handleSessionVisibilityChange() {
  if (!state.user || document.hidden) {
    return;
  }
  handleSessionActivityEvent();
}

function startSessionRuntimeHandlers() {
  stopSessionRuntimeHandlers();
  const now = Date.now();
  state.sessionLastActivityAt = now;
  state.sessionLastRefreshAt = now;
  sessionLastRescheduleAt = now;
  sessionActivityEvents.forEach((eventName) => {
    window.addEventListener(eventName, handleSessionActivityEvent);
  });
  document.addEventListener("visibilitychange", handleSessionVisibilityChange);
  scheduleSessionRuntimeHandlers();
}

function stopSessionRuntimeHandlers() {
  if (sessionWarningTimer) {
    window.clearTimeout(sessionWarningTimer);
    sessionWarningTimer = null;
  }
  if (sessionExpiryTimer) {
    window.clearTimeout(sessionExpiryTimer);
    sessionExpiryTimer = null;
  }
  if (sessionKeepAliveTimer) {
    window.clearInterval(sessionKeepAliveTimer);
    sessionKeepAliveTimer = null;
  }
  state.sessionWarningVisible = false;
  sessionLastRescheduleAt = 0;

  sessionActivityEvents.forEach((eventName) => {
    window.removeEventListener(eventName, handleSessionActivityEvent);
  });
  document.removeEventListener("visibilitychange", handleSessionVisibilityChange);
}

function normalizeNotificationsPayload(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const unread = Number(payload?.summary?.unread || 0);
  return {
    items,
    unread: Math.max(0, unread),
    open: Boolean(state.notifications?.open)
  };
}

function mountNotificationsOverlay() {
  if (!notificationsDropdown || !notificationsOverlayRoot) {
    return;
  }

  if (!notificationsOverlayRoot.contains(notificationsDropdown)) {
    notificationsOverlayRoot.appendChild(notificationsDropdown);
  }
}

function positionNotificationsDropdown() {
  if (!notificationsDropdown || !notificationsBtn || !state.notifications?.open) {
    return;
  }

  const triggerRect = notificationsBtn.getBoundingClientRect();
  const maxWidth = Math.max(260, Math.min(420, window.innerWidth - 16));
  notificationsDropdown.style.width = `${maxWidth}px`;
  notificationsDropdown.style.position = "fixed";

  const leftCandidate = triggerRect.right - maxWidth;
  const safeLeft = Math.max(8, Math.min(leftCandidate, window.innerWidth - maxWidth - 8));
  notificationsDropdown.style.left = `${safeLeft}px`;

  const dropdownHeight = notificationsDropdown.offsetHeight || 320;
  const belowTop = triggerRect.bottom + 8;
  const aboveTop = triggerRect.top - dropdownHeight - 8;
  const canRenderBelow = belowTop + dropdownHeight <= window.innerHeight - 8;
  const top = canRenderBelow ? belowTop : Math.max(8, aboveTop);
  notificationsDropdown.style.top = `${top}px`;
}

function handleNotificationsViewportChange() {
  if (!state.notifications?.open) {
    return;
  }
  positionNotificationsDropdown();
}

function setNotificationsOpen(isOpen) {
  const open = Boolean(isOpen);
  state.notifications.open = open;
  mountNotificationsOverlay();

  if (notificationsDropdown) {
    notificationsDropdown.classList.toggle("hidden", !open);
    if (!open) {
      notificationsDropdown.style.removeProperty("top");
      notificationsDropdown.style.removeProperty("left");
      notificationsDropdown.style.removeProperty("width");
    }
  }
  if (notificationsBtn) {
    notificationsBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (notificationsOverlayRoot) {
    notificationsOverlayRoot.classList.toggle("is-open", open);
    notificationsOverlayRoot.setAttribute("aria-hidden", open ? "false" : "true");
  }

  if (open) {
    positionNotificationsDropdown();
    window.addEventListener("resize", handleNotificationsViewportChange);
    window.addEventListener("scroll", handleNotificationsViewportChange, true);
  } else {
    window.removeEventListener("resize", handleNotificationsViewportChange);
    window.removeEventListener("scroll", handleNotificationsViewportChange, true);
  }
}

function renderNotificationsDropdown() {
  if (!notificationsList || !notificationsBadge || !notificationsEmpty) {
    return;
  }

  const items = Array.isArray(state.notifications?.items) ? state.notifications.items : [];
  const unread = items.filter((item) => !item.read).length;
  state.notifications.unread = unread;

  clearElement(notificationsList);

  if (unread > 0) {
    notificationsBadge.classList.remove("hidden");
    security.setSafeText(notificationsBadge, unread);
  } else {
    notificationsBadge.classList.add("hidden");
    security.setSafeText(notificationsBadge, "0");
  }

  if (!items.length) {
    notificationsEmpty.classList.remove("hidden");
    return;
  }

  notificationsEmpty.classList.add("hidden");

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = `notifications-item ${item.read ? "is-read" : "is-unread"}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "notifications-item-btn";
    button.dataset.notificationKey = String(item.key || "");
    button.dataset.route = String(item.route || "/dashboard");

    const title = document.createElement("p");
    title.className = "notifications-item-title";
    security.setSafeText(title, item.title || "Notificacion");

    const message = document.createElement("p");
    message.className = "notifications-item-message";
    security.setSafeText(message, item.message || "Sin detalle.");

    const meta = document.createElement("p");
    meta.className = "notifications-item-meta";
    security.setSafeText(meta, formatDateTime(item.createdAt));

    button.appendChild(title);
    button.appendChild(message);
    button.appendChild(meta);
    li.appendChild(button);
    notificationsList.appendChild(li);
  });

  positionNotificationsDropdown();
}

async function loadNotifications(options = {}) {
  if (!notificationsList || !canAccessPanel("/dashboard")) {
    return;
  }

  const silent = options?.silent === true;
  const { response, data, networkError } = await apiAuth("/notifications?limit=40");

  if (networkError) {
    if (!silent) {
      showToast("No hay conexion para cargar notificaciones.", "error");
    }
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!silent) {
      showToast(resolveErrorMessage(data?.error, data?.details), "error");
    }
    return;
  }

  state.notifications = normalizeNotificationsPayload(data);
  renderNotificationsDropdown();
}

async function markNotificationRead(notificationKey) {
  const key = String(notificationKey || "").trim();
  if (!key) {
    return false;
  }

  const { response, data, networkError } = await apiAuth(`/notifications/${encodeURIComponent(key)}/read`, {
    method: "PATCH"
  });

  if (networkError) {
    showToast("No hay conexion para marcar la notificacion.", "error");
    return false;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
      return false;
    }
    showToast(resolveErrorMessage(data?.error, data?.details), "error");
    return false;
  }

  if (Array.isArray(state.notifications?.items)) {
    state.notifications.items = state.notifications.items.map((item) =>
      item.key === key ? { ...item, read: true } : item
    );
  }
  renderNotificationsDropdown();
  return true;
}

async function markAllNotificationsRead() {
  const unreadKeys = (Array.isArray(state.notifications?.items) ? state.notifications.items : [])
    .filter((item) => !item.read)
    .map((item) => item.key)
    .filter(Boolean);

  if (!unreadKeys.length) {
    return;
  }

  const { response, data, networkError } = await apiAuth("/notifications/read-all", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ keys: unreadKeys })
  });

  if (networkError) {
    showToast("No hay conexion para actualizar notificaciones.", "error");
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

  state.notifications.items = state.notifications.items.map((item) => ({
    ...item,
    read: true
  }));
  renderNotificationsDropdown();
}

async function handleNotificationsListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const itemButton = target.closest(".notifications-item-btn");
  if (!(itemButton instanceof HTMLButtonElement)) {
    return;
  }

  const key = String(itemButton.dataset.notificationKey || "").trim();
  const route = String(itemButton.dataset.route || "/dashboard").trim();

  if (key) {
    await markNotificationRead(key);
  }

  setNotificationsOpen(false);

  if (route) {
    const current = `${window.location.pathname}${window.location.search}`;
    if (route !== current) {
      window.location.href = route;
    }
  }
}

function startNotificationsPolling() {
  stopNotificationsPolling();

  if (!canAccessPanel("/dashboard")) {
    return;
  }

  void loadNotifications({ silent: true });
  notificationsPollTimer = window.setInterval(() => {
    void loadNotifications({ silent: true });
  }, 60000);
}

function stopNotificationsPolling() {
  if (notificationsPollTimer) {
    window.clearInterval(notificationsPollTimer);
    notificationsPollTimer = null;
  }
}

function clearRealtimeReconnectTimer() {
  if (realtimeReconnectTimer) {
    window.clearTimeout(realtimeReconnectTimer);
    realtimeReconnectTimer = null;
  }
}

function stopRealtimeStream(options = {}) {
  const manual = options.manual !== false;
  realtimeManualClose = manual;
  clearRealtimeReconnectTimer();

  if (realtimeRouteRefreshTimer) {
    window.clearTimeout(realtimeRouteRefreshTimer);
    realtimeRouteRefreshTimer = null;
  }
  realtimeLastPayload = null;

  if (!realtimeEventSource) {
    return;
  }

  realtimeEventSource.onopen = null;
  realtimeEventSource.onerror = null;
  realtimeEventSource.onmessage = null;
  realtimeEventSource.close();
  realtimeEventSource = null;
}

function scheduleRealtimeReconnect() {
  if (realtimeManualClose || realtimeReconnectTimer || !state.user) {
    return;
  }

  const delayMs = realtimeReconnectDelayMs;
  realtimeReconnectTimer = window.setTimeout(() => {
    realtimeReconnectTimer = null;
    startRealtimeStream();
  }, delayMs);
  realtimeReconnectDelayMs = Math.min(
    REALTIME_RECONNECT_MAX_MS,
    Math.round(realtimeReconnectDelayMs * 1.7)
  );
}

function dispatchRealtimePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  try {
    window.dispatchEvent(
      new CustomEvent("bitacora:realtime", {
        detail: payload
      })
    );
  } catch (_error) {
    // No-op: no romper flujo principal por eventos de UI auxiliares.
  }
}

async function refreshRouteFromRealtime(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  const route = getCurrentPanelPath();
  const kind = String(payload.kind || "").toLowerCase();
  const isTaskEvent = kind.startsWith("task.");
  const isBitacoraEvent = kind.startsWith("event.");
  const isAttachmentEvent = kind.startsWith("attachment.");

  if (route === "/dashboard") {
    const tasksPromise = isTaskEvent ? loadDashboardTasksSummary() : Promise.resolve();
    await Promise.all([loadSocDashboard(), tasksPromise]);
    return;
  }

  if (isTaskEvent) {
    return;
  }

  if (route === "/resumen" || route === "/informes") {
    await loadReport();
  }

  if (route === "/resumen" || route === "/tendencias") {
    await loadTrends();
  }

  if (route === "/adjuntos") {
    await loadAttachmentsRepository({ keepPage: true });
  }

  if (state.selectedEventId && (isBitacoraEvent || isAttachmentEvent)) {
    const payloadEventId = Number(payload.eventId || payload.entityId || 0);
    if (!payloadEventId || payloadEventId === Number(state.selectedEventId)) {
      await loadAttachments(Number(state.selectedEventId));
    }
  }
}

function scheduleRouteRealtimeRefresh(payload) {
  realtimeLastPayload = payload;
  if (realtimeRouteRefreshTimer) {
    window.clearTimeout(realtimeRouteRefreshTimer);
  }
  realtimeRouteRefreshTimer = window.setTimeout(() => {
    realtimeRouteRefreshTimer = null;
    const currentPayload = realtimeLastPayload;
    realtimeLastPayload = null;
    void refreshRouteFromRealtime(currentPayload);
  }, REALTIME_ROUTE_REFRESH_DEBOUNCE_MS);
}

function handleRealtimeRawMessage(rawData) {
  if (!rawData) {
    return;
  }

  let payload = null;
  try {
    payload = JSON.parse(String(rawData || "{}"));
  } catch (_error) {
    return;
  }

  dispatchRealtimePayload(payload);
  scheduleRouteRealtimeRefresh(payload);
}

function startRealtimeStream() {
  if (!window.EventSource || !state.user) {
    return;
  }
  if (realtimeEventSource) {
    return;
  }

  realtimeManualClose = false;
  const source = new EventSource("/realtime/stream", { withCredentials: true });
  realtimeEventSource = source;

  source.onopen = () => {
    realtimeReconnectDelayMs = REALTIME_RECONNECT_BASE_MS;
  };

  source.onmessage = (event) => {
    handleRealtimeRawMessage(event?.data);
  };

  source.onerror = () => {
    if (realtimeManualClose) {
      return;
    }

    if (source.readyState === EventSource.CLOSED) {
      stopRealtimeStream({ manual: false });
      scheduleRealtimeReconnect();
    }
  };
}

async function loadDashboardData() {
  const route = getCurrentPanelPath();

  if (route === "/dashboard") {
    await Promise.all([loadSocDashboard(), loadDashboardTasksSummary()]);
    return;
  }

  if (route === "/resumen") {
    state.report.page = 1;
    state.report.pageSize = 10;
    if (pageSizeInput) {
      pageSizeInput.value = "10";
    }
    await Promise.all([loadUsers(), loadReport(), loadTrends()]);
    return;
  }

  if (route === "/registro/nuevo") {
    await loadTemplates();
    return;
  }

  if (route === "/informes") {
    state.report.page = 1;
    state.report.pageSize = 20;
    if (pageSizeInput) {
      pageSizeInput.value = "20";
    }
    await Promise.all([loadUsers(), loadReport()]);
    return;
  }

  if (route === "/tendencias") {
    await loadTrends();
    return;
  }

  if (route === "/adjuntos") {
    await Promise.all([loadUsers(), loadAttachmentsRepository()]);
    return;
  }

  if (route === "/tareas") {
    return;
  }

  if (route === "/usuarios") {
    await loadUsers();
    return;
  }

  if (route === "/usuarios/roles") {
    await loadRolePermissionsPanel();
    return;
  }

  if (route === "/plantillas") {
    await loadTemplates();
    return;
  }

  if (route === "/auditoria") {
    await loadAuditPanel();
    return;
  }

  if (route === "/configuracion") {
    await loadSystemSettingsPanel();
    return;
  }

  await Promise.all([
    loadUsers(),
    loadTemplates(),
    loadReport(),
    loadTrends(),
    loadRolePermissionsPanel(),
    loadSystemSettingsPanel()
  ]);
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
    const sessionApplied = applySessionUser(data?.user);
    if (!sessionApplied) {
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
  const sessionApplied = applySessionUser(data?.user);

  if (!sessionApplied) {
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

  const nameValidation = validateFullNameInput(registerNameInput?.value || "");
  if (!nameValidation.valid) {
    setButtonBusy(submitButton, false);
    showToast(nameValidation.message, "error");
    return;
  }

  if (registerNameInput instanceof HTMLInputElement) {
    registerNameInput.value = nameValidation.value;
  }

  const name = nameValidation.value;
  const email = (registerEmailInput?.value || "").trim();
  const password = registerPasswordInput?.value || "";
  const passwordConfirm = registerPasswordConfirmInput?.value || "";

  if (password !== passwordConfirm) {
    setButtonBusy(submitButton, false);
    showToast("Las contrasenas no coinciden.", "error");
    return;
  }

  const passwordValidation = validateStrongPasswordInput(password, { email, name });
  if (!passwordValidation.valid) {
    setButtonBusy(submitButton, false);
    showToast(passwordValidation.message, "error");
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

  const sessionApplied = applySessionUser(data?.user);
  if (sessionApplied) {
    if (completeAuthPopupNavigation()) {
      return;
    }

    window.location.href = "/dashboard";
    return;
  }

  showToast("Cuenta creada. Inicia sesion para continuar.", "success");
}

async function uploadEventAttachmentByFile(eventId, file) {
  const sendUpload = (csrfToken) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`/events/${eventId}/attachments`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      headers: csrfToken ? { "x-csrf-token": csrfToken } : {}
    });
  };

  const readJsonIfPossible = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return null;
    }
    try {
      return await response.json();
    } catch (_error) {
      return null;
    }
  };

  let uploadResponse = await sendUpload(getCsrfToken());
  let data = await readJsonIfPossible(uploadResponse);

  const shouldRetryWithRefresh =
    uploadResponse.status === 401 ||
    (uploadResponse.status === 403 && data?.error === "invalid_csrf_token");

  if (shouldRetryWithRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      uploadResponse = await sendUpload(getCsrfToken());
      data = await readJsonIfPossible(uploadResponse);
    }
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

  const isEditMode =
    Number.isInteger(state.editingEventId) && Number(state.editingEventId) > 0;

  if (!isEditMode && !canCreateEvent()) {
    setButtonBusy(submitButton, false);
    showToast("No tienes permisos para crear registros.", "error");
    return;
  }

  if (isEditMode && !canModifyEvent(state.editingEventId)) {
    setButtonBusy(submitButton, false);
    showToast("No tienes permisos para editar este registro.", "error");
    return;
  }

  const selectedTemplateId = eventTemplateSelect.value ? Number(eventTemplateSelect.value) : null;
  const payload = {
    fecha: normalizeDateInputValue(fechaInput.value),
    descripcionActividad: document.getElementById("descripcionActividad").value.trim(),
    observacion: document.getElementById("observacion").value.trim(),
    prioridad: document.getElementById("prioridad").value,
    templateId: isEditMode ? selectedTemplateId : selectedTemplateId || undefined
  };

  const endpoint = isEditMode ? `/events/${state.editingEventId}` : "/events";
  const method = isEditMode ? "PATCH" : "POST";
  const { response, data, networkError } = await apiAuth(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  setButtonBusy(submitButton, false);

  if (networkError) {
    showToast(
      isEditMode ? "No hay conexion para guardar cambios del registro." : "No hay conexion para guardar el registro.",
      "error"
    );
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

  const targetEventId = isEditMode ? Number(state.editingEventId) : Number(data?.id || 0);
  const selectedFiles = eventFilesInput?.files ? Array.from(eventFilesInput.files) : [];
  let uploadedFiles = 0;
  let failedUploads = 0;

  if (targetEventId && selectedFiles.length > 0) {
    for (const file of selectedFiles) {
      // eslint-disable-next-line no-await-in-loop
      const uploadResult = await uploadEventAttachmentByFile(targetEventId, file);
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

  if (isEditMode) {
    state.registroComposerOpen = false;
    setEventEditorMode("create");
    eventForm.reset();
    setDateDefaults();
    applyRouteMode();
  } else {
    syncDateConstraints();
    closeRegistroComposer();
  }

  if (uploadedFiles > 0 && failedUploads === 0) {
    showToast(
      isEditMode
        ? `Registro actualizado y ${uploadedFiles} archivo(s) adjuntado(s).`
        : `Registro guardado y ${uploadedFiles} archivo(s) adjuntado(s).`,
      "success"
    );
  } else if (uploadedFiles > 0 && failedUploads > 0) {
    showToast(
      isEditMode
        ? `Registro actualizado. ${uploadedFiles} adjunto(s) cargados y ${failedUploads} con error.`
        : `Registro guardado. ${uploadedFiles} adjunto(s) cargados y ${failedUploads} con error.`,
      "info"
    );
  } else if (failedUploads > 0) {
    showToast(
      isEditMode
        ? "Cambios guardados, pero los adjuntos fallaron. Intenta subirlos desde Adjuntos."
        : "Registro guardado, pero los adjuntos fallaron. Intenta subirlos desde Adjuntos.",
      "error"
    );
  } else {
    showToast(isEditMode ? "Registro actualizado correctamente." : "Registro guardado en bitacora.", "success");
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

  if (!eventId) {
    setButtonBusy(submitButton, false);
    showToast("Selecciona un registro en la tabla para adjuntar.", "error");
    return;
  }

  if (!canUploadToSelectedEvent()) {
    setButtonBusy(submitButton, false);
    showToast("No tienes permisos para subir adjuntos en este registro.", "error");
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
  if (getCurrentPanelPath() === "/adjuntos") {
    await loadAttachmentsRepository({ keepPage: true });
  }
  await loadReport();
}

async function handleAttachmentRename(attachmentId, currentName) {
  const safeCurrent = String(currentName || "").trim();
  const nextNameRaw = window.prompt("Nuevo nombre del archivo", safeCurrent);
  if (nextNameRaw === null) {
    return;
  }
  const nextName = String(nextNameRaw || "").trim();
  if (!nextName || nextName === safeCurrent) {
    return;
  }

  const { response, data, networkError } = await apiAuth(`/events/attachments/${attachmentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      originalName: nextName
    })
  });

  if (networkError) {
    showToast("No hay conexion para actualizar adjunto.", "error");
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

  showToast("Nombre del adjunto actualizado.", "success");
  if (state.selectedEventId) {
    await loadAttachments(state.selectedEventId);
  }
  if (getCurrentPanelPath() === "/adjuntos") {
    await loadAttachmentsRepository({ keepPage: true });
  }
  await loadReport();
}

async function handleAttachmentDelete(attachmentId) {
  if (!window.confirm("Â¿Eliminar este adjunto? Esta acciÃ³n no se puede deshacer.")) {
    return;
  }

  const { response, data, networkError } = await apiAuth(`/events/attachments/${attachmentId}`, {
    method: "DELETE"
  });

  if (networkError) {
    showToast("No hay conexion para eliminar adjunto.", "error");
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

  showToast("Adjunto eliminado correctamente.", "success");
  if (state.selectedEventId) {
    await loadAttachments(state.selectedEventId);
  }
  if (getCurrentPanelPath() === "/adjuntos") {
    await loadAttachmentsRepository({ keepPage: true });
  }
  await loadReport();
}

async function handleAttachmentActionClick(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const previewButton = target.closest(".attachment-preview");
  if (previewButton instanceof HTMLButtonElement) {
    const attachmentId = Number(previewButton.dataset.attachmentId || 0);
    if (attachmentId > 0) {
      await handleAttachmentPreview(
        attachmentId,
        previewButton.dataset.attachmentName || "Adjunto",
        previewButton.dataset.attachmentMime || ""
      );
    }
    return true;
  }

  const renameButton = target.closest(".attachment-rename");
  if (renameButton instanceof HTMLButtonElement) {
    const attachmentId = Number(renameButton.dataset.attachmentId || 0);
    if (attachmentId > 0) {
      await handleAttachmentRename(attachmentId, renameButton.dataset.attachmentName || "");
    }
    return true;
  }

  const deleteButton = target.closest(".attachment-delete");
  if (deleteButton instanceof HTMLButtonElement) {
    const attachmentId = Number(deleteButton.dataset.attachmentId || 0);
    if (attachmentId > 0) {
      await handleAttachmentDelete(attachmentId);
    }
    return true;
  }

  return false;
}

async function handleAttachmentListClick(event) {
  await handleAttachmentActionClick(event.target);
}

async function handleAttachmentsRepoClick(event) {
  const handled = await handleAttachmentActionClick(event.target);
  if (handled) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const relationButton = target.closest(".attachments-select-event");
  if (!(relationButton instanceof HTMLButtonElement)) {
    return;
  }

  const eventId = Number(relationButton.dataset.eventId || 0);
  if (!eventId) {
    return;
  }

  await loadAttachments(eventId);
  if (attachmentsContext) {
    attachmentsContext.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function handleEventEdit(button) {
  const eventId = Number(button.dataset.eventId || 0);

  if (!eventId || !canModifyEvent(eventId)) {
    showToast("No tienes permisos para editar este registro.", "error");
    return;
  }

  const current = state.eventPayloadById[eventId] || null;

  if (!current) {
    showToast("No se pudo cargar la informacion del registro.", "error");
    return;
  }

  if (state.templates.length === 0) {
    await loadTemplates();
  }

  const normalizedDate = normalizeDateInputValue(current.fecha) || toLocalISODate();
  fechaInput.value = normalizedDate;
  document.getElementById("descripcionActividad").value = current.descripcionActividad || "";
  document.getElementById("observacion").value = current.observacion || "";
  document.getElementById("prioridad").value = normalizePriority(current.prioridad);
  eventTemplateSelect.value = current.templateId ? String(current.templateId) : "";
  if (eventFilesInput) {
    eventFilesInput.value = "";
  }

  if (encargadoInput) {
    encargadoInput.value = current.encargado || state.user?.name || "-";
  }

  setEventEditorMode("edit", { eventId });
  applyRouteMode();
  if (registroSection) {
    registroSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  showToast("Modo edicion habilitado en pantalla completa.", "info");
}

function handleCancelEventEdit() {
  if (!state.editingEventId) {
    return;
  }

  setEventEditorMode("create");
  eventForm.reset();
  setDateDefaults();
  closeRegistroComposer();
  applyRouteMode();
  showToast("Edicion cancelada.", "info");
}

async function handleEventDelete(button) {
  const eventId = Number(button.dataset.eventId || 0);

  if (!eventId || !canDeleteEvent(eventId)) {
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
    state.selectedEventPermissions = null;
    clearElement(attachmentList);
    attachmentEventId.value = "";
    refreshAttachmentUploadState();
  }

  if (String(state.editingEventId) === String(eventId)) {
    setEventEditorMode("create");
    eventForm.reset();
    setDateDefaults();
    applyRouteMode();
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

  if (!canManageUsers()) {
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

  if (!canManageUsers()) {
    setButtonBusy(submitButton, false);
    showToast("Operacion solo disponible para administradores.", "error");
    return;
  }

  const userId = adminUserSelect.value;
  const newPassword = adminNewPassword.value;

  if (!userId) {
    setButtonBusy(submitButton, false);
    showToast("Selecciona un usuario.", "error");
    return;
  }

  const selectedUser = state.users.find((item) => Number(item.id) === Number(userId));
  const passwordValidation = validateStrongPasswordInput(newPassword, {
    email: selectedUser?.email || "",
    name: selectedUser?.name || ""
  });
  if (!passwordValidation.valid) {
    setButtonBusy(submitButton, false);
    showToast(passwordValidation.message, "error");
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
  if (!canManageUsers()) {
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

  if (!canChangeOwnPassword()) {
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

  const passwordValidation = validateStrongPasswordInput(newPassword, {
    email: state.user?.email || "",
    name: state.user?.name || ""
  });
  if (!passwordValidation.valid) {
    setButtonBusy(submitButton, false);
    showToast(passwordValidation.message, "error");
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
  if (!canManageUsers()) {
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

  if (!canManageTemplates()) {
    setButtonBusy(submitButton, false);
    showToast("No tienes permisos para administrar plantillas.", "error");
    return;
  }

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

  if (!canManageTemplates()) {
    showToast("No tienes permisos para administrar plantillas.", "error");
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

  if (!canExportReports()) {
    setButtonBusy(button, false);
    showToast("No tienes permisos para exportar reportes.", "error");
    return;
  }

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
  setEventEditorMode("create");
  window.location.href = "/";
}

async function handleFilterSubmit(event) {
  event.preventDefault();
  clearReportReloadDebounce();
  state.report.page = 1;
  await loadReport();
  if (getCurrentPanelPath() === "/resumen" || getCurrentPanelPath() === "/tendencias") {
    await loadTrends();
  }
}

function handleOpenReportClick() {
  if (state.report.loading || reportWindowLaunchInFlight) {
    return;
  }

  reportWindowLaunchInFlight = true;
  const opened = openReportWindow();
  if (!opened) {
    showToast("Tu navegador bloqueo la nueva ventana. Habilita popups para este sitio.", "error");
  }
  window.setTimeout(() => {
    reportWindowLaunchInFlight = false;
  }, 900);
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

function openEntityModal({ title = "Detalle", meta = "", body = "", actions = [] } = {}) {
  if (!entityModal || !entityModalTitle || !entityModalMeta || !entityModalBody) {
    return;
  }

  security.setSafeText(entityModalTitle, title);
  security.setSafeText(entityModalMeta, meta);
  security.setSafeText(entityModalBody, body);

  if (entityModalActions) {
    clearElement(entityModalActions);
    const safeActions = Array.isArray(actions) ? actions : [];

    safeActions.forEach((action) => {
      const label = String(action?.label || "").trim();
      if (!label) {
        return;
      }

      if (action?.href) {
        const link = document.createElement("a");
        link.className = "btn btn-ghost";
        link.href = String(action.href);
        link.textContent = label;
        entityModalActions.appendChild(link);
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-ghost";
      button.textContent = label;
      if (typeof action?.onClick === "function") {
        button.addEventListener("click", action.onClick);
      }
      entityModalActions.appendChild(button);
    });

    entityModalActions.classList.toggle("hidden", entityModalActions.children.length === 0);
  }

  entityModal.classList.remove("hidden");
  entityModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeEntityModal() {
  if (!entityModal) {
    return;
  }

  if (entityModalActions) {
    clearElement(entityModalActions);
    entityModalActions.classList.add("hidden");
  }

  entityModal.classList.add("hidden");
  entityModal.setAttribute("aria-hidden", "true");
  state.sessionWarningVisible = false;
  document.body.classList.remove("modal-open");
}

function resetAttachmentPreviewContent() {
  if (attachmentPreviewImage) {
    attachmentPreviewImage.classList.add("hidden");
    attachmentPreviewImage.onerror = null;
    attachmentPreviewImage.removeAttribute("src");
  }
  if (attachmentPreviewFrame) {
    attachmentPreviewFrame.classList.add("hidden");
    attachmentPreviewFrame.onload = null;
    attachmentPreviewFrame.onerror = null;
    attachmentPreviewFrame.removeAttribute("src");
  }
  if (attachmentPreviewText) {
    attachmentPreviewText.classList.add("hidden");
    attachmentPreviewText.textContent = "";
  }
  if (attachmentPreviewFallback) {
    attachmentPreviewFallback.classList.add("hidden");
    attachmentPreviewFallback.textContent = "";
  }
  if (attachmentPreviewActions) {
    attachmentPreviewActions.classList.add("hidden");
  }
  if (attachmentPreviewOpenLink) {
    attachmentPreviewOpenLink.removeAttribute("href");
  }
  if (attachmentPreviewDownloadLink) {
    attachmentPreviewDownloadLink.removeAttribute("href");
  }
}

function closeAttachmentPreview() {
  if (!attachmentPreviewModal) {
    return;
  }
  attachmentPreviewModal.classList.add("hidden");
  attachmentPreviewModal.setAttribute("aria-hidden", "true");
  resetAttachmentPreviewContent();
  document.body.classList.remove("modal-open");
}

function showAttachmentPreviewFallback(message, previewUrl, downloadUrl) {
  if (attachmentPreviewFallback) {
    attachmentPreviewFallback.textContent = message;
    attachmentPreviewFallback.classList.remove("hidden");
  }

  if (attachmentPreviewOpenLink) {
    attachmentPreviewOpenLink.href = previewUrl;
  }
  if (attachmentPreviewDownloadLink) {
    attachmentPreviewDownloadLink.href = downloadUrl;
  }
  if (attachmentPreviewActions) {
    attachmentPreviewActions.classList.remove("hidden");
  }
}

async function handleAttachmentPreview(attachmentId, attachmentName, mimeType) {
  if (!attachmentId) {
    return;
  }
  if (!attachmentPreviewModal || !attachmentPreviewMeta) {
    window.open(`/events/attachments/${attachmentId}/preview`, "_blank", "noopener,noreferrer");
    return;
  }

  const normalizedMime = String(mimeType || "").toLowerCase();
  security.setSafeText(attachmentPreviewMeta, `${attachmentName || "Adjunto"} | ${normalizedMime || "desconocido"}`);
  resetAttachmentPreviewContent();

  attachmentPreviewModal.classList.remove("hidden");
  attachmentPreviewModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const previewUrl = `/events/attachments/${attachmentId}/preview`;
  const downloadUrl = `/events/attachments/${attachmentId}/download`;
  if (attachmentPreviewOpenLink) {
    attachmentPreviewOpenLink.href = previewUrl;
  }
  if (attachmentPreviewDownloadLink) {
    attachmentPreviewDownloadLink.href = downloadUrl;
  }
  if (attachmentPreviewActions) {
    attachmentPreviewActions.classList.remove("hidden");
  }

  if (normalizedMime.startsWith("image/")) {
    if (attachmentPreviewImage) {
      attachmentPreviewImage.src = previewUrl;
      attachmentPreviewImage.onerror = () => {
        showAttachmentPreviewFallback(
          "No se puede previsualizar este adjunto en el navegador.",
          previewUrl,
          downloadUrl
        );
      };
      attachmentPreviewImage.classList.remove("hidden");
    }
    return;
  }

  if (normalizedMime === "application/pdf") {
    if (attachmentPreviewFrame) {
      attachmentPreviewFrame.src = previewUrl;
      attachmentPreviewFrame.onload = () => {
        if (attachmentPreviewFallback) {
          attachmentPreviewFallback.classList.add("hidden");
          attachmentPreviewFallback.textContent = "";
        }
      };
      attachmentPreviewFrame.onerror = () => {
        showAttachmentPreviewFallback(
          "No se puede previsualizar este PDF en el visor embebido.",
          previewUrl,
          downloadUrl
        );
      };
      attachmentPreviewFrame.classList.remove("hidden");

      window.setTimeout(() => {
        if (!attachmentPreviewFrame || attachmentPreviewFrame.classList.contains("hidden")) {
          return;
        }
        let frameLocation = "";
        try {
          frameLocation = String(attachmentPreviewFrame.contentWindow?.location?.href || "");
        } catch (_error) {
          frameLocation = "";
        }
        if (!frameLocation || frameLocation === "about:blank") {
          showAttachmentPreviewFallback(
            "No se puede previsualizar este PDF en el visor embebido.",
            previewUrl,
            downloadUrl
          );
        }
      }, 1300);
    }
    return;
  }

  if (normalizedMime === "text/plain") {
    const { response, networkError } = await apiAuth(previewUrl, { method: "GET" });
    if (networkError || !response?.ok) {
      showAttachmentPreviewFallback(
        "No se puede previsualizar este archivo en este momento.",
        previewUrl,
        downloadUrl
      );
      return;
    }

    const text = await response.text();
    if (attachmentPreviewText) {
      attachmentPreviewText.textContent = text;
      attachmentPreviewText.classList.remove("hidden");
    }
    return;
  }

  showAttachmentPreviewFallback(
    "No se puede previsualizar este tipo de archivo.",
    previewUrl,
    downloadUrl
  );
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

  const passwordValidation = validateStrongPasswordInput(newPassword, { email });
  if (!passwordValidation.valid) {
    setButtonBusy(submitButton, false);
    showToast(passwordValidation.message, "error");
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

function handleSidebarLinkNavigation(event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLAnchorElement)) {
    return;
  }

  if (sidebarNavigationInFlight) {
    event.preventDefault();
    return;
  }

  const targetUrl = new URL(target.href, window.location.origin);
  const currentUrl = new URL(window.location.href);
  if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
    event.preventDefault();
    return;
  }

  sidebarNavigationInFlight = true;
  target.classList.add("is-loading");
  window.setTimeout(() => {
    sidebarNavigationInFlight = false;
    target.classList.remove("is-loading");
  }, 5000);
}

async function handleReportTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const viewButton = target.closest(".event-view");
  if (viewButton instanceof HTMLButtonElement) {
    const eventId = Number(viewButton.dataset.eventId || 0);
    const payload = state.eventPayloadById[eventId];
    if (payload) {
      openEntityModal({
        title: `Bitacora #${eventId}`,
        meta: `${payload.encargado || "-"} | ${formatDate(payload.fecha)} | ${formatPriorityLabel(payload.prioridad)}`,
        body: `Actividad:\n${payload.descripcionActividad || "-"}\n\nObservacion:\n${payload.observacion || "-"}\n\nPlantilla: ${payload.templateName || "-"}`
      });
    }
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

  if (!getEventActionPermissions(eventId)?.canViewAttachments) {
    showToast("No tienes permisos para ver adjuntos de este registro.", "error");
    return;
  }

  await loadAttachments(Number(eventId));
}

async function handlePrevPage() {
  if (state.report.loading) {
    return;
  }
  if (state.report.page <= 1) {
    return;
  }

  clearReportReloadDebounce();
  state.report.page -= 1;
  await loadReport();
}

async function handleNextPage() {
  if (state.report.loading) {
    return;
  }
  if (state.report.page >= state.report.totalPages) {
    return;
  }

  clearReportReloadDebounce();
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

function _startMatrixRain(options = {}) {
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
  if (window.__BITACORA_APP_BOOTSTRAPPED__) {
    return;
  }
  window.__BITACORA_APP_BOOTSTRAPPED__ = true;

  state.authView = getRequestedAuthView();
  state.authPopup = getAuthPopupMode();
  applyPerformanceProfile();
  mountNotificationsOverlay();
  setAuthView(state.authView);
  setDateDefaults();
  initializeSidebarGroups();
  if (auditFromDate && !auditFromDate.value) {
    auditFromDate.value = toLocalISODate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  }
  if (auditToDate && !auditToDate.value) {
    auditToDate.value = toLocalISODate();
  }

  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
  if (registerNameInput instanceof HTMLInputElement) {
    registerNameInput.addEventListener("blur", () => {
      registerNameInput.value = normalizeFullNameInput(registerNameInput.value);
    });
  }
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
  if (entityModalClose) {
    entityModalClose.addEventListener("click", closeEntityModal);
  }
  if (entityModal) {
    entityModal.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.hasAttribute("data-entity-close")) {
        closeEntityModal();
      }
    });
  }
  if (attachmentPreviewClose) {
    attachmentPreviewClose.addEventListener("click", closeAttachmentPreview);
  }
  if (attachmentPreviewModal) {
    attachmentPreviewModal.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.hasAttribute("data-attachment-preview-close")) {
        closeAttachmentPreview();
      }
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (recoverModal && !recoverModal.classList.contains("hidden")) {
      closeRecoverModal();
    }
    if (entityModal && !entityModal.classList.contains("hidden")) {
      closeEntityModal();
    }
    if (attachmentPreviewModal && !attachmentPreviewModal.classList.contains("hidden")) {
      closeAttachmentPreview();
    }
    if (state.notifications?.open) {
      setNotificationsOpen(false);
    }
  });

  mfaEnableForm.addEventListener("submit", handleMfaEnable);
  eventForm.addEventListener("submit", handleCreateEvent);
  if (resumenNewEventBtn) {
    resumenNewEventBtn.addEventListener("click", () => {
      if (state.registroComposerOpen) {
        closeRegistroComposer();
      } else {
        openRegistroComposer();
        if (fechaInput instanceof HTMLInputElement) {
          fechaInput.focus();
        }
      }
    });
  }
  if (registroNewEventBtn) {
    registroNewEventBtn.addEventListener("click", () => {
      if (state.registroComposerOpen) {
        closeRegistroComposer();
      } else {
        openRegistroComposer();
        if (fechaInput instanceof HTMLInputElement) {
          fechaInput.focus();
        }
      }
    });
  }
  if (eventCancelBtn) {
    eventCancelBtn.addEventListener("click", handleCancelEventEdit);
  }
  attachmentForm.addEventListener("submit", handleAttachmentSubmit);
  attachmentList.addEventListener("click", handleAttachmentListClick);
  if (attachmentsRepoBody) {
    attachmentsRepoBody.addEventListener("click", handleAttachmentsRepoClick);
  }
  if (attachmentsRepoFiltersForm) {
    attachmentsRepoFiltersForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      state.attachmentsRepo.page = 1;
      await loadAttachmentsRepository({ keepPage: true });
    });
  }
  if (attachmentsRepoPrevBtn) {
    attachmentsRepoPrevBtn.addEventListener("click", async () => {
      if (state.attachmentsRepo.page <= 1) {
        return;
      }
      state.attachmentsRepo.page -= 1;
      await loadAttachmentsRepository({ keepPage: true });
    });
  }
  if (attachmentsRepoNextBtn) {
    attachmentsRepoNextBtn.addEventListener("click", async () => {
      if (state.attachmentsRepo.page >= state.attachmentsRepo.totalPages) {
        return;
      }
      state.attachmentsRepo.page += 1;
      await loadAttachmentsRepository({ keepPage: true });
    });
  }
  filterForm.addEventListener("submit", handleFilterSubmit);
  openReportBtn.addEventListener("click", handleOpenReportClick);
  reportBody.addEventListener("click", handleReportTableClick);
  reportPrev.addEventListener("click", handlePrevPage);
  reportNext.addEventListener("click", handleNextPage);
  logoutBtn.addEventListener("click", handleLogout);
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", handleSidebarToggle);
  }
  if (sidebarLinks?.length) {
    sidebarLinks.forEach((link) => {
      if (link instanceof HTMLAnchorElement) {
        link.addEventListener("click", handleSidebarLinkNavigation);
      }
    });
  }
  if (notificationsBtn) {
    notificationsBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      const nextOpen = !state.notifications?.open;
      setNotificationsOpen(nextOpen);
      if (nextOpen) {
        await loadNotifications({ silent: true });
      }
    });
  }
  if (notificationsList) {
    notificationsList.addEventListener("click", handleNotificationsListClick);
  }
  if (notificationsMarkAllBtn) {
    notificationsMarkAllBtn.addEventListener("click", async () => {
      await markAllNotificationsRead();
    });
  }
  document.addEventListener("click", (event) => {
    if (!state.notifications?.open || !notificationsDropdown || !notificationsBtn) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (notificationsDropdown.contains(target) || notificationsBtn.contains(target)) {
      return;
    }
    setNotificationsOpen(false);
  });

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

  if (rbacRoleSelect) {
    rbacRoleSelect.addEventListener("change", handleRbacRoleChange);
  }
  if (rbacTableBody) {
    rbacTableBody.addEventListener("change", handleRbacTableChange);
  }
  if (rbacReloadBtn) {
    rbacReloadBtn.addEventListener("click", handleRbacReload);
  }
  if (rbacSaveBtn) {
    rbacSaveBtn.addEventListener("click", handleRbacSave);
  }

  if (systemSettingsForm) {
    systemSettingsForm.addEventListener("submit", handleSystemSettingsSave);
  }
  if (settingsReloadBtn) {
    settingsReloadBtn.addEventListener("click", handleSystemSettingsReload);
  }
  if (auditFilterForm) {
    auditFilterForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await loadAuditPanel();
    });
  }
  if (auditResetBtn) {
    auditResetBtn.addEventListener("click", async () => {
      if (auditUserFilter) {
        auditUserFilter.value = "";
      }
      if (auditActionFilter) {
        auditActionFilter.value = "";
      }
      if (auditFromDate) {
        auditFromDate.value = toLocalISODate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
      }
      if (auditToDate) {
        auditToDate.value = toLocalISODate();
      }
      await loadAuditPanel();
    });
  }
  if (auditTimeline) {
    auditTimeline.addEventListener("click", handleAuditTimelineClick);
  }

  templateForm.addEventListener("submit", handleTemplateCreate);
  templateList.addEventListener("click", handleTemplateToggle);
  eventTemplateSelect.addEventListener("change", handleTemplateSelectChange);

  fromDateInput.addEventListener("change", syncDateConstraints);
  toDateInput.addEventListener("change", syncDateConstraints);
  [searchTextInput, priorityFilterInput, userFilterInput].forEach((input) => {
    if (input instanceof HTMLInputElement) {
      input.addEventListener("input", scheduleReportReload);
      return;
    }
    if (input instanceof HTMLSelectElement) {
      input.addEventListener("change", scheduleReportReload);
    }
  });
  if (fromDateInput instanceof HTMLInputElement) {
    fromDateInput.addEventListener("change", scheduleReportReload);
  }
  if (toDateInput instanceof HTMLInputElement) {
    toDateInput.addEventListener("change", scheduleReportReload);
  }
  pageSizeInput.addEventListener("change", async () => {
    clearReportReloadDebounce();
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
  const matrixCanvas = document.getElementById("matrixCanvas");
  if (matrixCanvas instanceof HTMLCanvasElement) {
    matrixCanvas.style.display = "none";
  }

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
        .register("/sw.js?v=21")
        .then((registration) => registration.update())
        .catch(() => {
          // No interrumpir flujo principal si falla el service worker.
        });
    });
  }

  window.addEventListener("beforeunload", () => {
    stopRealtimeStream();
  });

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




































































































