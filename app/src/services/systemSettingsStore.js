const { pool } = require("../db");
const {
  SYSTEM_SETTINGS_STORAGE_KEY,
  getSystemSettings,
  getSystemSettingsDefaults,
  replaceSystemSettings,
  applySystemSettings,
  mergeSystemSettingsPatch,
  parseSystemSettingsPatch
} = require("./systemSettings");

let hydrated = false;

async function ensureSystemSettingsLoaded(options = {}) {
  const force = Boolean(options.force);
  if (hydrated && !force) {
    return getSystemSettings();
  }

  const result = await pool.query(
    `
      SELECT value_json AS "valueJson"
      FROM system_settings
      WHERE setting_key = $1
      LIMIT 1
    `,
    [SYSTEM_SETTINGS_STORAGE_KEY]
  );

  if (result.rowCount === 0) {
    const defaults = getSystemSettingsDefaults();
    replaceSystemSettings(defaults);

    await pool.query(
      `
        INSERT INTO system_settings (setting_key, value_json, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (setting_key) DO NOTHING
      `,
      [SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(defaults)]
    );

    hydrated = true;
    return getSystemSettings();
  }

  replaceSystemSettings(result.rows[0].valueJson);
  hydrated = true;
  return getSystemSettings();
}

async function updateSystemSettings(patch, updatedBy) {
  await ensureSystemSettingsLoaded();

  const current = getSystemSettings();
  const parsedPatch = parseSystemSettingsPatch(patch || {});
  const next = mergeSystemSettingsPatch(current, parsedPatch);
  const applied = applySystemSettings(next);

  await pool.query(
    `
      INSERT INTO system_settings (setting_key, value_json, updated_by, updated_at)
      VALUES ($1, $2::jsonb, $3, NOW())
      ON CONFLICT (setting_key)
      DO UPDATE
      SET value_json = EXCLUDED.value_json,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
    `,
    [SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(applied), updatedBy || null]
  );

  hydrated = true;
  return {
    before: current,
    after: applied
  };
}

module.exports = {
  ensureSystemSettingsLoaded,
  updateSystemSettings
};