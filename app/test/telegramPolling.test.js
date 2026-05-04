const test = require("node:test");
const assert = require("node:assert/strict");
const { config } = require("../src/config");
const {
  isTelegramInteractiveEnabled,
  isTelegramWebhookModeEnabled,
  isTelegramPollingModeEnabled
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
