(function initTasksModule() {
  "use strict";

  function normalizePathname(pathname) {
    if (!pathname || pathname === "/") {
      return "/";
    }
    return String(pathname).replace(/\/+$/, "");
  }

  if (normalizePathname(window.location.pathname) !== "/tareas") {
    return;
  }

  const section = document.getElementById("tasksSection");
  if (!section) {
    return;
  }

  const tasksSummary = document.getElementById("tasksSummary");
  const taskForm = document.getElementById("taskForm");
  const taskFormTitle = document.getElementById("taskFormTitle");
  const taskTitle = document.getElementById("taskTitle");
  const taskDescription = document.getElementById("taskDescription");
  const taskStatus = document.getElementById("taskStatus");
  const taskPriority = document.getElementById("taskPriority");
  const taskStartDate = document.getElementById("taskStartDate");
  const taskDueDate = document.getElementById("taskDueDate");
  const taskAssignedTo = document.getElementById("taskAssignedTo");
  const taskSaveBtn = document.getElementById("taskSaveBtn");
  const taskCancelBtn = document.getElementById("taskCancelBtn");

  const taskDetail = document.getElementById("taskDetail");
  const taskDetailTitle = document.getElementById("taskDetailTitle");
  const taskDetailMeta = document.getElementById("taskDetailMeta");
  const taskDetailBody = document.getElementById("taskDetailBody");

  const tasksFilterForm = document.getElementById("tasksFilterForm");
  const tasksFilterSearch = document.getElementById("tasksFilterSearch");
  const tasksFilterStatus = document.getElementById("tasksFilterStatus");
  const tasksFilterPriority = document.getElementById("tasksFilterPriority");
  const tasksFilterCreatedBy = document.getElementById("tasksFilterCreatedBy");
  const tasksFilterAssignedTo = document.getElementById("tasksFilterAssignedTo");
  const tasksFilterStartFrom = document.getElementById("tasksFilterStartFrom");
  const tasksFilterStartTo = document.getElementById("tasksFilterStartTo");
  const tasksFilterDueFrom = document.getElementById("tasksFilterDueFrom");
  const tasksFilterDueTo = document.getElementById("tasksFilterDueTo");
  const tasksFilterSortBy = document.getElementById("tasksFilterSortBy");
  const tasksFilterSortOrder = document.getElementById("tasksFilterSortOrder");
  const tasksPageSize = document.getElementById("tasksPageSize");
  const tasksAdvancedFilters = document.getElementById("tasksAdvancedFilters");
  const tasksFilterSubmitBtn = tasksFilterForm?.querySelector('button[type="submit"]');

  const tasksTableBody = document.getElementById("tasksTableBody");
  const tasksPrev = document.getElementById("tasksPrev");
  const tasksNext = document.getElementById("tasksNext");
  const tasksPageInfo = document.getElementById("tasksPageInfo");
  const tasksExportXlsx = document.getElementById("tasksExportXlsx");
  const tasksExportPdf = document.getElementById("tasksExportPdf");
  const toast = document.getElementById("toast");

  const STATUS_LABELS = Object.freeze({
    sin_realizar: "Sin realizar",
    en_proceso: "En proceso",
    pendiente_revision: "Pendiente revision",
    completada: "Completada",
    cancelada: "Cancelada"
  });

  const PRIORITY_LABELS = Object.freeze({
    baja: "Baja",
    media: "Media",
    alta: "Alta"
  });

  const ERROR_MESSAGES = Object.freeze({
    unauthorized: "Acceso no autorizado. Inicia sesion.",
    invalid_token: "Sesion invalida. Inicia sesion nuevamente.",
    session_revoked: "La sesion fue revocada. Inicia sesion otra vez.",
    invalid_csrf_token: "La sesion de seguridad vencio. Recarga la pagina e intenta de nuevo.",
    forbidden: "No tienes permisos para realizar esta accion.",
    validation_error: "No se pudo validar la solicitud.",
    past_date_not_allowed: "No se permite crear o editar tareas con fechas anteriores.",
    task_not_found: "La tarea solicitada no existe o no esta disponible.",
    user_not_found: "El usuario seleccionado no existe.",
    too_many_requests: "Demasiadas solicitudes. Intenta de nuevo en unos minutos."
  });

  const state = {
    user: null,
    capabilities: null,
    users: [],
    page: 1,
    pageSize: Number(tasksPageSize?.value || 20),
    totalPages: 1,
    editingTaskId: null,
    activeRows: []
  };

  function showToast(message, type = "info") {
    if (!toast) {
      return;
    }
    toast.textContent = String(message || "");
    toast.className = `toast ${type}`;
    toast.classList.remove("hidden");
    window.clearTimeout(showToast._timeoutId);
    showToast._timeoutId = window.setTimeout(() => {
      toast.classList.add("hidden");
    }, 3800);
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

  function resolveErrorMessage(errorCode) {
    if (!errorCode) {
      return "No se pudo completar la operacion.";
    }
    return ERROR_MESSAGES[errorCode] || String(errorCode);
  }

  function parseContentDispositionFileName(headerValue) {
    if (!headerValue) {
      return null;
    }
    const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1]);
    }
    const regularMatch = headerValue.match(/filename="?([^";]+)"?/i);
    return regularMatch?.[1] || null;
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
    const tzOffsetMinutes = Number(new Date().getTimezoneOffset());
    if (!Number.isInteger(tzOffsetMinutes) || tzOffsetMinutes < -840 || tzOffsetMinutes > 840) {
      return headers;
    }
    return {
      ...headers,
      "x-client-timezone-offset": String(tzOffsetMinutes)
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
      const contentType = response.headers.get("content-type") || "";
      let data = null;
      if (contentType.includes("application/json")) {
        data = await response.json();
      }
      return {
        response,
        data,
        networkError: false
      };
    } catch (_error) {
      return {
        response: null,
        data: null,
        networkError: true
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function refreshSession() {
    const result = await api("/auth/refresh", {
      method: "POST"
    });
    return Boolean(result.response?.ok);
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

  function handleUnauthorized() {
    window.location.href = "/?popup=auth&auth=login";
  }

  function formatDate(value) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "-";
    }
    const parsed = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return normalized;
    }
    return parsed.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return parsed.toLocaleString("es-ES");
  }

  function statusLabel(value) {
    return STATUS_LABELS[String(value || "")] || String(value || "");
  }

  function priorityLabel(value) {
    return PRIORITY_LABELS[String(value || "")] || String(value || "");
  }

  function canViewAnyTasks() {
    return Boolean(state.capabilities?.actions?.tasks?.viewAny);
  }

  function canCreateTask() {
    return Boolean(state.capabilities?.actions?.tasks?.create);
  }

  function canAssignTask() {
    return Boolean(state.capabilities?.actions?.tasks?.assignAny);
  }

  function canExportTask() {
    return Boolean(state.capabilities?.actions?.tasks?.export);
  }

  function clearNode(node) {
    if (!node) {
      return;
    }
    node.replaceChildren();
  }

  function toLocalISODate(date = new Date()) {
    const tzOffsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 10);
  }

  function syncTaskDateConstraints() {
    const today = toLocalISODate();
    if (taskStartDate) {
      taskStartDate.min = today;
    }
    if (taskDueDate) {
      taskDueDate.min = taskStartDate?.value || today;
    }
  }

  function hasAdvancedFiltersEnabled() {
    const hasScopeFilters =
      canViewAnyTasks() &&
      (Boolean(tasksFilterCreatedBy?.value) || Boolean(tasksFilterAssignedTo?.value));

    return (
      hasScopeFilters ||
      Boolean(tasksFilterStartFrom?.value) ||
      Boolean(tasksFilterStartTo?.value) ||
      Boolean(tasksFilterDueFrom?.value) ||
      Boolean(tasksFilterDueTo?.value) ||
      String(tasksFilterSortBy?.value || "updatedAt") !== "updatedAt" ||
      String(tasksFilterSortOrder?.value || "desc") !== "desc"
    );
  }

  function syncAdvancedFiltersState() {
    if (!tasksAdvancedFilters) {
      return;
    }
    tasksAdvancedFilters.open = hasAdvancedFiltersEnabled();
  }

  function resetTaskForm() {
    state.editingTaskId = null;
    if (taskFormTitle) {
      taskFormTitle.textContent = "Nueva tarea";
    }
    if (taskSaveBtn) {
      taskSaveBtn.textContent = "Guardar tarea";
    }
    if (taskCancelBtn) {
      taskCancelBtn.classList.add("hidden");
    }
    taskForm?.reset();
    if (taskPriority) {
      taskPriority.value = "media";
    }
    if (taskStatus) {
      taskStatus.value = "sin_realizar";
    }
    syncTaskDateConstraints();
  }

  function renderTaskDetail(task) {
    if (!taskDetail || !taskDetailTitle || !taskDetailBody || !taskDetailMeta) {
      return;
    }
    if (!task) {
      taskDetail.classList.add("hidden");
      taskDetailTitle.textContent = "";
      taskDetailMeta.textContent = "";
      taskDetailBody.textContent = "";
      return;
    }
    taskDetailTitle.textContent = `${task.title || "Sin titulo"} (#${task.id})`;
    taskDetailMeta.textContent =
      `Estado: ${statusLabel(task.status)} | Prioridad: ${priorityLabel(task.priority)} | ` +
      `Creado por: ${task.createdBy?.name || "-"} | Asignado: ${task.assignedTo?.name || "-"}`;
    taskDetailBody.textContent = task.description || "";
    taskDetail.classList.remove("hidden");
  }

  function createOption(value, label) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    return option;
  }

  function renderUserSelectors() {
    clearNode(taskAssignedTo);
    clearNode(tasksFilterCreatedBy);
    clearNode(tasksFilterAssignedTo);

    taskAssignedTo.appendChild(createOption("", "Sin asignar"));
    tasksFilterCreatedBy.appendChild(createOption("", canViewAnyTasks() ? "Todos" : "Mis registros"));
    tasksFilterAssignedTo.appendChild(createOption("", canViewAnyTasks() ? "Todos" : "Mis asignaciones"));

    const users = state.users.length
      ? state.users
      : state.user
        ? [{ id: state.user.id, name: state.user.name, email: state.user.email }]
        : [];

    users.forEach((user) => {
      const label = `${user.name} (${user.email})`;
      taskAssignedTo.appendChild(createOption(user.id, label));
      tasksFilterCreatedBy.appendChild(createOption(user.id, label));
      tasksFilterAssignedTo.appendChild(createOption(user.id, label));
    });

    if (!canAssignTask()) {
      taskAssignedTo.disabled = true;
      taskAssignedTo.value = "";
    } else {
      taskAssignedTo.disabled = false;
    }

    if (!canViewAnyTasks()) {
      tasksFilterCreatedBy.disabled = true;
      tasksFilterAssignedTo.disabled = true;
    } else {
      tasksFilterCreatedBy.disabled = false;
      tasksFilterAssignedTo.disabled = false;
    }
  }

  function buildTaskQueryParams(options = {}) {
    const normalizedOptions =
      typeof options === "boolean"
        ? {
            includePagination: options,
            includeSorting: true
          }
        : {
            includePagination: options?.includePagination !== false,
            includeSorting: options?.includeSorting !== false
          };

    const params = new URLSearchParams();

    const q = String(tasksFilterSearch?.value || "").trim();
    if (q) {
      params.set("q", q);
    }

    if (tasksFilterStatus?.value) {
      params.set("status", tasksFilterStatus.value);
    }

    if (tasksFilterPriority?.value) {
      params.set("priority", tasksFilterPriority.value);
    }

    if (canViewAnyTasks() && tasksFilterCreatedBy?.value) {
      params.set("createdById", tasksFilterCreatedBy.value);
    }

    if (canViewAnyTasks() && tasksFilterAssignedTo?.value) {
      params.set("assignedToId", tasksFilterAssignedTo.value);
    }

    if (tasksFilterStartFrom?.value) {
      params.set("startFrom", tasksFilterStartFrom.value);
    }
    if (tasksFilterStartTo?.value) {
      params.set("startTo", tasksFilterStartTo.value);
    }
    if (tasksFilterDueFrom?.value) {
      params.set("dueFrom", tasksFilterDueFrom.value);
    }
    if (tasksFilterDueTo?.value) {
      params.set("dueTo", tasksFilterDueTo.value);
    }

    if (normalizedOptions.includeSorting) {
      if (tasksFilterSortBy?.value) {
        params.set("sortBy", tasksFilterSortBy.value);
      }
      if (tasksFilterSortOrder?.value) {
        params.set("sortOrder", tasksFilterSortOrder.value);
      }
    }

    if (normalizedOptions.includePagination) {
      params.set("page", String(state.page));
      params.set("pageSize", String(state.pageSize));
    }

    return params;
  }

  function renderPagination(pagination) {
    const page = Number(pagination?.page || 1);
    const totalPages = Number(pagination?.totalPages || 1);
    state.page = page;
    state.totalPages = totalPages;
    tasksPageInfo.textContent = `Pagina ${page} de ${totalPages}`;
    tasksPrev.disabled = page <= 1;
    tasksNext.disabled = page >= totalPages;
  }

  function taskRowById(taskId) {
    const normalizedId = Number(taskId);
    return state.activeRows.find((row) => Number(row.id) === normalizedId) || null;
  }

  function setTasksLoading(isLoading, message = "Cargando tareas...") {
    section.setAttribute("aria-busy", isLoading ? "true" : "false");

    if (isLoading) {
      clearNode(tasksTableBody);
      const row = document.createElement("tr");
      row.className = "tasks-loading-row";
      const cell = document.createElement("td");
      cell.colSpan = 10;
      cell.textContent = message;
      row.appendChild(cell);
      tasksTableBody.appendChild(row);
    }

    tasksPrev.disabled = isLoading || state.page <= 1;
    tasksNext.disabled = isLoading || state.page >= state.totalPages;

    if (tasksFilterSubmitBtn) {
      setButtonBusy(tasksFilterSubmitBtn, isLoading, "Aplicando...");
    }
  }

  function renderTasksRows(items) {
    state.activeRows = Array.isArray(items) ? items : [];
    clearNode(tasksTableBody);

    if (!state.activeRows.length) {
      const row = document.createElement("tr");
      row.className = "tasks-empty-row";
      const cell = document.createElement("td");
      cell.colSpan = 10;
      cell.textContent = "No hay tareas para los filtros seleccionados.";
      row.appendChild(cell);
      tasksTableBody.appendChild(row);
      return;
    }

    state.activeRows.forEach((task) => {
      const row = document.createElement("tr");
      const permissions = task.permissions || {};

      const tdId = document.createElement("td");
      tdId.textContent = String(task.id || "");

      const tdTitle = document.createElement("td");
      tdTitle.textContent = task.title || "-";

      const tdStatus = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className = `task-status-pill task-status-${task.status}`;
      statusBadge.textContent = statusLabel(task.status);
      tdStatus.appendChild(statusBadge);

      const tdPriority = document.createElement("td");
      const priorityBadge = document.createElement("span");
      priorityBadge.className = `task-priority-pill task-priority-${task.priority}`;
      priorityBadge.textContent = priorityLabel(task.priority);
      tdPriority.appendChild(priorityBadge);

      const tdCreator = document.createElement("td");
      tdCreator.textContent = task.createdBy?.name || "-";

      const tdAssigned = document.createElement("td");
      tdAssigned.textContent = task.assignedTo?.name || "-";

      const tdStart = document.createElement("td");
      tdStart.textContent = formatDate(task.startDate);

      const tdDue = document.createElement("td");
      tdDue.textContent = formatDate(task.dueDate);

      const tdUpdated = document.createElement("td");
      tdUpdated.textContent = formatDateTime(task.updatedAt);

      const tdActions = document.createElement("td");
      const actionWrap = document.createElement("div");
      actionWrap.className = "task-actions-inline";

      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "btn btn-ghost task-view";
      viewButton.dataset.taskId = String(task.id);
      viewButton.textContent = "Ver";
      viewButton.title = "Ver detalle de la tarea";
      actionWrap.appendChild(viewButton);

      if (permissions.canEdit) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn btn-ghost task-edit";
        editButton.dataset.taskId = String(task.id);
        editButton.textContent = "Editar";
        editButton.title = "Editar tarea";
        actionWrap.appendChild(editButton);
      }

      if (permissions.canDelete) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-ghost task-delete";
        deleteButton.dataset.taskId = String(task.id);
        deleteButton.textContent = "Eliminar";
        deleteButton.title = "Eliminar tarea";
        actionWrap.appendChild(deleteButton);
      }

      if (permissions.canChangeStatus) {
        const statusControl = document.createElement("div");
        statusControl.className = "task-status-control";

        const statusSelect = document.createElement("select");
        statusSelect.className = "task-status-select";
        statusSelect.dataset.taskId = String(task.id);
        statusSelect.title = "Seleccionar nuevo estado";

        Object.keys(STATUS_LABELS).forEach((statusKey) => {
          const option = createOption(statusKey, statusLabel(statusKey));
          if (statusKey === task.status) {
            option.selected = true;
          }
          statusSelect.appendChild(option);
        });

        const applyStatusButton = document.createElement("button");
        applyStatusButton.type = "button";
        applyStatusButton.className = "btn btn-ghost task-status-apply";
        applyStatusButton.dataset.taskId = String(task.id);
        applyStatusButton.textContent = "Estado";
        applyStatusButton.title = "Aplicar cambio de estado";

        statusControl.appendChild(statusSelect);
        statusControl.appendChild(applyStatusButton);
        actionWrap.appendChild(statusControl);
      }

      tdActions.appendChild(actionWrap);
      row.appendChild(tdId);
      row.appendChild(tdTitle);
      row.appendChild(tdStatus);
      row.appendChild(tdPriority);
      row.appendChild(tdCreator);
      row.appendChild(tdAssigned);
      row.appendChild(tdStart);
      row.appendChild(tdDue);
      row.appendChild(tdUpdated);
      row.appendChild(tdActions);
      tasksTableBody.appendChild(row);
    });
  }

  function renderSummary(stats, pagination) {
    const total = Number(stats?.total || 0);
    const byStatus = stats?.byStatus || {};
    const page = Number(pagination?.page || state.page || 1);
    const totalPages = Number(pagination?.totalPages || state.totalPages || 1);
    if (!tasksSummary) {
      return;
    }

    tasksSummary.classList.add("tasks-summary-metrics");
    clearNode(tasksSummary);

    const metrics = [
      `Total ${total}`,
      `Sin realizar ${Number(byStatus.sin_realizar || 0)}`,
      `En proceso ${Number(byStatus.en_proceso || 0)}`,
      `Pendiente revision ${Number(byStatus.pendiente_revision || 0)}`,
      `Completadas ${Number(byStatus.completada || 0)}`,
      `Canceladas ${Number(byStatus.cancelada || 0)}`,
      `Pagina ${page}/${totalPages}`
    ];

    metrics.forEach((label, index) => {
      const chip = document.createElement("span");
      chip.className = "tasks-summary-chip";
      if (index === 0) {
        chip.classList.add("is-primary");
      }
      if (index === metrics.length - 1) {
        chip.classList.add("is-page");
      }
      chip.textContent = label;
      tasksSummary.appendChild(chip);
    });
  }

  async function loadSession() {
    const { response, data, networkError } = await api("/auth/me");
    if (networkError) {
      showToast("No hay conexion con el servidor.", "error");
      return false;
    }
    if (!response?.ok || !data) {
      handleUnauthorized();
      return false;
    }

    state.user = data;
    state.capabilities = data.capabilities || null;
    if (!state.capabilities?.panels?.tareas) {
      window.location.href = "/dashboard";
      return false;
    }
    return true;
  }

  async function loadUsers() {
    if (!canViewAnyTasks() && !canAssignTask()) {
      state.users = [];
      renderUserSelectors();
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
      showToast(resolveErrorMessage(data?.error), "error");
      return;
    }

    state.users = Array.isArray(data) ? data : [];
    renderUserSelectors();
  }

  async function loadTaskStats() {
    const params = buildTaskQueryParams({
      includePagination: false,
      includeSorting: false
    });
    const { response, data, networkError } = await apiAuth(`/tasks/stats?${params.toString()}`);
    if (networkError) {
      showToast("No hay conexion para cargar estadisticas de tareas.", "error");
      return null;
    }
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return null;
      }
      showToast(resolveErrorMessage(data?.error), "error");
      return null;
    }
    return data;
  }

  async function loadTasks() {
    setTasksLoading(true);
    try {
      const params = buildTaskQueryParams({
        includePagination: true,
        includeSorting: true
      });
      const { response, data, networkError } = await apiAuth(`/tasks?${params.toString()}`);
      if (networkError) {
        showToast("No hay conexion para cargar tareas.", "error");
        return;
      }
      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        showToast(resolveErrorMessage(data?.error), "error");
        return;
      }

      renderTasksRows(data?.items || []);
      renderPagination(data?.pagination || {});
      const stats = await loadTaskStats();
      if (stats) {
        renderSummary(stats, data?.pagination || {});
      }
    } finally {
      setTasksLoading(false);
    }
  }

  async function loadTaskDetail(taskId) {
    const { response, data, networkError } = await apiAuth(`/tasks/${taskId}`);
    if (networkError) {
      showToast("No hay conexion para consultar la tarea.", "error");
      return;
    }
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      showToast(resolveErrorMessage(data?.error), "error");
      return;
    }
    renderTaskDetail(data);
  }

  function extractTaskPayloadFromForm() {
    const payload = {
      title: String(taskTitle.value || "").trim(),
      description: String(taskDescription.value || "").trim(),
      status: taskStatus.value,
      priority: taskPriority.value
    };

    if (taskStartDate.value) {
      payload.startDate = taskStartDate.value;
    }
    if (taskDueDate.value) {
      payload.dueDate = taskDueDate.value;
    }
    if (canAssignTask() && taskAssignedTo.value) {
      payload.assignedTo = Number(taskAssignedTo.value);
    }

    return payload;
  }

  function setFormForEdit(task) {
    if (!task) {
      return;
    }
    state.editingTaskId = Number(task.id);
    taskFormTitle.textContent = `Editar tarea #${task.id}`;
    taskSaveBtn.textContent = "Guardar cambios";
    taskCancelBtn.classList.remove("hidden");
    taskTitle.value = task.title || "";
    taskDescription.value = task.description || "";
    taskStatus.value = task.status || "sin_realizar";
    taskPriority.value = task.priority || "media";
    taskStartDate.value = task.startDate || "";
    taskDueDate.value = task.dueDate || "";
    taskAssignedTo.value = task.assignedTo?.id ? String(task.assignedTo.id) : "";
    syncTaskDateConstraints();
    renderTaskDetail(task);
  }

  async function handleTaskSubmit(event) {
    event.preventDefault();
    const submitButton = event.submitter || taskSaveBtn;
    setButtonBusy(submitButton, true, "Guardando...");

    const payload = extractTaskPayloadFromForm();
    if (!payload.title || payload.title.length < 3 || !payload.description || payload.description.length < 3) {
      setButtonBusy(submitButton, false);
      showToast("Completa titulo y descripcion (minimo 3 caracteres).", "error");
      return;
    }

    if (payload.startDate && payload.dueDate && payload.startDate > payload.dueDate) {
      setButtonBusy(submitButton, false);
      showToast("La fecha de inicio no puede ser mayor que la fecha limite.", "error");
      return;
    }

    const today = toLocalISODate();
    if ((payload.startDate && payload.startDate < today) || (payload.dueDate && payload.dueDate < today)) {
      setButtonBusy(submitButton, false);
      showToast("No se permite registrar tareas con fechas anteriores.", "error");
      return;
    }

    if (state.editingTaskId && !Number.isInteger(state.editingTaskId)) {
      setButtonBusy(submitButton, false);
      showToast("No se pudo identificar la tarea a editar.", "error");
      return;
    }

    const endpoint = state.editingTaskId ? `/tasks/${state.editingTaskId}` : "/tasks";
    const method = state.editingTaskId ? "PATCH" : "POST";
    const { response, data, networkError } = await apiAuth(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    setButtonBusy(submitButton, false);

    if (networkError) {
      showToast("No hay conexion para guardar la tarea.", "error");
      return;
    }
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      showToast(resolveErrorMessage(data?.error), "error");
      return;
    }

    showToast(state.editingTaskId ? "Tarea actualizada correctamente." : "Tarea creada correctamente.", "success");
    resetTaskForm();
    await loadTasks();
  }

  async function handleTaskDelete(taskId) {
    if (!window.confirm("¿Eliminar esta tarea? Esta accion la retirara del listado activo.")) {
      return;
    }

    const { response, data, networkError } = await apiAuth(`/tasks/${taskId}`, {
      method: "DELETE"
    });
    if (networkError) {
      showToast("No hay conexion para eliminar la tarea.", "error");
      return;
    }
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      showToast(resolveErrorMessage(data?.error), "error");
      return;
    }
    showToast("Tarea eliminada correctamente.", "success");
    renderTaskDetail(null);
    await loadTasks();
  }

  async function handleStatusUpdate(taskId, statusValue) {
    const { response, data, networkError } = await apiAuth(`/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: statusValue
      })
    });

    if (networkError) {
      showToast("No hay conexion para actualizar el estado.", "error");
      return;
    }
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      showToast(resolveErrorMessage(data?.error), "error");
      return;
    }
    showToast("Estado de tarea actualizado.", "success");
    await loadTasks();
  }

  async function downloadExport(format) {
    if (!canExportTask()) {
      showToast("No tienes permisos para exportar tareas.", "error");
      return;
    }

    const exportButton = format === "pdf" ? tasksExportPdf : tasksExportXlsx;
    setButtonBusy(exportButton, true, format === "pdf" ? "Generando PDF..." : "Generando Excel...");

    try {
      const params = buildTaskQueryParams({
        includePagination: false,
        includeSorting: true
      });
      const endpoint = format === "pdf" ? "/tasks/export/pdf" : "/tasks/export/xlsx";
      const initialResponse = await fetch(`${endpoint}?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin"
      });
      let response = initialResponse;

      if (response.status === 401) {
        const refreshed = await refreshSession();
        if (refreshed) {
          response = await fetch(`${endpoint}?${params.toString()}`, {
            method: "GET",
            credentials: "same-origin"
          });
        }
      }

      if (!response.ok) {
        let body = null;
        try {
          body = await response.json();
        } catch (_error) {
          body = null;
        }
        showToast(resolveErrorMessage(body?.error), "error");
        return;
      }

      const blob = await response.blob();
      const defaultName = format === "pdf" ? "tasks.pdf" : "tasks.xlsx";
      const suggestedName =
        parseContentDispositionFileName(response.headers.get("content-disposition")) || defaultName;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = suggestedName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      showToast("Exportacion completada.", "success");
    } catch (_error) {
      showToast("No hay conexion para exportar tareas.", "error");
    } finally {
      setButtonBusy(exportButton, false);
    }
  }

  async function handleTableClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const viewButton = target.closest(".task-view");
    if (viewButton instanceof HTMLButtonElement) {
      const taskId = Number(viewButton.dataset.taskId || 0);
      if (taskId > 0) {
        await loadTaskDetail(taskId);
      }
      return;
    }

    const editButton = target.closest(".task-edit");
    if (editButton instanceof HTMLButtonElement) {
      const taskId = Number(editButton.dataset.taskId || 0);
      const task = taskRowById(taskId);
      if (!task) {
        showToast("No se encontro la tarea para edicion.", "error");
        return;
      }
      setFormForEdit(task);
      taskTitle.focus();
      return;
    }

    const deleteButton = target.closest(".task-delete");
    if (deleteButton instanceof HTMLButtonElement) {
      const taskId = Number(deleteButton.dataset.taskId || 0);
      if (taskId > 0) {
        await handleTaskDelete(taskId);
      }
      return;
    }

    const statusButton = target.closest(".task-status-apply");
    if (statusButton instanceof HTMLButtonElement) {
      const taskId = Number(statusButton.dataset.taskId || 0);
      if (taskId <= 0) {
        return;
      }
      const selector = tasksTableBody.querySelector(`.task-status-select[data-task-id="${taskId}"]`);
      if (!(selector instanceof HTMLSelectElement)) {
        return;
      }
      await handleStatusUpdate(taskId, selector.value);
    }
  }

  async function handlePaginationPrev() {
    if (state.page <= 1) {
      return;
    }
    state.page -= 1;
    await loadTasks();
  }

  async function handlePaginationNext() {
    if (state.page >= state.totalPages) {
      return;
    }
    state.page += 1;
    await loadTasks();
  }

  async function handleFiltersSubmit(event) {
    event.preventDefault();
    state.page = 1;
    state.pageSize = Number(tasksPageSize.value || 20);
    syncAdvancedFiltersState();
    await loadTasks();
  }

  async function init() {
    const sessionReady = await loadSession();
    if (!sessionReady) {
      return;
    }

    if (!canCreateTask()) {
      taskForm.classList.add("hidden");
      taskFormTitle.textContent = "Sin permisos para crear tareas";
    } else {
      taskForm.classList.remove("hidden");
    }

    await loadUsers();
    resetTaskForm();
    syncAdvancedFiltersState();
    await loadTasks();
  }

  taskForm.addEventListener("submit", handleTaskSubmit);
  taskStartDate?.addEventListener("change", syncTaskDateConstraints);
  taskDueDate?.addEventListener("change", syncTaskDateConstraints);
  taskCancelBtn.addEventListener("click", () => {
    resetTaskForm();
    renderTaskDetail(null);
  });

  tasksFilterForm.addEventListener("submit", handleFiltersSubmit);
  tasksPageSize.addEventListener("change", async () => {
    state.page = 1;
    state.pageSize = Number(tasksPageSize.value || 20);
    await loadTasks();
  });

  [
    tasksFilterCreatedBy,
    tasksFilterAssignedTo,
    tasksFilterStartFrom,
    tasksFilterStartTo,
    tasksFilterDueFrom,
    tasksFilterDueTo,
    tasksFilterSortBy,
    tasksFilterSortOrder
  ]
    .filter(Boolean)
    .forEach((element) => {
      element.addEventListener("change", syncAdvancedFiltersState);
    });

  tasksPrev.addEventListener("click", handlePaginationPrev);
  tasksNext.addEventListener("click", handlePaginationNext);
  tasksTableBody.addEventListener("click", handleTableClick);

  tasksExportXlsx.addEventListener("click", async () => {
    await downloadExport("xlsx");
  });
  tasksExportPdf.addEventListener("click", async () => {
    await downloadExport("pdf");
  });

  init().catch(() => {
    showToast("No se pudo iniciar el modulo de tareas.", "error");
  });

  syncTaskDateConstraints();
})();
