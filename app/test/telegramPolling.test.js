const test = require("node:test");
const assert = require("node:assert/strict");
const { config } = require("../src/config");
const { pool } = require("../src/db");
const { notifyTaskCreated } = require("../src/services/telegramNotifier");
const {
  isTelegramInteractiveEnabled,
  isTelegramWebhookModeEnabled,
  isTelegramPollingModeEnabled,
  processTelegramUpdate
} = require("../src/services/telegramBot");
const {
  buildGetUpdatesPayload,
  isTelegramPollingConfigured
} = require("../src/services/telegramPolling");

function withConfig(overrides, fn) {
  const previous = {};
  Object.keys(overrides).forEach((key) => {
    previous[key] = config[key];
    config[key] = overrides[key];
  });

  try {
    fn();
  } finally {
    Object.keys(previous).forEach((key) => {
      config[key] = previous[key];
    });
  }
}

async function withConfigAsync(overrides, fn) {
  const previous = {};
  Object.keys(overrides).forEach((key) => {
    previous[key] = config[key];
    config[key] = overrides[key];
  });

  try {
    return await fn();
  } finally {
    Object.keys(previous).forEach((key) => {
      config[key] = previous[key];
    });
  }
}

test("Telegram polling interactivo no requiere secreto de webhook", () => {
  withConfig(
    {
      telegramEnabled: true,
      telegramBotToken: "test-token",
      telegramBotInteractiveEnabled: true,
      telegramBotMode: "polling",
      telegramBotWebhookSecret: ""
    },
    () => {
      assert.equal(isTelegramInteractiveEnabled(), true);
      assert.equal(isTelegramPollingModeEnabled(), true);
      assert.equal(isTelegramWebhookModeEnabled(), false);
      assert.equal(isTelegramPollingConfigured(), true);
    }
  );
});

test("Telegram webhook sigue separado del modo polling", () => {
  withConfig(
    {
      telegramEnabled: true,
      telegramBotToken: "test-token",
      telegramBotInteractiveEnabled: true,
      telegramBotMode: "webhook",
      telegramBotWebhookSecret: "1234567890123456"
    },
    () => {
      assert.equal(isTelegramInteractiveEnabled(), true);
      assert.equal(isTelegramWebhookModeEnabled(), true);
      assert.equal(isTelegramPollingModeEnabled(), false);
      assert.equal(isTelegramPollingConfigured(), false);
    }
  );
});

test("Payload getUpdates conserva offset, timeout y tipos permitidos", () => {
  withConfig(
    {
      telegramPollingTimeout: 30,
      telegramPollingAllowedUpdates: ["message", "callback_query"]
    },
    () => {
      assert.deepEqual(buildGetUpdatesPayload(42), {
        offset: 42,
        timeout: 30,
        allowed_updates: ["message", "callback_query"]
      });
    }
  );
});

test("Callback Volver al menu responde sin requerir consulta sensible", async () => {
  const previousFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(options.body || "{}"))
    });
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: true })
    };
  };

  try {
    await withConfigAsync(
      {
        telegramEnabled: true,
        telegramBotToken: "test-token",
        telegramBotInteractiveEnabled: true,
        telegramBotMode: "polling",
        telegramChatId: "",
        telegramChatIds: []
      },
      async () => {
        const result = await processTelegramUpdate(
          {
            update_id: 100,
            callback_query: {
              id: "callback-home-1",
              data: "menu:home",
              from: {
                id: 998877,
                first_name: "Operador"
              },
              message: {
                message_id: 77,
                chat: {
                  id: 1401553303,
                  type: "private"
                }
              }
            }
          },
          {
            source: "polling",
            ip: "telegram-polling",
            userAgent: "telegram-polling"
          }
        );

        assert.equal(result.ok, true);
        assert.ok(calls.some((call) => call.url.endsWith("/answerCallbackQuery")));
        const editCall = calls.find((call) => call.url.endsWith("/editMessageText"));
        assert.ok(editCall, "debe intentar editar el mensaje actual");
        assert.equal(editCall.body.text, "Panel de Control");
        assert.equal(editCall.body.message_id, 77);
        assert.equal(editCall.body.reply_markup.inline_keyboard.length, 3);
        assert.equal(
          calls.some((call) => String(call.body.text || "").includes("Ocurrio un error")),
          false
        );
      }
    );
  } finally {
    global.fetch = previousFetch;
  }
});

