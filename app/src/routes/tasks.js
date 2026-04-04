const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../middleware/auth");
const { createAuditLog } = require("../services/audit");
const {
  canUserCreateTask,
  canUserAssignTasks,
  canUserExportTasks,
  canUserViewAnyTasks,
  resolveActorId
} = require("../services/authorization");
const {
  TASK_STATUSES,
  TASK_PRIORITIES,
  ensureTaskDateRange,
  getUsersLiteByIds,
  listTasks,
  listTasksForExport,
  getTaskByIdForUser,
  createTask,
  patchTask,
  patchTaskStatus,
  softDeleteTask,
  getTaskStats,
  getTaskDashboardSummary
} = require("../services/tasks");
const {
  buildTaskExportFileName,
  buildTasksXlsxBuffer,
  buildTasksPdfBuffer
} = require("../services/taskExport");

const router = express.Router();

const taskStatusEnum = z.enum(TASK_STATUSES);
const taskPriorityEnum = z.enum(TASK_PRIORITIES);

const taskIdSchema = z.object({
  id: z.coerce.number().int().positive()
});

function resolveClientTimezoneOffsetMinutes(req) {
  const rawOffset = req?.get("x-client-timezone-offset");
  if (rawOffset === undefined || rawOffset === null || rawOffset === "") {
    return null;
  }

  const parsed = Number(rawOffset);
  if (!Number.isInteger(parsed) || parsed < -840 || parsed > 840) {
    return null;
  }

  return parsed;
}

function toISODateWithTimezoneOffset(date, timezoneOffsetMinutes) {
  const tzOffsetMs = Number(timezoneOffsetMinutes) * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function resolveCurrentISODate(req) {
  const clientOffset = resolveClientTimezoneOffsetMinutes(req);
  if (clientOffset !== null) {
    return toISODateWithTimezoneOffset(new Date(), clientOffset);
  }
  return toISODateWithTimezoneOffset(new Date(), new Date().getTimezoneOffset());
}

function hasPastTaskDates(payload, currentDateIso) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const startDate = String(payload.startDate || "").slice(0, 10);
  const dueDate = String(payload.dueDate || "").slice(0, 10);
  return (startDate && startDate < currentDateIso) || (dueDate && dueDate < currentDateIso);
}

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  createdById: z.coerce.number().int().positive().optional(),
  assignedToId: z.coerce.number().int().positive().optional(),
  startFrom: z.string().date().optional(),
  startTo: z.string().date().optional(),
  dueFrom: z.string().date().optional(),
  dueTo: z.string().date().optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "dueDate", "startDate", "status", "priority", "title"])
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

const statsQuerySchema = listQuerySchema
  .omit({
    page: true,
    pageSize: true,
    sortBy: true,
    sortOrder: true
  })
  .extend({});

const dashboardSummaryQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(30).default(7),
    recentLimit: z.coerce.number().int().min(1).max(12).default(5)
  })
  .strict();

const exportQuerySchema = listQuerySchema
  .omit({
    page: true,
    pageSize: true
  })
  .extend({});

const createTaskBaseSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(4000),
  status: taskStatusEnum.default("sin_realizar"),
  priority: taskPriorityEnum.default("media"),
  startDate: z.string().date().optional(),
  dueDate: z.string().date().optional(),
  assignedTo: z.coerce.number().int().positive().optional(),
  assigneeIds: z.array(z.coerce.number().int().positive()).max(25).optional(),
  allowAssigneesEdit: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional()
}).strict();

const createTaskSchema = createTaskBaseSchema
  .superRefine((payload, ctx) => {
    if (payload.startDate && payload.dueDate && payload.startDate > payload.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDate"],
        message: "invalid_date_range"
      });
    }
    const assigneeIds = normalizeAssigneeIds(payload);
    if (payload.allowAssigneesEdit && assigneeIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowAssigneesEdit"],
        message: "shared_edit_requires_assignees"
      });
    }
  });

const updateTaskSchema = createTaskBaseSchema
  .partial()
  .extend({
    assignedTo: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
    assigneeIds: z.union([z.array(z.coerce.number().int().positive()).max(25), z.null()]).optional(),
    allowAssigneesEdit: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.startDate && payload.dueDate && payload.startDate > payload.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDate"],
        message: "invalid_date_range"
      });
    }
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "at_least_one_field_required"
  });

