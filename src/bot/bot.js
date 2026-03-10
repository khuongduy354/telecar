import { Telegraf } from "telegraf";
import {
  handleConnectGmail,
  handleEnableTrigger,
  handleCheckAuth,
  handleListTriggers,
  handleClearTriggers,
  handleLogoutEmail,
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
        "/list_triggers - List your active triggers\n" +
        "/clear_triggers - Remove all your triggers\n" +
        "/logout_email - Disconnect Gmail and clear triggers\n" +
        "/help - Show this message",
    ),
  );

  bot.help((ctx) =>
    ctx.reply(
      "Commands:\n" +
        "/connect_gmail - Connect your Gmail account via Composio OAuth\n" +
        "/enable_trigger - Enable the Gmail new-email trigger (after connecting)\n" +
        "/check_auth - Check if your Gmail is connected\n" +
        "/list_triggers - List your active triggers\n" +
        "/clear_triggers - Remove all your active triggers\n" +
        "/logout_email - Disconnect Gmail and clear all triggers",
    ),
  );

  bot.command("connect_gmail", handleConnectGmail);
  bot.command("enable_trigger", handleEnableTrigger);
  bot.command("check_auth", handleCheckAuth);
  bot.command("list_triggers", handleListTriggers);
  bot.command("clear_triggers", handleClearTriggers);
  bot.command("logout_email", handleLogoutEmail);

  return bot;
}