test("Telegram: Admin/Gerencial ven consulta por grupos y resumen respeta ABAC", async () => {
  const previousFetch = global.fetch;
  const originalPoolQuery = pool.query.bind(pool);
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(options.body || "{}"))
    });
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: true })
    };
  };

  pool.query = async (sqlText, params = []) => {
    const sql = String(sqlText).toLowerCase().replace(/\s+/g, " ").trim();
    if (sql.includes("from user_telegram_links l")) {
      return {
        rowCount: 1,
        rows: [
          {
            id: 77,
            name: "Gerencial Uno",
            email: "gerencial@bitacora.local",
            role: "gerencial",
            telegramUserId: Number(params[0]),
            telegramUsername: "gerencialuno",
            telegramPrivateChatId: "1401553303",
            telegramGroupChatId: null,
            lastUsedAt: null,
            sessionExpiresAt: null
          }
        ]
      };
    }
    if (sql.startsWith("select id, name, slug, description, is_system, is_active, created_at, updated_at from groups")) {
      return {
        rowCount: 3,
        rows: [
          {
            id: 1,
            name: "Soporte",
            slug: "soporte",
            description: "Mesa de ayuda",
            is_system: true,
            is_active: true,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z"
          },
          {
            id: 2,
            name: "Infraestructura",
            slug: "infraestructura",
            description: "Infra",
            is_system: true,
            is_active: true,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z"
          },
          {
            id: 5,
            name: "Gerencia",
            slug: "gerencia",
            description: "Direccion",
            is_system: true,
            is_active: true,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z"
          }
        ]
      };
    }
    if (sql.includes("from user_groups ug join groups g on g.id = ug.group_id")) {
      return {
        rowCount: 1,
        rows: [
          {
            id: 5,
            name: "Gerencia",
            slug: "gerencia",
            description: "Direccion",
            is_system: true,
            is_active: true,
            role_in_group: "miembro",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z"
          }
        ]
      };
    }
    if (sql.includes("from group_access_policies p")) {
      return {
        rowCount: 2,
        rows: [
          {
            source_group_id: 5,
            target_group_id: 1,
            resource_type: "all",
            can_view: true,
            can_create: false,
            can_edit: false,
            can_delete: false,
            can_export: true,
            can_administer: false
          },
          {
            source_group_id: 5,
            target_group_id: 5,
            resource_type: "all",
            can_view: true,
            can_create: false,
            can_edit: false,
            can_delete: false,
            can_export: true,
            can_administer: false
          }
        ]
      };
    }
    if (sql.startsWith("with event_counts as")) {
      assert.deepEqual(params, [[1, 5]]);
      return {
        rowCount: 2,
        rows: [
          {
            id: 1,
            name: "Soporte",
            slug: "soporte",
            description: "Mesa de ayuda",
            totalEvents: 12,
            totalTasks: 8,
            overdueTasks: 1,
            highPriorityTasks: 2,
            inProgressTasks: 3,
            pendingTasks: 4,
            lastActivityAt: "2026-04-23T14:35:00.000Z"
          },
          {
            id: 5,
            name: "Gerencia",
            slug: "gerencia",
            description: "Direccion",
            totalEvents: 1,
            totalTasks: 0,
            overdueTasks: 0,
            highPriorityTasks: 0,
            inProgressTasks: 0,
            pendingTasks: 0,
            lastActivityAt: null
          }
        ]
      };
    }
    if (sql.startsWith("update user_telegram_links")) {
      return { rowCount: 1, rows: [] };
    }
    if (sql.startsWith("insert into audit_logs")) {
      return { rowCount: 1, rows: [] };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    await withConfigAsync(
      {
        telegramEnabled: true,
        telegramBotToken: "test-token",
        telegramBotInteractiveEnabled: true,
        telegramBotMode: "polling",
        telegramChatId: "",
        telegramChatIds: []
      },
      async () => {
        const menuResult = await processTelegramUpdate({
          update_id: 101,
          message: {
            message_id: 88,
            text: "/menu",
            from: { id: 909091, first_name: "Gerencial" },
            chat: { id: 1401553303, type: "private" }
          }
        });
        assert.equal(menuResult.ok, true);
        const menuCall = calls.find((call) => call.url.endsWith("/sendMessage"));
        assert.ok(
          menuCall.body.reply_markup.inline_keyboard.flat().some((button) => button.callback_data === "menu:groups")
        );

        calls.length = 0;
        const groupResult = await processTelegramUpdate({
          update_id: 102,
          callback_query: {
            id: "callback-group-1",
            data: "menu:grp:1",
            from: { id: 909090, first_name: "Gerencial" },
            message: {
              message_id: 89,
              chat: { id: 1401553303, type: "private" }
            }
          }
        });
        assert.equal(groupResult.ok, true);
        const summaryCall = calls.find((call) => call.url.endsWith("/sendMessage"));
        assert.match(summaryCall.body.text, /RESUMEN DEL GRUPO: Soporte/);
        assert.match(summaryCall.body.text, /Tareas: 8/);
      }
    );
  } finally {
    global.fetch = previousFetch;
    pool.query = originalPoolQuery;
  }
});

