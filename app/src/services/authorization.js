const PANEL_KEYS = Object.freeze([
  "dashboard",
  "resumen",
  "registroNuevo",
  "informes",
  "tendencias",
  "adjuntos",
  "tareas",
  "usuarios",
  "plantillas"
]);

const BASE_PANELS = Object.freeze({
  dashboard: true,
  resumen: true,
  registroNuevo: true,
  informes: true,
  tendencias: true,
  adjuntos: true,
  tareas: true,
  usuarios: false,
  plantillas: false
});

const ROLE_CAPABILITIES = Object.freeze({
  admin: Object.freeze({
    panels: Object.freeze({
      ...BASE_PANELS,
      usuarios: true,
      plantillas: true
    }),
    actions: Object.freeze({
      users: Object.freeze({
        viewList: true,
        manage: true,
        changeOwnPassword: true
      }),
      templates: Object.freeze({
        view: true,
        manage: true
      }),
      reports: Object.freeze({
        filterByUser: true,
        export: true
      }),
      events: Object.freeze({
        create: true,
        editAny: true,
        deleteAny: true
      }),
      attachments: Object.freeze({
        uploadAny: true,
        uploadOwn: true,
        viewAny: true,
        viewOwn: true
      }),
      tasks: Object.freeze({
        viewAny: true,
        viewOwnCreated: true,
        viewAssigned: true,
        create: true,
        assignAny: true,
        editAny: true,
        editOwnCreated: true,
        editAssigned: true,
        deleteAny: true,
        deleteOwnCreated: true,
        export: true
      })
    })
  }),
  supervisor: Object.freeze({
    panels: Object.freeze({
      ...BASE_PANELS,
      plantillas: true
    }),
    actions: Object.freeze({
      users: Object.freeze({
        viewList: true,
        manage: false,
        changeOwnPassword: false
      }),
      templates: Object.freeze({
        view: true,
        manage: true
      }),
      reports: Object.freeze({
        filterByUser: true,
        export: true
      }),
      events: Object.freeze({
        create: true,
        editAny: false,
        deleteAny: false
      }),
      attachments: Object.freeze({
        uploadAny: false,
        uploadOwn: true,
        viewAny: true,
        viewOwn: true
      }),
      tasks: Object.freeze({
        viewAny: true,
        viewOwnCreated: true,
        viewAssigned: true,
        create: true,
        assignAny: true,
        editAny: true,
        editOwnCreated: true,
        editAssigned: true,
        deleteAny: false,
        deleteOwnCreated: true,
        export: true
      })
    })
  }),
  funcionario: Object.freeze({
    panels: Object.freeze({
      ...BASE_PANELS
    }),
    actions: Object.freeze({
      users: Object.freeze({
        viewList: false,
        manage: false,
        changeOwnPassword: false
      }),
      templates: Object.freeze({
        view: true,
        manage: false
      }),
      reports: Object.freeze({
        filterByUser: false,
        export: true
      }),
      events: Object.freeze({
        create: true,
        editAny: false,
        deleteAny: false
      }),
      attachments: Object.freeze({
        uploadAny: false,
        uploadOwn: true,
        viewAny: true,
        viewOwn: true
      }),
      tasks: Object.freeze({
        viewAny: false,
        viewOwnCreated: true,
        viewAssigned: true,
        create: true,
        assignAny: false,
        editAny: false,
        editOwnCreated: true,
        editAssigned: true,
        deleteAny: false,
        deleteOwnCreated: true,
        export: true
      })
    })
  })
});

function normalizeRole(role) {
  const rawRole = String(role || "").trim().toLowerCase();
  if (Object.hasOwn(ROLE_CAPABILITIES, rawRole)) {
    return rawRole;
  }
  return "funcionario";
}

function cloneCapabilities(capabilities) {
  return {
    panels: {
      ...capabilities.panels
    },
    actions: {
      users: {
        ...capabilities.actions.users
      },
      templates: {
        ...capabilities.actions.templates
      },
      reports: {
        ...capabilities.actions.reports
      },
      events: {
        ...capabilities.actions.events
      },
      attachments: {
        ...capabilities.actions.attachments
      },
      tasks: {
        ...capabilities.actions.tasks
      }
    }
  };
}

function getSessionCapabilities(role) {
  const normalizedRole = normalizeRole(role);
  return cloneCapabilities(ROLE_CAPABILITIES[normalizedRole]);
}

