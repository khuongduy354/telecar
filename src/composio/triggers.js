import { getComposio } from "./client.js";
import { getGmailConnections } from "./auth.js";

const GMAIL_NEW_MESSAGE_TRIGGER = "GMAIL_NEW_GMAIL_MESSAGE";

/**
 * Create (or re-enable) the Gmail new-message trigger for a user.
 * The trigger is scoped to the user's connected Gmail account.
 * Composio polls Gmail ~every minute and sends events to your webhook URL.
 *
 * @param {string} telegramUserId - Telegram user ID used as Composio user ID
 * @param {string} [connectedAccountId] - optional, if known
 * @returns {{ triggerId: string }}
 */
export async function enableGmailTrigger(telegramUserId, connectedAccountId) {
  const composio = getComposio();
  const userId = String(telegramUserId);

  const body = {};
  if (connectedAccountId) {
    body.connectedAccountId = connectedAccountId;
  }

  const result = await composio.triggers.create(
    userId,
    GMAIL_NEW_MESSAGE_TRIGGER,
    body,
  );

  return result;
}

/**
 * List active triggers for a user by their connected account IDs.
 * The SDK's listActive does not support userIds — must filter by connectedAccountIds.
 */
export async function listUserTriggers(telegramUserId) {
  const composio = getComposio();

  const accounts = await getGmailConnections(telegramUserId);
  if (!accounts || accounts.length === 0) return [];

  const connectedAccountIds = accounts.map((a) => a.id);

  const result = await composio.triggers.listActive({
    connectedAccountIds,
  });

  return result.items ?? result ?? [];
}

/**
 * Disable a specific trigger by ID.
 */
export async function disableTrigger(triggerId) {
  const composio = getComposio();
  return composio.triggers.disable(triggerId);
}

/**
 * Disable all active triggers for a user.
 */
export async function disableAllUserTriggers(telegramUserId) {
  const triggers = await listUserTriggers(telegramUserId);
  await Promise.all(triggers.map((t) => disableTrigger(t.triggerId || t.id)));
  return triggers.length;
}
