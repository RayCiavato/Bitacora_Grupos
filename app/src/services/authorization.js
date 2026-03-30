const PANEL_KEYS = Object.freeze([
  "dashboard",
  "resumen",
  "registroNuevo",
  "informes",
  "tendencias",
  "adjuntos",
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
  buildSessionUser,
  buildEventPermissions
};