function resolveActorId(user) {
  if (!user) {
    return null;
  }
  const candidate = user.id ?? user.sub;
  const parsedId = Number(candidate);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }
  return parsedId;
}

function canUserManageTemplates(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.templates.manage);
}

function canUserFilterByUser(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.reports.filterByUser);
}

function canUserViewUsers(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.users.viewList);
}

function canUserManageUsers(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.users.manage);
}

function canUserEditAnyEvent(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.events.editAny);
}

function canUserEditEvent(user, ownerId) {
  if (canUserEditAnyEvent(user)) {
    return true;
  }

  const actorId = resolveActorId(user);
  const normalizedOwnerId = Number(ownerId);
  if (!Number.isInteger(actorId) || !Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
    return false;
  }

  return actorId === normalizedOwnerId;
}

function canUserDeleteAnyEvent(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.events.deleteAny);
}

function canUserUploadEventAttachment(user, ownerId) {
  const capabilities = getSessionCapabilities(user?.role);
  if (capabilities.actions.attachments.uploadAny) {
    return true;
  }

  const actorId = resolveActorId(user);
  const normalizedOwnerId = Number(ownerId);
  if (!Number.isInteger(actorId) || !Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
    return false;
  }

  return capabilities.actions.attachments.uploadOwn && actorId === normalizedOwnerId;
}

function canUserViewEventAttachments(user, ownerId) {
  const capabilities = getSessionCapabilities(user?.role);
  if (capabilities.actions.attachments.viewAny) {
    return true;
  }

  const actorId = resolveActorId(user);
  const normalizedOwnerId = Number(ownerId);
  if (!Number.isInteger(actorId) || !Number.isInteger(normalizedOwnerId) || normalizedOwnerId <= 0) {
    return false;
  }

  return capabilities.actions.attachments.viewOwn && actorId === normalizedOwnerId;
}

function resolveTaskUserIds(task) {
  if (!task || typeof task !== "object") {
    return {
      createdById: null,
      assignedToId: null,
      assignedUserIds: [],
      allowAssigneesEdit: false
    };
  }

  const createdByCandidate =
    task.createdById ??
    task.created_by ??
    task.createdBy?.id ??
    task.createdBy ??
    task.ownerId ??
    task.userId;
  const assignedToCandidate =
    task.assignedToId ?? task.assigned_to ?? task.assignedTo?.id ?? task.assignedTo ?? null;
  const allowAssigneesEdit = Boolean(
    task.allowAssigneesEdit ?? task.allow_assignees_edit ?? false
  );

  let assigneeCandidates = [];
  if (Array.isArray(task.assigneeIds)) {
    assigneeCandidates = task.assigneeIds;
  } else if (Array.isArray(task.assignee_ids)) {
    assigneeCandidates = task.assignee_ids;
  } else if (task.assignee_ids && typeof task.assignee_ids === "string") {
    const normalized = String(task.assignee_ids)
      .replace(/[{}]/g, "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    assigneeCandidates = normalized;
  }

  const createdById = Number(createdByCandidate);
  const assignedToId = Number(assignedToCandidate);
  const assignedUserIds = Array.from(
    new Set(
      assigneeCandidates
        .map((candidate) => Number(candidate))
        .filter((candidate) => Number.isInteger(candidate) && candidate > 0)
    )
  );

  if (
    Number.isInteger(assignedToId) &&
    assignedToId > 0 &&
    !assignedUserIds.includes(assignedToId)
  ) {
    assignedUserIds.unshift(assignedToId);
  }

  return {
    createdById:
      Number.isInteger(createdById) && createdById > 0 ? createdById : null,
    assignedToId:
      Number.isInteger(assignedToId) && assignedToId > 0 ? assignedToId : null,
    assignedUserIds,
    allowAssigneesEdit
  };
}

function canUserCreateTask(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.tasks.create);
}

function canUserViewAnyTasks(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.tasks.viewAny);
}

function canUserAssignTasks(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.tasks.assignAny);
}

function canUserExportTasks(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.tasks.export);
}

function canUserEditAnyTask(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.tasks.editAny);
}

function canUserDeleteAnyTask(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.tasks.deleteAny);
}

function canUserViewTask(user, task) {
  const capabilities = getSessionCapabilities(user?.role);
  if (capabilities.actions.tasks.viewAny) {
    return true;
  }

  const actorId = resolveActorId(user);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    return false;
  }

  const { createdById, assignedToId, assignedUserIds } = resolveTaskUserIds(task);
  if (capabilities.actions.tasks.viewOwnCreated && actorId === createdById) {
    return true;
  }

  if (!capabilities.actions.tasks.viewAssigned) {
    return false;
  }

  if (actorId === assignedToId) {
    return true;
  }

  return assignedUserIds.includes(actorId);
}

