const rowsEl = document.getElementById("rows");
const summaryEl = document.getElementById("summary");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const closeBtn = document.getElementById("closeBtn");
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

const params = new URLSearchParams(window.location.search);
const baseQuery = {
  from: params.get("from") || "",
  to: params.get("to") || "",
  q: params.get("q") || "",
  priority: params.get("priority") || "",
  encargadoId: params.get("encargadoId") || "",
  sortBy: params.get("sortBy") || "fecha",
  sortOrder: params.get("sortOrder") || "desc",
  pageSize: Number(params.get("pageSize") || 100)
};

const state = {
  page: Number(params.get("page") || 1),
  totalPages: 1,
  currentUser: null,
  eventPayloadById: {},
  eventPermissionsById: {}
};

function clearElement(node) {
  if (!node) {
    return;
  }
  node.replaceChildren();
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

function createReportDialogShell() {
  let modal = document.getElementById("reportDialogModal");
  if (modal) {
    return modal;
  }

  modal = document.createElement("section");
  modal.id = "reportDialogModal";
  modal.className = "entity-modal hidden";
  modal.setAttribute("aria-hidden", "true");

  const overlay = document.createElement("div");
  overlay.className = "entity-modal-overlay";
  overlay.dataset.reportDialogClose = "true";
  modal.appendChild(overlay);

  const card = document.createElement("article");
  card.className = "entity-modal-card";
  modal.appendChild(card);

  const header = document.createElement("header");
  header.className = "entity-modal-header";
  card.appendChild(header);

  const headerText = document.createElement("div");
  header.appendChild(headerText);

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.dataset.reportDialogMeta = "true";
  headerText.appendChild(eyebrow);

  const title = document.createElement("h3");
  title.dataset.reportDialogTitle = "true";
  headerText.appendChild(title);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn btn-ghost";
  closeButton.dataset.reportDialogClose = "true";
  closeButton.textContent = "Cerrar";
  header.appendChild(closeButton);

  const body = document.createElement("div");
  body.className = "entity-modal-body";
  body.dataset.reportDialogBody = "true";
  card.appendChild(body);

  const actions = document.createElement("div");
  actions.className = "entity-modal-actions";
  actions.dataset.reportDialogActions = "true";
  card.appendChild(actions);

  modal.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.hasAttribute("data-report-dialog-close")) {
      const closeEvent = new CustomEvent("report-dialog-close", { detail: { value: null } });
      modal.dispatchEvent(closeEvent);
    }
  });

  document.body.appendChild(modal);
  return modal;
}

function openReportDialog({ title, meta, bodyBuilder, actionsBuilder }) {
  const modal = createReportDialogShell();
  const titleEl = modal.querySelector("[data-report-dialog-title]");
  const metaEl = modal.querySelector("[data-report-dialog-meta]");
  const bodyEl = modal.querySelector("[data-report-dialog-body]");
  const actionsEl = modal.querySelector("[data-report-dialog-actions]");

  return new Promise((resolve) => {
    const close = (value) => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      modal.removeEventListener("report-dialog-close", onClose);
      resolve(value);
    };
    const onClose = (event) => close(event.detail?.value ?? null);

    security.setSafeText(titleEl, title);
    security.setSafeText(metaEl, meta);
    clearElement(bodyEl);
    clearElement(actionsEl);

    bodyBuilder?.(bodyEl, close);
    actionsBuilder?.(actionsEl, close);

    modal.addEventListener("report-dialog-close", onClose);
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  });
}

function openReportConfirmDialog({ title, meta, body, confirmLabel = "Confirmar", danger = false }) {
  return openReportDialog({
    title,
    meta,
    bodyBuilder(bodyEl) {
      security.setSafeText(bodyEl, body);
    },
    actionsBuilder(actionsEl, close) {
      const row = document.createElement("div");
      row.className = "entity-modal-actions-row";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "btn btn-ghost";
      cancelButton.textContent = "Cancelar";
      cancelButton.addEventListener("click", () => close(false));

      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = danger ? "btn btn-danger" : "btn btn-primary";
      confirmButton.textContent = confirmLabel;
      confirmButton.addEventListener("click", () => close(true));

      row.appendChild(cancelButton);
      row.appendChild(confirmButton);
      actionsEl.appendChild(row);
      window.setTimeout(() => cancelButton.focus(), 60);
    }
  });
}

function addReportInput(parent, labelText, field) {
  const label = document.createElement("label");
  label.className = "modal-confirm-input";
  label.textContent = labelText;
  label.appendChild(field);
  parent.appendChild(label);
  return field;
}

