import express from "express";

/**
 * Start an Express server that receives Composio webhook events.
 * The webhook handler is passed in so main can wire it up to the bot.
 *
 * @param {Function} onTriggerMessage - callback(payload) when a trigger fires
 * @returns {express.Application}
 */
export function createWebhookServer(onTriggerMessage) {
  const app = express();
  app.use(express.json());

  app.post("/webhook", (req, res) => {
    const payload = req.body;
    const eventType = payload.type;

    console.log("[webhook] received event:", eventType);

    if (eventType === "composio.trigger.message") {
      try {
        onTriggerMessage(payload);
      } catch (err) {
        console.error("[webhook] handler error:", err);
      }
    }

    res.json({ status: "ok" });
  });

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // --- Self-test route ---
  // POST /test/trigger?user_id=<telegram_id>&subject=Hello&from=test@example.com
  // Fires a fake GMAIL_NEW_GMAIL_MESSAGE payload to the local webhook handler.
  app.post("/test/trigger", async (req, res) => {
    const PORT = process.env.PORT || 3000;

    const userId = req.query.user_id || req.body.user_id || "0";
    const subject = req.query.subject || req.body.subject || "Test Subject";
    const from = req.query.from || req.body.from || "test@example.com";
    const snippet =
      req.query.snippet || req.body.snippet || "This is a test email body.";

    const fakePayload = {
      id: `test_${Date.now()}`,
      type: "composio.trigger.message",
      metadata: {
        log_id: "test_log",
        trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
        trigger_id: "test_trigger",
        connected_account_id: "test_account",
        auth_config_id: "test_auth_config",
        user_id: String(userId),
      },
      data: {
        messageFrom: from,
        messageSubject: subject,
        messageText: snippet,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(`http://localhost:${PORT}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fakePayload),
      });
      const result = await response.json();
      console.log("[test/trigger] self-posted to /webhook, response:", result);
      res.json({
        status: "ok",
        sentPayload: fakePayload,
        webhookResponse: result,
      });
    } catch (err) {
      console.error("[test/trigger] error:", err.message);
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  return app;
}