function canUserEditTask(user, task) {
  const capabilities = getSessionCapabilities(user?.role);
  if (capabilities.actions.tasks.editAny) {
    return true;
  }

  const actorId = resolveActorId(user);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    return false;
  }

  const { createdById, assignedToId, assignedUserIds, allowAssigneesEdit } = resolveTaskUserIds(task);
  if (capabilities.actions.tasks.editOwnCreated && actorId === createdById) {
    return true;
  }

  if (!capabilities.actions.tasks.editAssigned || !allowAssigneesEdit) {
    return false;
  }

  if (actorId === assignedToId) {
    return true;
  }

  return assignedUserIds.includes(actorId);
}

function canUserDeleteTask(user, task) {
  const capabilities = getSessionCapabilities(user?.role);
  if (capabilities.actions.tasks.deleteAny) {
    return true;
  }

  const actorId = resolveActorId(user);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    return false;
  }

  const { createdById } = resolveTaskUserIds(task);
  return capabilities.actions.tasks.deleteOwnCreated && actorId === createdById;
}

function canUserManageTaskSharedEdit(user, task) {
  const capabilities = getSessionCapabilities(user?.role);
  if (capabilities.actions.tasks.editAny) {
    return true;
  }

  const actorId = resolveActorId(user);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    return false;
  }

  const { createdById } = resolveTaskUserIds(task);
  return capabilities.actions.tasks.editOwnCreated && actorId === createdById;
}

function resolveFileOwnerId(file) {
  if (!file || typeof file !== "object") {
    return null;
  }

  const ownerCandidate = file.ownerId ?? file.owner_id ?? file.uploadedBy ?? file.uploaded_by;
  const ownerId = Number(ownerCandidate);
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    return null;
  }
  return ownerId;
}

function canUserViewFile(user) {
  const actorId = resolveActorId(user);
  return Number.isInteger(actorId) && actorId > 0;
}

function canUserEditFile(user, file) {
  if (normalizeRole(user?.role) === "admin") {
    return true;
  }

  const actorId = resolveActorId(user);
  const ownerId = resolveFileOwnerId(file);
  if (!Number.isInteger(actorId) || actorId <= 0 || !Number.isInteger(ownerId) || ownerId <= 0) {
    return false;
  }

  return actorId === ownerId;
}

function canUserDeleteFile(user, file) {
  return canUserEditFile(user, file);
}

function buildSessionUser(user) {
  if (!user) {
    return null;
  }

  const normalizedRole = normalizeRole(user.role);
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: normalizedRole,
    capabilities: getSessionCapabilities(normalizedRole)
  };
}

function buildEventPermissions(user, eventOwnerId) {
  return {
    canEdit: canUserEditEvent(user, eventOwnerId),
    canDelete: canUserDeleteAnyEvent(user),
    canUploadAttachments: canUserUploadEventAttachment(user, eventOwnerId),
    canViewAttachments: canUserViewEventAttachments(user, eventOwnerId)
  };
}

function buildTaskPermissions(user, task) {
  return {
    canView: canUserViewTask(user, task),
    canEdit: canUserEditTask(user, task),
    canDelete: canUserDeleteTask(user, task),
    canChangeStatus: canUserEditTask(user, task),
    canAssign: canUserAssignTasks(user),
    canExport: canUserExportTasks(user),
    canManageSharedEdit: canUserManageTaskSharedEdit(user, task)
  };
}

module.exports = {
  PANEL_KEYS,
  normalizeRole,
  getSessionCapabilities,
  resolveActorId,
  canUserManageTemplates,
  canUserFilterByUser,
  canUserViewUsers,
  canUserManageUsers,
  canUserEditAnyEvent,
  canUserEditEvent,
  canUserDeleteAnyEvent,
  canUserUploadEventAttachment,
  canUserViewEventAttachments,
  canUserCreateTask,
  canUserViewAnyTasks,
  canUserAssignTasks,
  canUserExportTasks,
  canUserEditAnyTask,
  canUserDeleteAnyTask,
  canUserViewTask,
  canUserEditTask,
  canUserDeleteTask,
  canUserManageTaskSharedEdit,
  canUserViewFile,
  canUserEditFile,
  canUserDeleteFile,
  buildSessionUser,
  buildEventPermissions,
  buildTaskPermissions
};