function openReportEditDialog(current = {}) {
  return openReportDialog({
    title: "Editar registro",
    meta: "Vista completa de bitacora",
    bodyBuilder(bodyEl, close) {
      const form = document.createElement("form");
      form.className = "report-edit-form";

      const fecha = document.createElement("input");
      fecha.type = "date";
      fecha.value = current?.fecha || "";
      addReportInput(form, "Fecha", fecha);

      const descripcionActividad = document.createElement("textarea");
      descripcionActividad.rows = 4;
      descripcionActividad.value = current?.descripcionActividad || "";
      addReportInput(form, "Descripcion de actividad", descripcionActividad);

      const observacion = document.createElement("textarea");
      observacion.rows = 4;
      observacion.value = current?.observacion || "";
      addReportInput(form, "Observacion", observacion);

      const prioridad = document.createElement("select");
      ["baja", "media", "alta", "observacion"].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = PRIORITY_LABELS[value] || value;
        prioridad.appendChild(option);
      });
      prioridad.value = normalizePriority(current?.prioridad);
      addReportInput(form, "Prioridad", prioridad);

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        close({
          fecha: fecha.value.trim(),
          descripcionActividad: descripcionActividad.value.trim(),
          observacion: observacion.value.trim(),
          prioridad: normalizePriority(prioridad.value)
        });
      });

      bodyEl.appendChild(form);
      bodyEl.dataset.reportEditForm = "true";
      window.setTimeout(() => fecha.focus(), 60);
    },
    actionsBuilder(actionsEl) {
      const row = document.createElement("div");
      row.className = "entity-modal-actions-row";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "btn btn-ghost";
      cancelButton.textContent = "Cancelar";
      cancelButton.addEventListener("click", () => {
        const modal = createReportDialogShell();
        modal.dispatchEvent(new CustomEvent("report-dialog-close", { detail: { value: null } }));
      });

      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.className = "btn btn-primary";
      saveButton.textContent = "Guardar cambios";
      saveButton.addEventListener("click", () => {
        const form = document.querySelector(".report-edit-form");
        form?.requestSubmit();
      });

      row.appendChild(cancelButton);
      row.appendChild(saveButton);
      actionsEl.appendChild(row);
    }
  });
}

const PRIORITY_LABELS = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  observacion: "Observacion informativa"
};

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatPriority(value) {
  const normalized = ["baja", "media", "alta", "observacion"].includes(
    String(value || "").toLowerCase()
  )
    ? String(value).toLowerCase()
    : "media";
  return PRIORITY_LABELS[normalized] || PRIORITY_LABELS.media;
}

function renderEmpty(message) {
  clearElement(rowsEl);
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 8;
  security.setSafeText(td, message);
  tr.appendChild(td);
  rowsEl.appendChild(tr);
}

function normalizePriority(value) {
  const normalized = String(value || "").toLowerCase();
  return ["baja", "media", "alta", "observacion"].includes(normalized)
    ? normalized
    : "media";
}

function resolveTooManyRequestsMessage(payload) {
  const retry = Number(payload?.retryAfterSeconds || payload?.details?.retryAfterSeconds || 0);
  if (Number.isFinite(retry) && retry > 0) {
    return `Demasiadas solicitudes. Intenta en ${Math.ceil(retry)}s.`;
  }
  return "Demasiadas solicitudes. Intenta en unos segundos.";
}

function getEventPermissions(eventId) {
  return state.eventPermissionsById[String(eventId)] || null;
}

function renderRows(items) {
  clearElement(rowsEl);
  state.eventPayloadById = {};
  state.eventPermissionsById = {};
  if (!items.length) {
    renderEmpty("No hay registros para el rango seleccionado.");
    return;
  }

  items.forEach((item) => {
    const permissions = {
      canEdit: Boolean(item?.permissions?.canEdit),
      canDelete: Boolean(item?.permissions?.canDelete)
    };
    const eventId = Number(item.id || 0);
    state.eventPermissionsById[String(eventId)] = permissions;

    const tr = document.createElement("tr");
    const values = [
      formatDate(item.fecha),
      item.encargado || "-",
      item.descripcionActividad || "-",
      item.observacion || "-",
      formatPriority(item.prioridad),
      item.templateName || "-",
      String(item.attachmentsCount || 0)
    ];

    values.forEach((value) => {
      const td = document.createElement("td");
      security.setSafeText(td, value);
      tr.appendChild(td);
    });

    const actionsTd = document.createElement("td");
    if (permissions.canEdit || permissions.canDelete) {
      state.eventPayloadById[eventId] = {
        fecha: item.fecha,
        descripcionActividad: item.descripcionActividad || "",
        observacion: item.observacion || "",
        prioridad: normalizePriority(item.prioridad)
      };

      if (permissions.canEdit) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn btn-ghost report-edit";
        editButton.dataset.eventId = String(eventId);
        editButton.textContent = "Editar";
        actionsTd.appendChild(editButton);
      }

      if (permissions.canDelete) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-ghost report-delete";
        deleteButton.dataset.eventId = String(eventId);
        deleteButton.textContent = "Eliminar";
        actionsTd.appendChild(deleteButton);
      }
    } else {
      const readOnlyTag = document.createElement("span");
      readOnlyTag.className = "help-text";
      readOnlyTag.textContent = "Solo lectura";
      actionsTd.appendChild(readOnlyTag);
    }
    tr.appendChild(actionsTd);

    rowsEl.appendChild(tr);
  });
}