const updateStatusSchema = z
  .object({
    status: taskStatusEnum
  })
  .strict();

function sanitizeTaskForAudit(task) {
  if (!task || typeof task !== "object") {
    return null;
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    startDate: task.startDate,
    dueDate: task.dueDate,
    createdBy: task.createdBy?.id || null,
    assignedTo: task.assignedTo?.id || null,
    assignedUserIds: Array.isArray(task.assignedUserIds) ? task.assignedUserIds : [],
    allowAssigneesEdit: Boolean(task.allowAssigneesEdit),
    updatedAt: task.updatedAt
  };
}

function normalizeAssigneeIds(payload) {
  const raw = [];
  if (Array.isArray(payload?.assigneeIds)) {
    raw.push(...payload.assigneeIds);
  }
  if (payload?.assignedTo !== undefined && payload.assignedTo !== null && payload.assignedTo !== "") {
    raw.unshift(payload.assignedTo);
  }

  const normalized = raw
    .map((candidate) => Number(candidate))
    .filter((candidate) => Number.isInteger(candidate) && candidate > 0);
  return Array.from(new Set(normalized)).slice(0, 25);
}

function buildPayloadWithAssignees(payload, options = {}) {
  const keepAssigneesWhenMissing = Boolean(options.keepAssigneesWhenMissing);
  const hasAssigneeMutation =
    Object.prototype.hasOwnProperty.call(payload, "assignedTo") ||
    Object.prototype.hasOwnProperty.call(payload, "assigneeIds");
  const normalized = normalizeAssigneeIds(payload);
  const nextPayload = { ...payload };
  if (keepAssigneesWhenMissing || hasAssigneeMutation) {
    nextPayload.assigneeIds = normalized;
  }
  if (Object.prototype.hasOwnProperty.call(nextPayload, "assignedTo")) {
    delete nextPayload.assignedTo;
  }
  return nextPayload;
}

async function validateAssigneesOrFail(assigneeIds) {
  if (!Array.isArray(assigneeIds) || assigneeIds.length === 0) {
    return {
      users: [],
      missingIds: []
    };
  }

  const users = await getUsersLiteByIds(assigneeIds);
  const foundIds = new Set(users.map((user) => Number(user.id)));
  const missingIds = assigneeIds.filter((id) => !foundIds.has(Number(id)));
  return {
    users,
    missingIds
  };
}

async function auditTaskAccessDenied(req, details = {}) {
  await createAuditLog({
    userId: req.user?.sub || null,
    action: "task.access_denied",
    entity: "task",
    entityId: details.taskId || null,
    metadata: {
      reason: details.reason || "forbidden",
      route: req.originalUrl,
      method: req.method
    },
    req
  });
}

