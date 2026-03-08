import {
  createGmailConnectionLink,
  checkGmailAuthStatus,
} from "../composio/auth.js";
import { registerWebhookSubscription } from "../composio/webhook.js";
import { enableGmailTrigger, listUserTriggers } from "../composio/triggers.js";

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
    await ctx.reply("Failed to create Gmail connection link: " + err.message);
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
    await ctx.reply("Failed to enable trigger: " + err.message);
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
    await ctx.reply("Failed to check auth status: " + err.message);
  }
}

/**
 * /setup_webhook - (Admin) Register the COMPOSIO_WEBHOOK_URL with Composio.
 * Run this once after deploying or changing your webhook URL.
 * Only allowed for ADMIN_TELEGRAM_ID if set in env.
 */
export async function handleSetupWebhook(ctx) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (adminId && String(ctx.from.id) !== String(adminId)) {
    await ctx.reply("Not authorized.");
    return;
  }

  const webhookUrl = process.env.COMPOSIO_WEBHOOK_URL;
  if (!webhookUrl) {
    await ctx.reply(
      "COMPOSIO_WEBHOOK_URL is not set in .env. Set it and restart.",
    );
    return;
  }

  await ctx.reply(`Registering webhook URL with Composio:\n${webhookUrl}`);

  try {
    const sub = await registerWebhookSubscription();
    await ctx.reply(
      "Webhook registered.\nSubscription ID: " +
        (sub.id ?? JSON.stringify(sub)) +
        "\n\nThis is a one-time project-level setup. You do not need to run this again unless the URL changes.",
    );
  } catch (err) {
    console.error("setup_webhook error:", err);
    await ctx.reply("Failed to register webhook: " + err.message);
  }
}

/**
 * /list_triggers - List active triggers for the user.
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
    await ctx.reply("Failed to list triggers: " + err.message);
  }
}
