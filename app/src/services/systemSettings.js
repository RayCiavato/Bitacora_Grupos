const { z } = require("zod");

const SYSTEM_SETTINGS_STORAGE_KEY = "global";

const systemSettingsSchema = z
  .object({
    pagination: z.object({
      reportPageSizeDefault: z.number().int().min(5).max(100),
      reportPageSizeMax: z.number().int().min(10).max(500),
      tasksPageSizeDefault: z.number().int().min(5).max(100),
      tasksPageSizeMax: z.number().int().min(10).max(100)
    }),
    dashboard: z.object({
      eventsDays: z.number().int().min(7).max(90),
      tasksSummaryDays: z.number().int().min(1).max(30),
      tasksRecentLimit: z.number().int().min(1).max(12)
    }),
    features: z.object({
      templatesEnabled: z.boolean(),
      taskExportsEnabled: z.boolean(),
      reportExportsEnabled: z.boolean()
    })
  })
  .superRefine((value, ctx) => {
    if (value.pagination.reportPageSizeDefault > value.pagination.reportPageSizeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pagination", "reportPageSizeDefault"],
        message: "report_default_exceeds_max"
      });
    }

    if (value.pagination.tasksPageSizeDefault > value.pagination.tasksPageSizeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pagination", "tasksPageSizeDefault"],
        message: "tasks_default_exceeds_max"
      });
    }
  });

const systemSettingsPatchSchema = z
  .object({
    pagination: z
      .object({
        reportPageSizeDefault: z.coerce.number().int().min(5).max(100).optional(),
        reportPageSizeMax: z.coerce.number().int().min(10).max(500).optional(),
        tasksPageSizeDefault: z.coerce.number().int().min(5).max(100).optional(),
        tasksPageSizeMax: z.coerce.number().int().min(10).max(100).optional()
      })
      .strict()
      .optional(),
    dashboard: z
      .object({
        eventsDays: z.coerce.number().int().min(7).max(90).optional(),
        tasksSummaryDays: z.coerce.number().int().min(1).max(30).optional(),
        tasksRecentLimit: z.coerce.number().int().min(1).max(12).optional()
      })
      .strict()
      .optional(),
    features: z
      .object({
        templatesEnabled: z.boolean().optional(),
        taskExportsEnabled: z.boolean().optional(),
        reportExportsEnabled: z.boolean().optional()
      })
      .strict()
      .optional()
  })
  .strict();

const SYSTEM_SETTINGS_DEFAULTS = Object.freeze({
  pagination: Object.freeze({
    reportPageSizeDefault: 20,
    reportPageSizeMax: 200,
    tasksPageSizeDefault: 20,
    tasksPageSizeMax: 100
  }),
  dashboard: Object.freeze({
    eventsDays: 30,
    tasksSummaryDays: 7,
    tasksRecentLimit: 5
  }),
  features: Object.freeze({
    templatesEnabled: true,
    taskExportsEnabled: true,
    reportExportsEnabled: true
  })
});

function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(settings));
}

function normalizeSettingsRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return cloneSettings(SYSTEM_SETTINGS_DEFAULTS);
  }

  const parsed = systemSettingsSchema.safeParse(value);
  if (!parsed.success) {
    return cloneSettings(SYSTEM_SETTINGS_DEFAULTS);
  }
  return cloneSettings(parsed.data);
}

let activeSystemSettings = cloneSettings(SYSTEM_SETTINGS_DEFAULTS);

function getSystemSettings() {
  return cloneSettings(activeSystemSettings);
}

function getSystemSettingsDefaults() {
  return cloneSettings(SYSTEM_SETTINGS_DEFAULTS);
}

function applySystemSettings(nextSettings) {
  const parsed = systemSettingsSchema.parse(nextSettings);
  activeSystemSettings = cloneSettings(parsed);
  return getSystemSettings();
}

function replaceSystemSettings(nextSettings) {
  activeSystemSettings = normalizeSettingsRecord(nextSettings);
  return getSystemSettings();
}

function mergeSystemSettingsPatch(currentSettings, patch) {
  const merged = {
    pagination: {
      ...currentSettings.pagination,
      ...(patch.pagination || {})
    },
    dashboard: {
      ...currentSettings.dashboard,
      ...(patch.dashboard || {})
    },
    features: {
      ...currentSettings.features,
      ...(patch.features || {})
    }
  };

  const parsed = systemSettingsSchema.parse(merged);
  return cloneSettings(parsed);
}

function parseSystemSettingsPatch(input) {
  return systemSettingsPatchSchema.parse(input || {});
}

module.exports = {
  SYSTEM_SETTINGS_STORAGE_KEY,
  systemSettingsSchema,
  systemSettingsPatchSchema,
  getSystemSettings,
  getSystemSettingsDefaults,
  normalizeSettingsRecord,
  applySystemSettings,
  replaceSystemSettings,
  mergeSystemSettingsPatch,
  parseSystemSettingsPatch
};