router.get("/", authenticate, async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    if (!ensureTaskDateRange(query)) {
      return res.status(400).json({ error: "validation_error" });
    }

    const result = await listTasks({
      user: req.user,
      query
    });
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/stats", authenticate, async (req, res, next) => {
  try {
    const query = statsQuerySchema.parse(req.query);
    if (!ensureTaskDateRange(query)) {
      return res.status(400).json({ error: "validation_error" });
    }

    const stats = await getTaskStats({
      user: req.user,
      query
    });

    return res.json(stats);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/dashboard-summary", authenticate, async (req, res, next) => {
  try {
    const query = dashboardSummaryQuerySchema.parse(req.query);
    const summary = await getTaskDashboardSummary({
      user: req.user,
      dueSoonDays: query.days,
      recentLimit: query.recentLimit
    });
    return res.json(summary);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/export/xlsx", authenticate, async (req, res, next) => {
  try {
    if (!canUserExportTasks(req.user)) {
      await auditTaskAccessDenied(req, { reason: "export_forbidden" });
      return res.status(403).json({ error: "forbidden" });
    }

    const query = exportQuerySchema.parse(req.query);
    if (!ensureTaskDateRange(query)) {
      return res.status(400).json({ error: "validation_error" });
    }

    const items = await listTasksForExport({
      user: req.user,
      query,
      limit: 5000
    });
    const buffer = await buildTasksXlsxBuffer(items);
    const fileName = buildTaskExportFileName("bitacora-tareas", "xlsx");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await createAuditLog({
      userId: req.user.sub,
      action: "task.exported",
      entity: "task",
      metadata: {
        format: "xlsx",
        count: items.length
      },
      req
    });

    return res.send(buffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/export/pdf", authenticate, async (req, res, next) => {
  try {
    if (!canUserExportTasks(req.user)) {
      await auditTaskAccessDenied(req, { reason: "export_forbidden" });
      return res.status(403).json({ error: "forbidden" });
    }

    const query = exportQuerySchema.parse(req.query);
    if (!ensureTaskDateRange(query)) {
      return res.status(400).json({ error: "validation_error" });
    }

    const items = await listTasksForExport({
      user: req.user,
      query,
      limit: 3000
    });
    const buffer = await buildTasksPdfBuffer(items, {
      title: "Reporte de tareas",
      generatedBy: req.user.name
    });
    const fileName = buildTaskExportFileName("bitacora-tareas", "pdf");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await createAuditLog({
      userId: req.user.sub,
      action: "task.exported",
      entity: "task",
      metadata: {
        format: "pdf",
        count: items.length
      },
      req
    });

    return res.send(buffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = taskIdSchema.parse(req.params);
    const task = await getTaskByIdForUser(id, req.user);
    if (!task) {
      return res.status(404).json({ error: "task_not_found" });
    }

    const actorId = resolveActorId(req.user);
    const isOwnTask =
      Number(task.createdBy?.id || 0) === actorId || Number(task.assignedTo?.id || 0) === actorId;
    if (canUserViewAnyTasks(req.user) && !isOwnTask) {
      await createAuditLog({
        userId: req.user.sub,
        action: "task.viewed_admin",
        entity: "task",
        entityId: id,
        req
      });
    }

    return res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    if (!canUserCreateTask(req.user)) {
      await auditTaskAccessDenied(req, { reason: "create_forbidden" });
      return res.status(403).json({ error: "forbidden" });
    }

    const rawPayload = createTaskSchema.parse(req.body);
    const payload = buildPayloadWithAssignees(rawPayload, { keepAssigneesWhenMissing: true });
    const currentDateIso = resolveCurrentISODate(req);
    if (hasPastTaskDates(payload, currentDateIso)) {
      return res.status(400).json({ error: "past_date_not_allowed" });
    }

    if (payload.assigneeIds.length > 0 && !canUserAssignTasks(req.user)) {
      await auditTaskAccessDenied(req, { reason: "assign_forbidden" });
      return res.status(403).json({ error: "forbidden" });
    }

    const assigneeValidation = await validateAssigneesOrFail(payload.assigneeIds);
    if (assigneeValidation.missingIds.length > 0) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const created = await createTask({
      user: req.user,
      payload
    });

    await createAuditLog({
      userId: req.user.sub,
      action: "task.created",
      entity: "task",
      entityId: created.id,
      metadata: {
        after: sanitizeTaskForAudit(created)
      },
      req
    });

    if (created.assignedTo && Number(created.assignedTo.id) !== Number(created.createdBy.id)) {
      await createAuditLog({
        userId: req.user.sub,
        action: "task.assigned",
        entity: "task",
        entityId: created.id,
        metadata: {
          assignedTo: created.assignedTo.id
        },
        req
      });
    }

    if (created.allowAssigneesEdit) {
      await createAuditLog({
        userId: req.user.sub,
        action: "task.shared_edit_toggled",
        entity: "task",
        entityId: created.id,
        metadata: {
          enabled: true
        },
        req
      });
    }

    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (error.code === "23503" || error.code === "23514") {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.patch("/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = taskIdSchema.parse(req.params);
    const rawPayload = updateTaskSchema.parse(req.body);
    const payload = buildPayloadWithAssignees(rawPayload);
    const currentDateIso = resolveCurrentISODate(req);
    if (hasPastTaskDates(payload, currentDateIso)) {
      return res.status(400).json({ error: "past_date_not_allowed" });
    }

    if (
      (Object.prototype.hasOwnProperty.call(rawPayload, "assignedTo") ||
        Object.prototype.hasOwnProperty.call(rawPayload, "assigneeIds")) &&
      !canUserAssignTasks(req.user)
    ) {
      await auditTaskAccessDenied(req, { taskId: id, reason: "assign_forbidden" });
      return res.status(403).json({ error: "forbidden" });
    }

    if (Object.prototype.hasOwnProperty.call(rawPayload, "assigneeIds")) {
      const assigneeValidation = await validateAssigneesOrFail(payload.assigneeIds);
      if (assigneeValidation.missingIds.length > 0) {
        return res.status(404).json({ error: "user_not_found" });
      }
    } else if (
      Object.prototype.hasOwnProperty.call(rawPayload, "assignedTo") &&
      payload.assigneeIds.length > 0
    ) {
      const assigneeValidation = await validateAssigneesOrFail(payload.assigneeIds);
      if (assigneeValidation.missingIds.length > 0) {
        return res.status(404).json({ error: "user_not_found" });
      }
    }

    const result = await patchTask({
      taskId: id,
      user: req.user,
      payload
    });

    if (result.error === "not_found") {
      return res.status(404).json({ error: "task_not_found" });
    }
    if (result.error === "forbidden") {
      await auditTaskAccessDenied(req, { taskId: id, reason: "edit_forbidden" });
      return res.status(403).json({ error: "forbidden" });
    }
    if (result.error === "shared_edit_forbidden") {
      await auditTaskAccessDenied(req, { taskId: id, reason: "shared_edit_forbidden" });
      return res.status(403).json({ error: "forbidden" });
    }
    if (result.error === "invalid_shared_edit_state") {
      return res.status(400).json({ error: "validation_error" });
    }
    if (result.error === "no_changes") {
      return res.status(400).json({ error: "validation_error" });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "task.updated",
      entity: "task",
      entityId: id,
      metadata: {
        before: sanitizeTaskForAudit(result.before),
        after: sanitizeTaskForAudit(result.after)
      },
      req
    });

    if (result.statusChanged) {
      await createAuditLog({
        userId: req.user.sub,
        action: "task.status_changed",
        entity: "task",
        entityId: id,
        metadata: {
          beforeStatus: result.before?.status,
          afterStatus: result.after?.status
        },
        req
      });
    }

    if (result.assignedChanged) {
      await createAuditLog({
        userId: req.user.sub,
        action: "task.assigned",
        entity: "task",
        entityId: id,
        metadata: {
          beforeAssignedTo: result.before?.assignedTo?.id || null,
          afterAssignedTo: result.after?.assignedTo?.id || null
        },
        req
      });
    }

    if (result.sharedEditChanged) {
      await createAuditLog({
        userId: req.user.sub,
        action: "task.shared_edit_toggled",
        entity: "task",
        entityId: id,
        metadata: {
          enabled: Boolean(result.after?.allowAssigneesEdit)
        },
        req
      });
    }

    return res.json(result.after);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (error.code === "23503" || error.code === "23514") {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.patch("/:id/status", authenticate, async (req, res, next) => {
  try {
    const { id } = taskIdSchema.parse(req.params);
    const payload = updateStatusSchema.parse(req.body);

    const result = await patchTaskStatus({
      taskId: id,
      user: req.user,
      status: payload.status
    });

    if (result.error === "not_found") {
      return res.status(404).json({ error: "task_not_found" });
    }
    if (result.error === "forbidden") {
      await auditTaskAccessDenied(req, { taskId: id, reason: "status_forbidden" });
      return res.status(403).json({ error: "forbidden" });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "task.status_changed",
      entity: "task",
      entityId: id,
      metadata: {
        beforeStatus: result.before?.status,
        afterStatus: result.after?.status
      },
      req
    });

    return res.json(result.after);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    if (error.code === "23514") {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = taskIdSchema.parse(req.params);

    const result = await softDeleteTask({
      taskId: id,
      user: req.user
    });

    if (result.error === "not_found") {
      return res.status(404).json({ error: "task_not_found" });
    }
    if (result.error === "forbidden") {
      await auditTaskAccessDenied(req, { taskId: id, reason: "delete_forbidden" });
      return res.status(403).json({ error: "forbidden" });
    }

    await createAuditLog({
      userId: req.user.sub,
      action: "task.deleted",
      entity: "task",
      entityId: id,
      metadata: {
        before: sanitizeTaskForAudit(result.before)
      },
      req
    });

    return res.json({
      message: "Tarea eliminada correctamente"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error" });
    }
    return next(error);
  }
});

module.exports = { tasksRouter: router };
