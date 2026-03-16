const rowsEl = document.getElementById("rows");
const summaryEl = document.getElementById("summary");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const closeBtn = document.getElementById("closeBtn");

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
  rowsEl.innerHTML = "";
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 8;
  td.textContent = message;
  tr.appendChild(td);
  rowsEl.appendChild(tr);
}

function canDeleteEvent(item) {
  if (!state.currentUser) {
    return false;
  }
  return String(item.encargadoId) === String(state.currentUser.id);
}

function renderRows(items) {
  rowsEl.innerHTML = "";
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
      td.textContent = value;
      tr.appendChild(td);
    });

    const actionsTd = document.createElement("td");
    if (canDeleteEvent(item)) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn btn-ghost report-delete";
      deleteButton.dataset.eventId = String(item.id);
      deleteButton.textContent = "Eliminar";
      actionsTd.appendChild(deleteButton);
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
    summaryEl.textContent = "Faltan parametros de rango (from/to).";
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
    summaryEl.textContent = "Tu sesion expiro. Cierra esta ventana y vuelve a iniciar sesion.";
    renderEmpty("Sesion no valida.");
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  if (!response.ok) {
    summaryEl.textContent = "No se pudo cargar la vista completa.";
    renderEmpty("Error al cargar informacion.");
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  const data = await response.json();
  state.totalPages = Number(data.pagination?.totalPages || 1);
  summaryEl.textContent = `Rango ${formatDate(baseQuery.from)} - ${formatDate(baseQuery.to)} | Registros ${
    data.totalEvents || 0
  } | Pagina ${state.page} de ${state.totalPages}`;

  renderRows(Array.isArray(data.events) ? data.events : []);
  prevBtn.disabled = state.page <= 1;
  nextBtn.disabled = state.page >= state.totalPages;
}

async function handleDelete(eventId) {
  if (!eventId) {
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
    credentials: "same-origin"
  });

  if (response.status === 401) {
    summaryEl.textContent = "Tu sesion expiro. Cierra esta ventana y vuelve a iniciar sesion.";
    return;
  }

  if (!response.ok) {
    summaryEl.textContent = "No se pudo eliminar el registro.";
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
