const cron = require("node-cron");
const nodemailer = require("nodemailer");
const { pool } = require("../db");
const { config } = require("../config");
const { logger } = require("../logger");

function getTodayDateIso() {
  const tzOffsetMs = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffsetMs).toISOString().slice(0, 10);
}

function hasSmtpConfig() {
  return Boolean(config.smtpHost && config.smtpFrom);
}

function buildMailer() {
  if (!hasSmtpConfig()) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser
      ? {
          user: config.smtpUser,
          pass: config.smtpPass
        }
      : undefined
  });
}

async function notifyWebhook(url, payload) {
  if (!url) {
    return;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    logger.warn({ err: error }, "No se pudo enviar webhook de recordatorio");
  }
}

async function sendEmail(mailer, recipients, subject, text) {
  if (!mailer || recipients.length === 0) {
    return;
  }

  await mailer.sendMail({
    from: config.smtpFrom,
    to: recipients.join(", "),
    subject,
    text
  });
}

async function runReminderCycle() {
  const today = getTodayDateIso();

  const usersResult = await pool.query(
    `
      SELECT id, name, email, role
      FROM users
      WHERE email IS NOT NULL
      ORDER BY id ASC
    `
  );

  if (usersResult.rowCount === 0) {
    return;
  }

  const eventsResult = await pool.query(
    `
      SELECT DISTINCT encargado_id
      FROM events
      WHERE fecha = $1
    `,
    [today]
  );

  const users = usersResult.rows;
  const completedSet = new Set(eventsResult.rows.map((row) => String(row.encargado_id)));
  const pendingUsers = users.filter((user) => !completedSet.has(String(user.id)));
  const supervisors = users.filter((user) => user.role === "admin" || user.role === "supervisor");

  const summaryText = [
    `Bitacora diaria ${today}`,
    `Usuarios totales: ${users.length}`,
    `Registros completados: ${users.length - pendingUsers.length}`,
    `Pendientes: ${pendingUsers.length}`,
    pendingUsers.length
      ? `Pendientes -> ${pendingUsers.map((user) => `${user.name} <${user.email}>`).join(", ")}`
      : "Todos los usuarios registraron actividades hoy."
  ].join("\n");

  try {
    const mailer = buildMailer();
    if (mailer) {
      await sendEmail(
        mailer,
        pendingUsers.map((user) => user.email),
        `Recordatorio bitacora - ${today}`,
        [
          "Aun no registras tu bitacora del dia.",
          "Ingresa al panel y carga tus actividades para cerrar jornada.",
          "",
          "Mensaje automatico de Bitacora."
        ].join("\n")
      );

      await sendEmail(
        mailer,
        supervisors.map((user) => user.email),
        `Resumen bitacora - ${today}`,
        summaryText
      );
    }
  } catch (error) {
    logger.warn({ err: error }, "Error enviando recordatorios por correo");
  }

  await Promise.all([
    notifyWebhook(config.slackWebhookUrl, {
      text: `*Resumen diario bitacora*\\n${summaryText}`
    }),
    notifyWebhook(config.teamsWebhookUrl, {
      text: summaryText
    })
  ]);
}

function startReminderScheduler() {
  if (!config.reminderEnabled) {
    logger.info("Recordatorios deshabilitados");
    return null;
  }

  if (!cron.validate(config.reminderCron)) {
    logger.error({ cron: config.reminderCron }, "REMINDER_CRON invalido");
    return null;
  }

  const task = cron.schedule(
    config.reminderCron,
    async () => {
      try {
        await runReminderCycle();
        logger.info("Ciclo de recordatorios completado");
      } catch (error) {
        logger.error({ err: error }, "Fallo el ciclo de recordatorios");
      }
    },
    {
      timezone: config.reminderTimezone
    }
  );

  logger.info(
    { cron: config.reminderCron, timezone: config.reminderTimezone },
    "Recordatorios diarios habilitados"
  );
  return task;
}

module.exports = { startReminderScheduler, runReminderCycle };
