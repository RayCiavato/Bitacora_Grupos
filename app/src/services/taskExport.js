const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const APP_TIMEZONE = "America/Caracas";
const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("es-VE", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-VE", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

const STATUS_LABELS = Object.freeze({
  sin_realizar: "Sin realizar",
  en_proceso: "En proceso",
  pendiente_revision: "Pendiente de revision",
  completada: "Completada",
  cancelada: "Cancelada"
});

const PRIORITY_LABELS = Object.freeze({
  baja: "Baja",
  media: "Media",
  alta: "Alta"
});

function formatDateOnly(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return normalized;
  }
  return DATE_ONLY_FORMATTER.format(date);
}

function formatTimestamp(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return DATE_TIME_FORMATTER.format(date);
}

function labelStatus(value) {
  return STATUS_LABELS[String(value || "")] || String(value || "");
}

function labelPriority(value) {
  return PRIORITY_LABELS[String(value || "")] || String(value || "");
}

function sanitizeExcelCell(value) {
  const normalized = String(value ?? "");
  if (!normalized) {
    return "";
  }

  // Mitiga formula injection en hojas de calculo.
  if (/^[=+\-@]/.test(normalized) || /^[\t\r]/.test(normalized)) {
    return `'${normalized}`;
  }
  return normalized;
}

function buildTaskExportFileName(prefix, extension) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const y = parts.find((part) => part.type === "year")?.value || "0000";
  const m = parts.find((part) => part.type === "month")?.value || "01";
  const d = parts.find((part) => part.type === "day")?.value || "01";
  return `${prefix}-${y}${m}${d}.${extension}`;
}

async function buildTasksXlsxBuffer(tasks) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tareas");

  sheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Titulo", key: "title", width: 32 },
    { header: "Descripcion", key: "description", width: 56 },
    { header: "Estado", key: "status", width: 18 },
    { header: "Prioridad", key: "priority", width: 12 },
    { header: "Inicio", key: "startDate", width: 14 },
    { header: "Vencimiento", key: "dueDate", width: 14 },
    { header: "Creado por", key: "createdBy", width: 24 },
    { header: "Asignado a", key: "assignedTo", width: 24 },
    { header: "Actualizado", key: "updatedAt", width: 22 }
  ];

  tasks.forEach((task) => {
    sheet.addRow({
      id: task.id,
      title: sanitizeExcelCell(task.title),
      description: sanitizeExcelCell(task.description),
      status: labelStatus(task.status),
      priority: labelPriority(task.priority),
      startDate: formatDateOnly(task.startDate),
      dueDate: formatDateOnly(task.dueDate),
      createdBy: sanitizeExcelCell(task.createdBy?.name || ""),
      assignedTo: sanitizeExcelCell(task.assignedTo?.name || ""),
      updatedAt: formatTimestamp(task.updatedAt)
    });
  });

  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: "A1", to: "J1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  return workbook.xlsx.writeBuffer();
}

async function buildTasksPdfBuffer(tasks, options = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: 36
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const title = String(options.title || "Reporte de tareas");
    const generatedBy = String(options.generatedBy || "");
    const generatedAt = formatTimestamp(new Date());

    doc.fontSize(18).text(title, { align: "left" });
    doc.moveDown(0.4);
    doc
      .fontSize(10)
      .fillColor("#555555")
      .text(`Generado: ${generatedAt}${generatedBy ? ` | Usuario: ${generatedBy}` : ""}`);
    doc.moveDown(0.8);

    if (!tasks.length) {
      doc.fontSize(12).fillColor("#222222").text("No hay tareas para exportar con los filtros actuales.");
      doc.end();
      return;
    }

    tasks.forEach((task, index) => {
      doc.fontSize(12).fillColor("#111111").text(`${index + 1}. ${task.title || "Sin titulo"}`);
      doc
        .fontSize(10)
        .fillColor("#444444")
        .text(
          `Estado: ${labelStatus(task.status)} | Prioridad: ${labelPriority(task.priority)} | Vencimiento: ${formatDateOnly(task.dueDate) || "-"}`
        );
      doc
        .fontSize(10)
        .fillColor("#444444")
        .text(
          `Creado por: ${task.createdBy?.name || "-"} | Asignado a: ${task.assignedTo?.name || "-"}`
        );

      if (task.description) {
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor("#111111").text(task.description);
      }

      doc.moveDown(0.5);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor("#D1D5DB")
        .stroke();
      doc.moveDown(0.5);
    });

    doc.end();
  });
}

module.exports = {
  buildTaskExportFileName,
  buildTasksXlsxBuffer,
  buildTasksPdfBuffer
};
