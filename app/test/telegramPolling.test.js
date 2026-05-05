const test = require("node:test");
const assert = require("node:assert/strict");
const { config } = require("../src/config");
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
