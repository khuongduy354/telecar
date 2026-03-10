import {
  createGmailConnectionLink,
  checkGmailAuthStatus,
  disconnectGmailAccount,
} from "../composio/auth.js";
import {
  enableGmailTrigger,
  listUserTriggers,
  disableAllUserTriggers,
} from "../composio/triggers.js";

/**
 * Extract a short, user-friendly message from an error.
 * Avoids leaking stack traces or raw API responses to chat.
 */
function userErrorMessage(err) {
  if (err?.status === 401)
    return "Service authentication failed. Please contact the admin.";
  if (err?.status === 429) return "Too many requests. Please try again later.";
  if (err?.status >= 500)
    return "Service is temporarily unavailable. Please try again later.";
  // Use first sentence of message if available, strip JSON blobs
  const msg = err?.message || "An unexpected error occurred.";
  const clean = msg.replace(/\{[\s\S]*\}/, "").trim();
  return clean || "An unexpected error occurred.";
}

/**
 * /connect_gmail - Generate an OAuth link for the user to connect their Gmail
 * on Composio, then enable the new-mail trigger.
 */
export async function handleConnectGmail(ctx) {
  const telegramUserId = ctx.from.id;

  await ctx.reply("Setting up Gmail connection...");

  try {
    // Check if already connected
    const status = await checkGmailAuthStatus(telegramUserId);
    if (status.connected) {
      await ctx.reply(
        "You already have an active Gmail connection.\n" +
          "Use /check_auth to see details or /enable_trigger to re-enable the mail trigger.",
      );
      return;
    }

    // Create connection link
    const { redirectUrl } = await createGmailConnectionLink(telegramUserId);

    await ctx.reply(
      "Click the link below to connect your Gmail account:\n\n" +
        redirectUrl +
        "\n\nAfter you finish authenticating, use /enable_trigger to activate the email trigger.",
    );
  } catch (err) {
    console.error("connect_gmail error:", err);
    await ctx.reply(
      "Failed to create Gmail connection link. " + userErrorMessage(err),
    );
  }
}

/**
 * /enable_trigger - Enable the Gmail new-message trigger for the user.
 * Requires an active Gmail connection first.
 */
export async function handleEnableTrigger(ctx) {
  const telegramUserId = ctx.from.id;

  try {
    const status = await checkGmailAuthStatus(telegramUserId);
    if (!status.connected) {
      await ctx.reply(
        "No active Gmail connection found. Use /connect_gmail first.",
      );
      return;
    }

    // Enforce 1 trigger per user
    const existing = await listUserTriggers(telegramUserId);
    if (existing.length > 0) {
      await ctx.reply(
        "You already have an active trigger.\nUse /list_triggers to view it, or /clear_triggers to remove it first.",
      );
      return;
    }

    const connectedAccountId = status.accounts[0].id;

    await ctx.reply("Enabling Gmail new-message trigger...");

    const result = await enableGmailTrigger(telegramUserId, connectedAccountId);

    await ctx.reply(
      "Gmail trigger enabled.\n" +
        "Trigger ID: " +
        (result.triggerId || JSON.stringify(result)) +
        "\n\nYou will receive notifications when new emails arrive.",
    );
  } catch (err) {
    console.error("enable_trigger error:", err);
    await ctx.reply("Failed to enable trigger. " + userErrorMessage(err));
  }
}

/**
 * /check_auth - Check if the user has an active Gmail connection on Composio.
 */
export async function handleCheckAuth(ctx) {
  const telegramUserId = ctx.from.id;

  try {
    const status = await checkGmailAuthStatus(telegramUserId);

    if (!status.connected) {
      await ctx.reply(
        "No active Gmail connection found.\nUse /connect_gmail to get started.",
      );
      return;
    }

    const lines = status.accounts.map(
      (a) => `- Account ID: ${a.id} | Status: ${a.status}`,
    );
    await ctx.reply("Gmail auth status: CONNECTED\n\n" + lines.join("\n"));
  } catch (err) {
    console.error("check_auth error:", err);
    await ctx.reply("Failed to check auth status. " + userErrorMessage(err));
  }
}

/**
 * /list_triggers - List active triggers for the current user.
 */
export async function handleListTriggers(ctx) {
  const telegramUserId = ctx.from.id;

  try {
    const triggers = await listUserTriggers(telegramUserId);

    if (!triggers || triggers.length === 0) {
      await ctx.reply("No active triggers found.");
      return;
    }

    const lines = triggers.map(
      (t) =>
        `- ${t.triggerSlug || t.slug || "trigger"} | ID: ${t.triggerId || t.id}`,
    );
    await ctx.reply("Active triggers:\n\n" + lines.join("\n"));
  } catch (err) {
    console.error("list_triggers error:", err);
    await ctx.reply("Failed to list triggers. " + userErrorMessage(err));
  }
}

/**
 * /clear_triggers - Disable all active triggers for the current user.
 */
export async function handleClearTriggers(ctx) {
  const telegramUserId = ctx.from.id;

  try {
    const count = await disableAllUserTriggers(telegramUserId);
    if (count === 0) {
      await ctx.reply("No active triggers to clear.");
    } else {
      await ctx.reply(
        `Cleared ${count} trigger(s). You will no longer receive email notifications.`,
      );
    }
  } catch (err) {
    console.error("clear_triggers error:", err);
    await ctx.reply("Failed to clear triggers. " + userErrorMessage(err));
  }
}

/**
 * /logout_email - Disconnect Gmail and clear all triggers for the current user.
 */
export async function handleLogoutEmail(ctx) {
  const telegramUserId = ctx.from.id;

  try {
    // Clear triggers first
    await disableAllUserTriggers(telegramUserId).catch(() => {});

    const count = await disconnectGmailAccount(telegramUserId);
    if (count === 0) {
      await ctx.reply("No Gmail account connected.");
    } else {
      await ctx.reply(
        "Gmail account disconnected and all triggers cleared.\nUse /connect_gmail to reconnect.",
      );
    }
  } catch (err) {
    console.error("logout_email error:", err);
    await ctx.reply("Failed to logout. " + userErrorMessage(err));
  }
}
