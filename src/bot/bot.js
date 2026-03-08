import { Telegraf } from "telegraf";
import {
  handleConnectGmail,
  handleEnableTrigger,
  handleCheckAuth,
  handleListTriggers,
  handleSetupWebhook,
} from "./commands.js";

export function createBot() {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  bot.start((ctx) =>
    ctx.reply(
      "Welcome to TeleCar Bot\n\n" +
        "Commands:\n" +
        "/connect_gmail - Connect your Gmail account\n" +
        "/enable_trigger - Enable new-email trigger\n" +
        "/check_auth - Check Gmail connection status\n" +
        "/list_triggers - List active triggers\n" +
        "/setup_webhook - (Admin) Register webhook URL with Composio\n" +
        "/help - Show this message",
    ),
  );

  bot.help((ctx) =>
    ctx.reply(
      "Commands:\n" +
        "/connect_gmail - Connect your Gmail account via Composio OAuth\n" +
        "/enable_trigger - Enable the Gmail new-email trigger (after connecting)\n" +
        "/check_auth - Check if your Gmail is connected\n" +
        "/list_triggers - List your active Composio triggers\n" +
        "/setup_webhook - (Admin) One-time setup: register webhook URL with Composio",
    ),
  );

  bot.command("connect_gmail", handleConnectGmail);
  bot.command("enable_trigger", handleEnableTrigger);
  bot.command("check_auth", handleCheckAuth);
  bot.command("list_triggers", handleListTriggers);
  bot.command("setup_webhook", handleSetupWebhook);

  return bot;
}
