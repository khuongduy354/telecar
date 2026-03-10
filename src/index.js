import "dotenv/config";
import { createBot } from "./bot/bot.js";
import { createWebhookServer } from "./server/webhookServer.js";

const PORT = process.env.PORT || 3000;

async function main() {
  // --- Validate env ---
  const required = ["TELEGRAM_BOT_TOKEN", "COMPOSIO_API_KEY", "WEBHOOK_DOMAIN"];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing required env var: ${key}`);
      process.exit(1);
    }
  }

  // --- Telegram bot ---
  const bot = createBot();

  // --- Webhook server ---
  const app = createWebhookServer(bot, (payload) => {
    // payload shape (V3):
    // { id, type, metadata: { trigger_slug, trigger_id, connected_account_id, user_id }, data, timestamp }
    const userId = payload.metadata?.user_id;
    const triggerSlug = payload.metadata?.trigger_slug;
    const data = payload.data;

    console.log(
      `[trigger] slug=${triggerSlug} user=${userId}`,
      JSON.stringify(data).slice(0, 200),
    );

    // Forward to Telegram user if userId is a numeric Telegram ID
    if (userId && /^\d+$/.test(userId)) {
      const message = formatTriggerMessage(triggerSlug, data);
      bot.telegram.sendMessage(userId, message).catch((err) => {
        console.error(`[trigger] failed to send to ${userId}:`, err.message);
      });
    }
  });

  app.listen(PORT, async () => {
    console.log(`[server] webhook server listening on port ${PORT}`);

    // Set Telegram bot webhook
    const webhookDomain = process.env.WEBHOOK_DOMAIN.replace(/\/$/, "");
    const botPath = `/bot${bot.secretPathComponent()}`;
    await bot.telegram.setWebhook(`${webhookDomain}${botPath}`);
    console.log(`[bot] Telegram bot webhook set at ${webhookDomain}${botPath}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    await bot.telegram.deleteWebhook();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/**
 * Format a trigger event into a human-readable message.
 */
function formatTriggerMessage(triggerSlug, data) {
  if (triggerSlug === "GMAIL_NEW_GMAIL_MESSAGE" && data) {
    const from = data.messageFrom || data.from || "unknown";
    const subject = data.messageSubject || data.subject || "(no subject)";
    const snippet = data.messageText || data.snippet || "";
    return (
      `New Email Received\n\n` +
      `From: ${from}\n` +
      `Subject: ${subject}\n` +
      (snippet ? `\n${snippet.slice(0, 300)}` : "")
    );
  }

  return `Trigger: ${triggerSlug}\n\n${JSON.stringify(data, null, 2).slice(0, 500)}`;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
