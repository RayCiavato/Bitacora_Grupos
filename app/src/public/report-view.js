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
  pageSize: Number(params.get("pageSize") || 100)
};

const state = {
  page: Number(params.get("page") || 1),
  totalPages: 1,
  currentUser: null
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

function canAdminManageEvents() {
  return state.currentUser?.role === "admin";
}

function renderRows(items) {
  clearElement(rowsEl);
  if (!items.length) {
    renderEmpty("No hay registros para el rango seleccionado.");
    return;
  }

  items.forEach((item) => {
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
    if (canAdminManageEvents()) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "btn btn-ghost report-edit";
      editButton.dataset.eventId = String(item.id);
      editButton.dataset.eventPayload = JSON.stringify({
        fecha: item.fecha,
        descripcionActividad: item.descripcionActividad || "",
        observacion: item.observacion || "",
        prioridad: normalizePriority(item.prioridad)
      });
      editButton.textContent = "Editar";

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn btn-ghost report-delete";
      deleteButton.dataset.eventId = String(item.id);
      deleteButton.textContent = "Eliminar";
      actionsTd.appendChild(editButton);
      actionsTd.appendChild(deleteButton);
    } else {
      const readOnlyTag = document.createElement("span");
      readOnlyTag.className = "help-text";
      readOnlyTag.textContent = "Solo admin";
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

  if (!canAdminManageEvents()) {
    security.setSafeText(summaryEl, "Solo admin puede eliminar registros.");
    return;
  }

  const confirmed = window.confirm(
    `Confirma eliminar el registro #${eventId}. Esta accion no se puede deshacer.`
  );
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

async function handleEdit(eventId, payloadRaw) {
  if (!canAdminManageEvents()) {
    security.setSafeText(summaryEl, "Solo admin puede editar registros.");
    return;
  }

  let current = null;
  try {
    current = JSON.parse(payloadRaw || "{}");
  } catch (_error) {
    current = null;
  }

  const fecha = window.prompt("Fecha (YYYY-MM-DD)", current?.fecha || "");
  if (fecha === null) {
    return;
  }
  const descripcionActividad = window.prompt(
    "Descripcion de actividad",
    current?.descripcionActividad || ""
  );
  if (descripcionActividad === null) {
    return;
  }
  const observacion = window.prompt("Observacion", current?.observacion || "");
  if (observacion === null) {
    return;
  }
  const prioridadRaw = window.prompt(
    "Prioridad (baja, media, alta, observacion)",
    normalizePriority(current?.prioridad)
  );
  if (prioridadRaw === null) {
    return;
  }

  const prioridad = normalizePriority(prioridadRaw.trim());

  const response = await fetch(`/events/${eventId}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: addCsrfHeaderIfNeeded({ "Content-Type": "application/json" }, "PATCH"),
    body: JSON.stringify({
      fecha: fecha.trim(),
      descripcionActividad: descripcionActividad.trim(),
      observacion: observacion.trim(),
      prioridad
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
    await handleEdit(eventId, editButton.dataset.eventPayload || "");
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
