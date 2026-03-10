import { getComposio } from "./client.js";

/**
 * Resolve the Gmail auth config ID.
 * Composio auto-creates a managed auth config when the toolkit is first used.
 * This looks it up by toolkit slug.
 */
export async function getGmailAuthConfigId() {
  const composio = getComposio();
  const configs = await composio.authConfigs.list({ toolkit: "gmail" });
  const items = configs.items ?? configs;
  if (!items || items.length === 0) {
    throw new Error(
      "No Gmail auth config found. Visit https://platform.composio.dev to set up Gmail toolkit first.",
    );
  }
  return items[0].id;
}

/**
 * Create a connection link for a user to authenticate their Gmail via OAuth.
 * Uses the Telegram user ID as the Composio external user ID.
 * Returns { redirectUrl, connectedAccountId }
 */
export async function createGmailConnectionLink(telegramUserId) {
  const composio = getComposio();
  const authConfigId = await getGmailAuthConfigId();
  const userId = String(telegramUserId);

  const connectionRequest = await composio.connectedAccounts.link(
    userId,
    authConfigId,
  );

  return {
    redirectUrl: connectionRequest.redirectUrl,
    connectedAccountId: connectionRequest.connectedAccountId,
  };
}

/**
 * List connected accounts for a Telegram user filtered to Gmail.
 * Returns array of connected accounts (empty if none).
 */
export async function getGmailConnections(telegramUserId) {
  const composio = getComposio();
  const userId = String(telegramUserId);

  const result = await composio.connectedAccounts.list({
    userIds: [userId],
    toolkitSlugs: ["gmail"],
  });

  return result.items ?? result ?? [];
}

/**
 * Check if a user has an active Gmail connection.
 * Returns { connected: boolean, accounts: [...] }
 */
export async function checkGmailAuthStatus(telegramUserId) {
  const accounts = await getGmailConnections(telegramUserId);
  const active = Array.isArray(accounts)
    ? accounts.filter((a) => a.status === "ACTIVE")
    : [];

  return {
    connected: active.length > 0,
    accounts: active,
  };
}

/**
 * Disconnect all Gmail connected accounts for a user.
 */
export async function disconnectGmailAccount(telegramUserId) {
  const composio = getComposio();
  const accounts = await getGmailConnections(telegramUserId);
  await Promise.all(
    accounts.map((a) => composio.connectedAccounts.delete(a.id)),
  );
  return accounts.length;
}
