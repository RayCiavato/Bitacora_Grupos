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
      assignedToId: null
    };
  }

  const createdByCandidate =
    task.createdById ?? task.created_by ?? task.createdBy ?? task.ownerId ?? task.userId;
  const assignedToCandidate = task.assignedToId ?? task.assigned_to ?? task.assignedTo ?? null;

  const createdById = Number(createdByCandidate);
  const assignedToId = Number(assignedToCandidate);

  return {
    createdById:
      Number.isInteger(createdById) && createdById > 0 ? createdById : null,
    assignedToId:
      Number.isInteger(assignedToId) && assignedToId > 0 ? assignedToId : null
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

  const { createdById, assignedToId } = resolveTaskUserIds(task);
  if (capabilities.actions.tasks.viewOwnCreated && actorId === createdById) {
    return true;
  }

  return capabilities.actions.tasks.viewAssigned && actorId === assignedToId;
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

  const { createdById, assignedToId } = resolveTaskUserIds(task);
  if (capabilities.actions.tasks.editOwnCreated && actorId === createdById) {
    return true;
  }

  return capabilities.actions.tasks.editAssigned && actorId === assignedToId;
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
    canExport: canUserExportTasks(user)
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
  buildSessionUser,
  buildEventPermissions,
  buildTaskPermissions
};
