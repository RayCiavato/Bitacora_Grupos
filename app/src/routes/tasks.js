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
  getUserLiteById,
  listTasks,
  listTasksForExport,
  getTaskByIdForUser,
  createTask,
  patchTask,
  patchTaskStatus,
  softDeleteTask,
  getTaskStats
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
  });

const updateTaskSchema = createTaskBaseSchema
  .partial()
  .extend({
    assignedTo: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
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
    updatedAt: task.updatedAt
  };
}

async function validateAssigneeOrFail(assigneeId) {
  if (!assigneeId) {
    return null;
  }
  return getUserLiteById(assigneeId);
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

router.get("/export/xlsx", authenticate, async (req, res, next) => {
  try {
    if (!canUserExportTasks(req.user)) {
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
      return res.status(403).json({ error: "forbidden" });
    }

    const payload = createTaskSchema.parse(req.body);
    if (payload.assignedTo && !canUserAssignTasks(req.user)) {
      return res.status(403).json({ error: "forbidden" });
    }

    if (payload.assignedTo) {
      const assignee = await validateAssigneeOrFail(payload.assignedTo);
      if (!assignee) {
        return res.status(404).json({ error: "user_not_found" });
      }
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
    const payload = updateTaskSchema.parse(req.body);

    if (
      Object.prototype.hasOwnProperty.call(payload, "assignedTo") &&
      payload.assignedTo !== undefined &&
      !canUserAssignTasks(req.user)
    ) {
      return res.status(403).json({ error: "forbidden" });
    }

    if (payload.assignedTo) {
      const assignee = await validateAssigneeOrFail(payload.assignedTo);
      if (!assignee) {
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
      return res.status(403).json({ error: "forbidden" });
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
