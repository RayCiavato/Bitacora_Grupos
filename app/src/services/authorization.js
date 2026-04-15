const ROLE_KEYS = Object.freeze(["admin", "supervisor", "funcionario"]);

const PANEL_KEYS = Object.freeze([
  "dashboard",
  "resumen",
  "registroNuevo",
  "informes",
  "tendencias",
  "adjuntos",
  "tareas",
  "usuarios",
  "plantillas",
  "auditoria",
  "configuracion"
]);

const POLICY_ACTION_KEYS = Object.freeze([
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "administer"
]);

const POLICY_MODULE_DEFINITIONS = Object.freeze([
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Acceso al panel ejecutivo principal."
  },
  {
    key: "resumen",
    label: "Bitacoras",
    description: "Consulta y gestion del resumen de bitacoras."
  },
  {
    key: "registroNuevo",
    label: "Registro",
    description: "Creacion de nuevos registros operativos."
  },
  {
    key: "informes",
    label: "Informes",
    description: "Reportes y exportaciones de bitacoras."
  },
  {
    key: "tendencias",
    label: "Tendencias",
    description: "Analitica y graficas de tendencia."
  },
  {
    key: "adjuntos",
    label: "Adjuntos",
    description: "Consulta y administracion de adjuntos."
  },
  {
    key: "tareas",
    label: "Tareas",
    description: "Modulo de tareas y seguimiento."
  },
  {
    key: "usuarios",
    label: "Usuarios",
    description: "Gestion administrativa de usuarios y roles."
  },
  {
    key: "plantillas",
    label: "Plantillas",
    description: "Administracion de plantillas operativas."
  },
  {
    key: "auditoria",
    label: "Auditoria",
    description: "Consulta de trazabilidad y eventos criticos."
  },
  {
    key: "configuracion",
    label: "Configuracion",
    description: "Parametrizacion global del sistema."
  }
]);

const POLICY_MODULE_KEYS = Object.freeze(POLICY_MODULE_DEFINITIONS.map((moduleItem) => moduleItem.key));

const BASE_PANELS = Object.freeze({
  dashboard: true,
  resumen: true,
  registroNuevo: true,
  informes: true,
  tendencias: true,
  adjuntos: true,
  tareas: true,
  usuarios: false,
  plantillas: false,
  auditoria: false,
  configuracion: false
});