async function loadCurrentUser() {
  const response = await fetch("/auth/me", { credentials: "same-origin" });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function loadPage() {
  if (!baseQuery.from || !baseQuery.to) {
    security.setSafeText(summaryEl, "Faltan parametros de rango (from/to).");
    renderEmpty("No se recibio un rango valido.");
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  const query = new URLSearchParams({
    from: baseQuery.from,
    to: baseQuery.to,
    page: String(state.page),
    pageSize: String(baseQuery.pageSize)
  });

  if (baseQuery.q) {
    query.set("q", baseQuery.q);
  }
  if (baseQuery.priority) {
    query.set("priority", baseQuery.priority);
  }
  if (baseQuery.encargadoId) {
    query.set("encargadoId", baseQuery.encargadoId);
  }
  if (baseQuery.sortBy) {
    query.set("sortBy", baseQuery.sortBy);
  }
  if (baseQuery.sortOrder) {
    query.set("sortOrder", baseQuery.sortOrder);
  }

  const response = await fetch(`/events/report?${query.toString()}`, {
    credentials: "same-origin"
  });

  if (response.status === 401) {
    security.setSafeText(summaryEl, "Tu sesion expiro. Cierra esta ventana y vuelve a iniciar sesion.");
    renderEmpty("Sesion no valida.");
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  if (!response.ok) {
    let errorPayload = null;
    try {
      errorPayload = await response.json();
    } catch (_error) {
      errorPayload = null;
    }

    if (response.status === 429) {
      const rateMessage = resolveTooManyRequestsMessage(errorPayload);
      security.setSafeText(summaryEl, rateMessage);
      renderEmpty(rateMessage);
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    security.setSafeText(summaryEl, "No se pudo cargar la vista completa.");
    renderEmpty("Error al cargar informacion.");
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  const data = await response.json();
  state.totalPages = Number(data.pagination?.totalPages || 1);
  security.setSafeText(
    summaryEl,
    `Rango ${formatDate(baseQuery.from)} - ${formatDate(baseQuery.to)} | Registros ${
      data.totalEvents || 0
    } | Pagina ${state.page} de ${state.totalPages}`
  );

  renderRows(Array.isArray(data.events) ? data.events : []);
  prevBtn.disabled = state.page <= 1;
  nextBtn.disabled = state.page >= state.totalPages;
}

async function handleDelete(eventId) {
  if (!eventId) {
    return;
  }

  if (!getEventPermissions(eventId)?.canDelete) {
    security.setSafeText(summaryEl, "No tienes permisos para eliminar este registro.");
    return;
  }

  const confirmed = await openReportConfirmDialog({
    title: "Eliminar registro",
    meta: `Bitacora #${eventId}`,
    body: "Esta accion retirara el registro del listado activo y conservara la auditoria del sistema.",
    confirmLabel: "Eliminar registro",
    danger: true
  });
  if (!confirmed) {
    return;
  }

  const response = await fetch(`/events/${eventId}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: addCsrfHeaderIfNeeded({}, "DELETE")
  });

  if (response.status === 401) {
    security.setSafeText(summaryEl, "Tu sesion expiro. Cierra esta ventana y vuelve a iniciar sesion.");
    return;
  }

  if (!response.ok) {
    security.setSafeText(summaryEl, "No se pudo eliminar el registro.");
    return;
  }

  await loadPage();
}

async function handleEdit(eventId) {
  if (!getEventPermissions(eventId)?.canEdit) {
    security.setSafeText(summaryEl, "No tienes permisos para editar este registro.");
    return;
  }

  const current = state.eventPayloadById[eventId] || null;
  const payload = await openReportEditDialog(current || {});
  if (!payload) {
    return;
  }

  const response = await fetch(`/events/${eventId}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: addCsrfHeaderIfNeeded({ "Content-Type": "application/json" }, "PATCH"),
    body: JSON.stringify({
      fecha: payload.fecha,
      descripcionActividad: payload.descripcionActividad,
      observacion: payload.observacion,
      prioridad: payload.prioridad
    })
  });

  if (response.status === 401) {
    security.setSafeText(summaryEl, "Tu sesion expiro. Cierra esta ventana y vuelve a iniciar sesion.");
    return;
  }

  if (response.status === 403) {
    security.setSafeText(summaryEl, "Solo admin puede editar registros.");
    return;
  }

  if (!response.ok) {
    security.setSafeText(summaryEl, "No se pudo editar el registro.");
    return;
  }

  await loadPage();
}

prevBtn.addEventListener("click", async () => {
  if (state.page <= 1) {
    return;
  }
  state.page -= 1;
  await loadPage();
});

nextBtn.addEventListener("click", async () => {
  if (state.page >= state.totalPages) {
    return;
  }
  state.page += 1;
  await loadPage();
});

closeBtn.addEventListener("click", () => {
  window.close();
  window.setTimeout(() => {
    if (!window.closed) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
    }
  }, 180);
});

rowsEl.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const editButton = target.closest(".report-edit");
  if (editButton instanceof HTMLButtonElement) {
    const eventId = Number(editButton.dataset.eventId || 0);
    await handleEdit(eventId);
    return;
  }

  const button = target.closest(".report-delete");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const eventId = Number(button.dataset.eventId || 0);
  await handleDelete(eventId);
});

(async () => {
  state.currentUser = await loadCurrentUser();
  await loadPage();
})();
