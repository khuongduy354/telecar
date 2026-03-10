# TeleCar Bot

Telegram bot that connects users' Gmail via Composio. Receives new-email trigger events from Composio webhooks and forwards them to Telegram.

## Architecture

```c
// login and trigger enabled
User (Telegram) <-> Telegraf Bot (self hosted server) <-> Composio SDK -> Composio Platform
                                          

// when trigger fires
Gmail (new email) -> Composio (webhook trigger) -> Webhook POST -> Destination (Thien n8n)
```

**Flow:**
1. User sends `/connect_gmail` - bot generates an OAuth link via Composio
2. User authenticates on the link - Composio stores the connected account
3. User sends `/enable_trigger` - bot creates a `GMAIL_NEW_GMAIL_MESSAGE` trigger on Composio
4. When new email arrives, Composio polls Gmail (~1 min) and POSTs to our webhook
5. Webhook handler forwards the email notification back to the user's Telegram

## Prerequisites

- Node.js >= 18
- A Telegram Bot Token
- A Composio account + API key

## Setup

### 1. Create a Telegram Bot
- Open Telegram, search for `@BotFather`
- Send `/newbot`, follow prompts
- Copy the token, put it in `.env` as `TELEGRAM_BOT_TOKEN`

### 2. Get Composio API Key
- Sign up at https://platform.composio.dev
- Go to Settings > API Keys
- Create a project API key, put it in `.env` as `COMPOSIO_API_KEY`

### 3. Gmail Toolkit on Composio
- No manual setup needed for basic use (Composio managed OAuth)
- On first `/connect_gmail` the bot auto-resolves the Gmail auth config
- If you want custom OAuth (your own Google Cloud credentials), see https://docs.composio.dev/docs/using-custom-auth-configuration

### 4. Webhook URL

**Production:**
Use your server's public URL.

Set it in `.env`:
```
COMPOSIO_WEBHOOK_URL=https://your-domain.com/webhook
```



### 5. Install and Run

```bash
cp .env.example .env
# fill in .env values

npm install
npm run dev
```

## Commands

| Command | Description |
|---|---------|
| `/start` | Show welcome message |
| `/connect_gmail` | Get OAuth link to connect Gmail |
| `/enable_trigger` | Enable new-email trigger (after connecting) |
| `/check_auth` | Check Gmail connection status |
| `/list_triggers` | List active triggers |
| `/setup_webhook` | (Admin) Register webhook URL with Composio — run once |
| `/help` | Show commands |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | From @BotFather |
| `COMPOSIO_API_KEY` | Yes | From Composio dashboard |
| `COMPOSIO_WEBHOOK_URL` | Yes | Public URL for receiving trigger events (e.g. `https://your-domain.com/webhook`) |

## How Composio Auth Works
- Each Telegram user ID is used as the Composio `user_id` (external user ID)
- When `/connect_gmail` is called, an auth link (Connect Link) is generated
- User clicks the link, authenticates with Google, Composio stores the tokens
- The connection persists across sessions, no re-auth needed unless tokens expire
- `/check_auth` queries Composio for active connected accounts matching the user ID

## How Triggers Work
- Gmail is a polling trigger (Composio polls ~every 1 minute)
- After `/enable_trigger`, Composio creates a `GMAIL_NEW_GMAIL_MESSAGE` trigger scoped to the user's connected account
- When new mail is detected, Composio sends a POST to `COMPOSIO_WEBHOOK_URL`
- The webhook payload (V3) contains `metadata.user_id` which maps back to the Telegram user ID
- The bot then sends a formatted message to that Telegram user


## Project Structure

```
src/
  index.js              # Entry point - starts bot + webhook server
  bot/
    bot.js              # Telegraf bot setup + command registration
    commands.js         # Command handlers
  composio/
    client.js           # Composio SDK singleton
    auth.js             # Gmail auth config + connection link + status
    triggers.js         # Trigger creation + listing
    webhook.js          # Webhook subscription registration (REST API)
  server/
    webhookServer.js    # Express server for receiving webhook POSTs
```
