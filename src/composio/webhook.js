const COMPOSIO_API_BASE = "https://backend.composio.dev/api/v3";

/**
 * Register a webhook subscription on Composio so trigger events are sent
 * to COMPOSIO_WEBHOOK_URL.
 *
 * This only needs to be called once (idempotent - Composio deduplicates by URL).
 * The returned `secret` should be stored for verifying webhook signatures.
 *
 * @returns {{ id, secret }} webhook subscription details
 */
export async function registerWebhookSubscription() {
  const webhookUrl = process.env.COMPOSIO_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("COMPOSIO_WEBHOOK_URL is not set in .env");
  }

  const res = await fetch(`${COMPOSIO_API_BASE}/webhook_subscriptions`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.COMPOSIO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhook_url: webhookUrl,
      enabled_events: ["composio.trigger.message"],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to register webhook: ${res.status} - ${body}`);
  }

  return res.json();
}