test("Telegram saliente: detalle solo va a chats autorizados por grupo y global recibe minimo", async () => {
  const previousFetch = global.fetch;
  const originalPoolQuery = pool.query.bind(pool);
  const calls = [];

  global.fetch = async (url, options = {}) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(options.body || "{}"))
    });
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: { message_id: calls.length } })
    };
  };
  pool.query = async (sqlText, params = []) => {
    const sql = String(sqlText).toLowerCase();
    if (sql.includes("from group_access_policies")) {
      assert.deepEqual(params, [10]);
      return {
        rowCount: 2,
        rows: [
          { id: 10, name: "Soporte", slug: "soporte" },
          { id: 30, name: "Seguridad Tecnologica", slug: "seguridad-tecnologica" }
        ]
      };
    }
    if (sql.startsWith("insert into audit_logs")) {
      return { rowCount: 1, rows: [] };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    await withConfigAsync(
      {
        telegramEnabled: true,
        telegramBotToken: "test-token",
        telegramChatId: "global-chat",
        telegramChatIds: [],
        telegramGroupChatIds: ["soporte:soporte-chat", "seguridad-tecnologica:seguridad-chat"]
      },
      async () => {
        const result = await notifyTaskCreated({
          task: {
            id: 501,
            title: "Dato sensible de Soporte",
            priority: "alta",
            status: "sin_realizar",
            dueDate: "2026-06-01",
            group: { id: 10, name: "Soporte", slug: "soporte" },
            createdBy: { name: "Operador Soporte" },
            assignedTo: { name: "Responsable Soporte" }
          },
          actorName: "Operador Soporte",
          actorId: 7
        });

        assert.equal(result.ok, true);
        const byChat = new Map(calls.map((call) => [call.body.chat_id, call.body.text]));
        assert.match(byChat.get("soporte-chat"), /Dato sensible de Soporte/);
        assert.match(byChat.get("seguridad-chat"), /Dato sensible de Soporte/);
        assert.match(byChat.get("global-chat"), /Detalle disponible solo/);
        assert.doesNotMatch(byChat.get("global-chat"), /Dato sensible de Soporte/);
      }
    );
  } finally {
    global.fetch = previousFetch;
    pool.query = originalPoolQuery;
  }
});