const BASE_ROLE_CAPABILITIES = Object.freeze({
  admin: Object.freeze({
    panels: Object.freeze({
      ...BASE_PANELS,
      usuarios: true,
      plantillas: true,
      auditoria: true,
      configuracion: true
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
        editOwn: true,
        deleteAny: true
      }),
      attachments: Object.freeze({
        uploadAny: true,
        uploadOwn: true,
        viewAny: true,
        viewOwn: true,
        editAny: true,
        editOwn: true,
        deleteAny: true,
        deleteOwn: true
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
      plantillas: true,
      auditoria: true
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
        editOwn: true,
        deleteAny: false
      }),
      attachments: Object.freeze({
        uploadAny: false,
        uploadOwn: true,
        viewAny: true,
        viewOwn: true,
        editAny: false,
        editOwn: true,
        deleteAny: false,
        deleteOwn: true
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
        editOwn: true,
        deleteAny: false
      }),
      attachments: Object.freeze({
        uploadAny: false,
        uploadOwn: true,
        viewAny: true,
        viewOwn: true,
        editAny: false,
        editOwn: true,
        deleteAny: false,
        deleteOwn: true
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

const ADMIN_REQUIRED_POLICY_ACTIONS = Object.freeze([
  ["dashboard", "view"],
  ["resumen", "view"],
  ["registroNuevo", "view"],
  ["usuarios", "view"],
  ["usuarios", "administer"],
  ["auditoria", "view"],
  ["configuracion", "view"],
  ["configuracion", "administer"]
]);

// Regla de negocio base: cualquier usuario autenticado debe conservar visibilidad de tareas.
const AUTHENTICATED_REQUIRED_POLICY_ACTIONS = Object.freeze([
  ["tareas", "view"]
]);

function normalizeRole(role) {
  const rawRole = String(role || "").trim().toLowerCase();
  if (Object.hasOwn(BASE_ROLE_CAPABILITIES, rawRole)) {
    return rawRole;
  }
  return "funcionario";
}

function createPolicyTemplate(fillValue = false) {
  const template = {};
  for (const moduleKey of POLICY_MODULE_KEYS) {
    template[moduleKey] = {};
    for (const actionKey of POLICY_ACTION_KEYS) {
      template[moduleKey][actionKey] = Boolean(fillValue);
    }
  }
  return template;
}

function cloneRolePolicy(policy) {
  const clone = createPolicyTemplate(false);
  for (const moduleKey of POLICY_MODULE_KEYS) {
    for (const actionKey of POLICY_ACTION_KEYS) {
      clone[moduleKey][actionKey] = Boolean(policy?.[moduleKey]?.[actionKey]);
    }
  }
  return clone;
}

function cloneRolePoliciesMap(policies) {
  const cloned = {};
  for (const roleKey of ROLE_KEYS) {
    cloned[roleKey] = cloneRolePolicy(policies?.[roleKey]);
  }
  return cloned;
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

function deriveRolePolicyFromCapabilities(capabilities) {
  const policy = createPolicyTemplate(false);
  const actions = capabilities?.actions || {};
  const panels = capabilities?.panels || {};

  policy.dashboard.view = Boolean(panels.dashboard);

  policy.resumen.view = Boolean(panels.resumen);
  policy.resumen.edit = Boolean(actions.events?.editAny || actions.events?.editOwn);
  policy.resumen.delete = Boolean(actions.events?.deleteAny);

  policy.registroNuevo.view = Boolean(panels.registroNuevo);
  policy.registroNuevo.create = Boolean(actions.events?.create);

  policy.informes.view = Boolean(panels.informes);
  policy.informes.export = Boolean(actions.reports?.export);
  policy.informes.administer = Boolean(actions.reports?.filterByUser);

  policy.tendencias.view = Boolean(panels.tendencias);

  policy.adjuntos.view = Boolean(panels.adjuntos) && Boolean(actions.attachments?.viewAny || actions.attachments?.viewOwn);
  policy.adjuntos.create = Boolean(actions.attachments?.uploadAny || actions.attachments?.uploadOwn);
  policy.adjuntos.edit = Boolean(actions.attachments?.editAny || actions.attachments?.editOwn);
  policy.adjuntos.delete = Boolean(actions.attachments?.deleteAny || actions.attachments?.deleteOwn);

  policy.tareas.view = Boolean(panels.tareas) && Boolean(
    actions.tasks?.viewAny || actions.tasks?.viewOwnCreated || actions.tasks?.viewAssigned
  );
  policy.tareas.create = Boolean(actions.tasks?.create);
  policy.tareas.edit = Boolean(actions.tasks?.editAny || actions.tasks?.editOwnCreated || actions.tasks?.editAssigned);
  policy.tareas.delete = Boolean(actions.tasks?.deleteAny || actions.tasks?.deleteOwnCreated);
  policy.tareas.export = Boolean(actions.tasks?.export);
  policy.tareas.administer = Boolean(actions.tasks?.assignAny || actions.tasks?.editAny);

  policy.usuarios.view = Boolean(actions.users?.viewList);
  policy.usuarios.create = Boolean(actions.users?.manage);
  policy.usuarios.edit = Boolean(actions.users?.manage);
  policy.usuarios.delete = Boolean(actions.users?.manage);
  policy.usuarios.administer = Boolean(actions.users?.manage);

  policy.plantillas.view = Boolean(actions.templates?.view);
  policy.plantillas.create = Boolean(actions.templates?.manage);
  policy.plantillas.edit = Boolean(actions.templates?.manage);
  policy.plantillas.delete = Boolean(actions.templates?.manage);
  policy.plantillas.administer = Boolean(actions.templates?.manage);

  policy.auditoria.view = Boolean(panels.auditoria);

  policy.configuracion.view = Boolean(panels.configuracion);
  policy.configuracion.administer = Boolean(panels.configuracion);

  return policy;
}

const ROLE_POLICY_LIMITS = Object.freeze(
  ROLE_KEYS.reduce((accumulator, roleKey) => {
    accumulator[roleKey] = deriveRolePolicyFromCapabilities(BASE_ROLE_CAPABILITIES[roleKey]);
    return accumulator;
  }, {})
);

const DEFAULT_ROLE_POLICIES = cloneRolePoliciesMap(ROLE_POLICY_LIMITS);

function normalizeRolePolicyInput(policy) {
  const normalized = createPolicyTemplate(false);
  for (const moduleKey of POLICY_MODULE_KEYS) {
    const moduleValue = policy?.[moduleKey] && typeof policy[moduleKey] === "object"
      ? policy[moduleKey]
      : null;
    for (const actionKey of POLICY_ACTION_KEYS) {
      if (moduleValue && Object.hasOwn(moduleValue, actionKey)) {
        normalized[moduleKey][actionKey] = Boolean(moduleValue[actionKey]);
      }
    }
  }
  return normalized;
}

function validateRolePolicy(role, policy, options = {}) {
  const normalizedRole = normalizeRole(role);
  const normalizedPolicy = normalizeRolePolicyInput(policy);
  const allowEscalation = Boolean(options.allowEscalation);

  if (!allowEscalation) {
    const limitPolicy = ROLE_POLICY_LIMITS[normalizedRole];
    for (const moduleKey of POLICY_MODULE_KEYS) {
      for (const actionKey of POLICY_ACTION_KEYS) {
        const requested = normalizedPolicy[moduleKey][actionKey];
        const allowed = Boolean(limitPolicy[moduleKey][actionKey]);
        if (requested && !allowed) {
          return {
            valid: false,
            reason: "permission_out_of_bounds",
            detail: { module: moduleKey, action: actionKey }
          };
        }
      }
    }
  }

  for (const [moduleKey, actionKey] of AUTHENTICATED_REQUIRED_POLICY_ACTIONS) {
    if (!normalizedPolicy[moduleKey][actionKey]) {
      return {
        valid: false,
        reason: "authenticated_policy_required",
        detail: { module: moduleKey, action: actionKey }
      };
    }
  }

  if (normalizedRole === "admin") {
    for (const [moduleKey, actionKey] of ADMIN_REQUIRED_POLICY_ACTIONS) {
      if (!normalizedPolicy[moduleKey][actionKey]) {
        return {
          valid: false,
          reason: "admin_policy_required",
          detail: { module: moduleKey, action: actionKey }
        };
      }
    }
  }

  return {
    valid: true,
    policy: normalizedPolicy
  };
}

function applyRolePolicyToCapabilities(role, policy) {
  const normalizedRole = normalizeRole(role);
  const base = cloneCapabilities(BASE_ROLE_CAPABILITIES[normalizedRole]);
  const normalizedPolicy = normalizeRolePolicyInput(policy);

  base.panels.dashboard = base.panels.dashboard && normalizedPolicy.dashboard.view;
  base.panels.resumen = base.panels.resumen && normalizedPolicy.resumen.view;
  base.panels.registroNuevo = base.panels.registroNuevo && normalizedPolicy.registroNuevo.view;
  base.panels.informes = base.panels.informes && normalizedPolicy.informes.view;
  base.panels.tendencias = base.panels.tendencias && normalizedPolicy.tendencias.view;
  base.panels.adjuntos = base.panels.adjuntos && normalizedPolicy.adjuntos.view;
  base.panels.tareas = base.panels.tareas && normalizedPolicy.tareas.view;
  base.panels.usuarios = base.panels.usuarios && normalizedPolicy.usuarios.view;
  base.panels.plantillas = base.panels.plantillas && normalizedPolicy.plantillas.view;
  base.panels.auditoria = base.panels.auditoria && normalizedPolicy.auditoria.view;
  base.panels.configuracion = base.panels.configuracion && normalizedPolicy.configuracion.view;

  base.actions.users.viewList = base.actions.users.viewList && normalizedPolicy.usuarios.view;
  base.actions.users.manage = base.actions.users.manage && normalizedPolicy.usuarios.administer;
  base.actions.users.changeOwnPassword =
    base.actions.users.changeOwnPassword && normalizedPolicy.usuarios.administer;

  base.actions.templates.view = base.actions.templates.view && normalizedPolicy.plantillas.view;
  base.actions.templates.manage = base.actions.templates.manage && normalizedPolicy.plantillas.administer;

  base.actions.reports.filterByUser =
    base.actions.reports.filterByUser && normalizedPolicy.informes.administer;
  base.actions.reports.export = base.actions.reports.export && normalizedPolicy.informes.export;

  base.actions.events.create = base.actions.events.create && normalizedPolicy.registroNuevo.create;
  base.actions.events.editAny = base.actions.events.editAny && normalizedPolicy.resumen.edit;
  base.actions.events.editOwn = base.actions.events.editOwn && normalizedPolicy.resumen.edit;
  base.actions.events.deleteAny = base.actions.events.deleteAny && normalizedPolicy.resumen.delete;

  base.actions.attachments.uploadAny =
    base.actions.attachments.uploadAny && normalizedPolicy.adjuntos.create;
  base.actions.attachments.uploadOwn =
    base.actions.attachments.uploadOwn && normalizedPolicy.adjuntos.create;
  base.actions.attachments.viewAny = base.actions.attachments.viewAny && normalizedPolicy.adjuntos.view;
  base.actions.attachments.viewOwn = base.actions.attachments.viewOwn && normalizedPolicy.adjuntos.view;
  base.actions.attachments.editAny = base.actions.attachments.editAny && normalizedPolicy.adjuntos.edit;
  base.actions.attachments.editOwn = base.actions.attachments.editOwn && normalizedPolicy.adjuntos.edit;
  base.actions.attachments.deleteAny =
    base.actions.attachments.deleteAny && normalizedPolicy.adjuntos.delete;
  base.actions.attachments.deleteOwn =
    base.actions.attachments.deleteOwn && normalizedPolicy.adjuntos.delete;

  base.actions.tasks.viewAny = base.actions.tasks.viewAny && normalizedPolicy.tareas.view;
  base.actions.tasks.viewOwnCreated =
    base.actions.tasks.viewOwnCreated && normalizedPolicy.tareas.view;
  base.actions.tasks.viewAssigned = base.actions.tasks.viewAssigned && normalizedPolicy.tareas.view;
  base.actions.tasks.create = base.actions.tasks.create && normalizedPolicy.tareas.create;
  base.actions.tasks.assignAny = base.actions.tasks.assignAny && normalizedPolicy.tareas.administer;
  base.actions.tasks.editAny = base.actions.tasks.editAny && normalizedPolicy.tareas.edit;
  base.actions.tasks.editOwnCreated =
    base.actions.tasks.editOwnCreated && normalizedPolicy.tareas.edit;
  base.actions.tasks.editAssigned = base.actions.tasks.editAssigned && normalizedPolicy.tareas.edit;
  base.actions.tasks.deleteAny = base.actions.tasks.deleteAny && normalizedPolicy.tareas.delete;
  base.actions.tasks.deleteOwnCreated =
    base.actions.tasks.deleteOwnCreated && normalizedPolicy.tareas.delete;
  base.actions.tasks.export = base.actions.tasks.export && normalizedPolicy.tareas.export;

  return base;
}

let activeRolePolicies = cloneRolePoliciesMap(DEFAULT_ROLE_POLICIES);
let activeRoleCapabilities = ROLE_KEYS.reduce((accumulator, roleKey) => {
  accumulator[roleKey] = applyRolePolicyToCapabilities(roleKey, activeRolePolicies[roleKey]);
  return accumulator;
}, {});

function rebuildCapabilitiesFromActivePolicies() {
  activeRoleCapabilities = ROLE_KEYS.reduce((accumulator, roleKey) => {
    accumulator[roleKey] = applyRolePolicyToCapabilities(roleKey, activeRolePolicies[roleKey]);
    return accumulator;
  }, {});
}

function getRolePermissionPolicies() {
  return cloneRolePoliciesMap(activeRolePolicies);
}

function getRolePermissionLimits() {
  return cloneRolePoliciesMap(ROLE_POLICY_LIMITS);
}

function getRolePermissionMetadata() {
  return {
    roles: [...ROLE_KEYS],
    actions: [...POLICY_ACTION_KEYS],
    modules: POLICY_MODULE_DEFINITIONS.map((moduleItem) => ({ ...moduleItem }))
  };
}

function setRolePermissionPolicy(role, policy, options = {}) {
  const normalizedRole = normalizeRole(role);
  const validation = validateRolePolicy(normalizedRole, policy, options);
  if (!validation.valid) {
    return {
      ok: false,
      error: validation.reason,
      detail: validation.detail || null
    };
  }

  activeRolePolicies = {
    ...activeRolePolicies,
    [normalizedRole]: cloneRolePolicy(validation.policy)
  };
  rebuildCapabilitiesFromActivePolicies();

  return {
    ok: true,
    role: normalizedRole,
    policy: cloneRolePolicy(activeRolePolicies[normalizedRole])
  };
}

function replaceRolePermissionPolicies(policies, options = {}) {
  const allowEscalation = Boolean(options.allowEscalation);
  const nextPolicies = cloneRolePoliciesMap(DEFAULT_ROLE_POLICIES);

  for (const roleKey of ROLE_KEYS) {
    const candidatePolicy = policies?.[roleKey];
    if (!candidatePolicy || typeof candidatePolicy !== "object") {
      continue;
    }

    const validation = validateRolePolicy(roleKey, candidatePolicy, { allowEscalation });
    if (!validation.valid) {
      continue;
    }

    nextPolicies[roleKey] = cloneRolePolicy(validation.policy);
  }

  activeRolePolicies = nextPolicies;
  rebuildCapabilitiesFromActivePolicies();
  return getRolePermissionPolicies();
}

function hydrateRolePermissionPoliciesFromRows(rows, options = {}) {
  const draft = {};
  const allowEscalation = Boolean(options.allowEscalation);

  for (const row of Array.isArray(rows) ? rows : []) {
    const roleKey = normalizeRole(row?.role);
    if (!ROLE_KEYS.includes(roleKey)) {
      continue;
    }

    const policyPayload = row?.permissions;
    if (!policyPayload || typeof policyPayload !== "object" || Array.isArray(policyPayload)) {
      continue;
    }

    const validation = validateRolePolicy(roleKey, policyPayload, { allowEscalation });
    if (!validation.valid) {
      continue;
    }

    draft[roleKey] = validation.policy;
  }

  return replaceRolePermissionPolicies(draft, { allowEscalation });
}

function serializeRolePermissionPoliciesForStorage() {
  const serialized = {};
  for (const roleKey of ROLE_KEYS) {
    serialized[roleKey] = cloneRolePolicy(activeRolePolicies[roleKey]);
  }
  return serialized;
}

function getSessionCapabilities(role) {
  const normalizedRole = normalizeRole(role);
  const runtimeCapabilities = activeRoleCapabilities[normalizedRole] ||
    applyRolePolicyToCapabilities(normalizedRole, activeRolePolicies[normalizedRole]);
  return cloneCapabilities(runtimeCapabilities);
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

function canUserAccessPanel(user, panelKey) {
  const normalizedPanel = String(panelKey || "").trim();
  if (!PANEL_KEYS.includes(normalizedPanel)) {
    return false;
  }
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.panels[normalizedPanel]);
}

function canUserManageTemplates(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.templates.manage);
}

function canUserFilterByUser(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.reports.filterByUser);
}

function canUserExportReports(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.reports.export);
}


function canUserViewUsers(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.users.viewList);
}

function canUserManageUsers(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.users.manage);
}

function canUserCreateEvent(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.events.create);
}

function canUserEditAnyEvent(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return Boolean(capabilities.actions.events.editAny);
}

function canUserEditEvent(user, ownerId) {
  if (canUserEditAnyEvent(user)) {
    return true;
  }

  const capabilities = getSessionCapabilities(user?.role);
  if (!capabilities.actions.events.editOwn) {
    return false;
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

function getTaskViewScope(user) {
  const capabilities = getSessionCapabilities(user?.role);
  return {
    canViewAny: Boolean(capabilities.actions.tasks.viewAny),
    canViewOwnCreated: Boolean(capabilities.actions.tasks.viewOwnCreated),
    canViewAssigned: Boolean(capabilities.actions.tasks.viewAssigned)
  };
}

function canUserViewTasks(user) {
  const scope = getTaskViewScope(user);
  return scope.canViewAny || scope.canViewOwnCreated || scope.canViewAssigned;
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

function canUserViewFile(user, file) {
  const capabilities = getSessionCapabilities(user?.role);
  if (capabilities.actions.attachments.viewAny) {
    return true;
  }

  if (!capabilities.actions.attachments.viewOwn) {
    return false;
  }

  const actorId = resolveActorId(user);
  const ownerId = resolveFileOwnerId(file);
  if (!Number.isInteger(actorId) || actorId <= 0 || !Number.isInteger(ownerId) || ownerId <= 0) {
    return false;
  }

  return actorId === ownerId;
}

function canUserEditFile(user, file) {
  const capabilities = getSessionCapabilities(user?.role);
  if (capabilities.actions.attachments.editAny) {
    return true;
  }

  if (!capabilities.actions.attachments.editOwn) {
    return false;
  }

  const actorId = resolveActorId(user);
  const ownerId = resolveFileOwnerId(file);
  if (!Number.isInteger(actorId) || actorId <= 0 || !Number.isInteger(ownerId) || ownerId <= 0) {
    return false;
  }

  return actorId === ownerId;
}

function canUserDeleteFile(user, file) {
  const capabilities = getSessionCapabilities(user?.role);
  if (capabilities.actions.attachments.deleteAny) {
    return true;
  }

  if (!capabilities.actions.attachments.deleteOwn) {
    return false;
  }

  const actorId = resolveActorId(user);
  const ownerId = resolveFileOwnerId(file);
  if (!Number.isInteger(actorId) || actorId <= 0 || !Number.isInteger(ownerId) || ownerId <= 0) {
    return false;
  }

  return actorId === ownerId;
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
  ROLE_KEYS,
  PANEL_KEYS,
  POLICY_ACTION_KEYS,
  POLICY_MODULE_KEYS,
  POLICY_MODULE_DEFINITIONS,
  normalizeRole,
  normalizeRolePolicyInput,
  validateRolePolicy,
  getRolePermissionMetadata,
  getRolePermissionPolicies,
  getRolePermissionLimits,
  setRolePermissionPolicy,
  replaceRolePermissionPolicies,
  hydrateRolePermissionPoliciesFromRows,
  serializeRolePermissionPoliciesForStorage,
  getSessionCapabilities,
  resolveActorId,
  canUserAccessPanel,
  canUserManageTemplates,
  canUserFilterByUser,
  canUserExportReports,
  canUserViewUsers,
  canUserManageUsers,
  canUserCreateEvent,
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
  getTaskViewScope,
  canUserViewTasks,
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
