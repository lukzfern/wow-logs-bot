# Serenity Bot

Guild ops Discord bot for **Serenity @ Wow Patagonia**. Posts [wow-logs.co.in](https://wow-logs.co.in) raid logs, plus tools like roster roles and raid announcements.

## Features

- **Auto-post new logs** — polls for new uploads and creates a thread with a detailed embed
- **Rich embeds** — encounters, top DPS/HPS, deaths, interrupts at a glance
- **WoW icons** — class and spec icons as custom Discord emojis (auto-upload with `/setupemojis`)
- **Duplicate detection** — multiple uploads from the same raid are grouped (best log shown, alts in footer)
- **Spanish UI** — all user-facing text in Spanish
- **Multi-guild** — one bot can serve multiple Discord servers, each with its own guild config
- **Roster → rol** — `/listarol` asigna un rol a un export de Raid-Helper y anuncia al raid (`anunciar` o el botón post-aplicar)
- **Goats de la semana** — `/goats` top 3 DPS y top 2 heals combinando las 2 raids, con racha si repetís noche y rol

## Quick Start

### 1. Create a Discord Application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) → New Application
2. Go to **Bot** → Reset Token → copy the token
3. Bot → **Privileged Gateway Intents** → enable **Server Members Intent**
4. Go to **OAuth2** → copy the Client ID

### 2. Get a WoW Logs API Key

1. Go to [wow-logs.co.in/account/api](https://wow-logs.co.in/account/api)
2. Create a new API key (starts with `wl_live_`)

### 3. Invite the Bot

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=326686026752&scope=bot+applications.commands
```

### 4. Configure and Run

```bash
git clone https://github.com/YOUR_USER/wow-logs-bot.git
cd wow-logs-bot
npm install
cp .env.example .env
# Edit .env with your DISCORD_TOKEN, DISCORD_CLIENT_ID, and WOWLOGS_API_KEY
npm run build
npm start
```

### 5. Set Up in Discord

```
/setup realm:wow-patagonia guild:Serenity channel:#raid-logs
/setupemojis modo:Specs
/listarol setup nombre:consumibles rol:@❖ 𝖈𝖔𝖓𝖘𝖚𝖒𝖆𝖇𝖑𝖊𝖘
/listarol anunciar preset:consumibles
```

## Commands

| Command | Permission | Description |
|---|---|---|
| `/setup` | Manage Server | Configure guild, channel, and thread mode |
| `/setupemojis` | Manage Expressions | Upload WoW class/spec icons as server emojis |
| `/log <id>` | Manage Server | Post a specific log embed |
| `/latestlog` | Manage Server | Post the latest log embed |
| `/logs` | Manage Server | List recent logs |
| `/preview <log>` | Manage Server | Preview an embed (ephemeral, for testing) |
| `/status` | Manage Server | Show API health and bot config |
| `/rankings` | Manage Server | Guild Boss Points rankings (defaults to the realm's active raid/season) |
| `/goats` | Manage Server | Weekly goats — combined top 3 DPS / top 2 heals across both raid nights |
| `/listarol` | Manage Roles | Assign a role from a Raid-Helper list and announce it (`setup` / `preview` / `aplicar` / `anunciar`) |

## Embed Sections

- **Encuentros** — one row per boss: ✅ kills with duration, ❌ wipes with count
- **Top DPS** — average DPS across all kills (players must be in ≥ N-1 fights)
- **Top HPS** — same logic for healers
- **Muertes** — death leaderboard (Hunters excluded due to Feign Death bug)
- **Interrupts** — total interrupts per player

## Project Structure

```
src/
  types.ts            — WoW Logs API type definitions
  config.ts           — Environment variables
  api.ts              — API client with rate-limit tracking
  errors.ts           — Error types + Spanish user-friendly messages
  emoji.ts            — WoW emoji resolution (spec → class → text fallback)
  store.ts            — JSON persistence for guild configs + posted raids
  format/             — Embed building + formatting
    index.ts          — Re-exports
    utils.ts          — Number/date/duration formatting
    stats.ts          — Reusable stat extractors (DPS, HPS, deaths, etc.)
    embed.ts          — Discord embed builder
  watcher.ts          — Polling loop with same-raid duplicate detection
  index.ts            — Bot entry point
  test-cli.ts         — CLI tool to test embeds without Discord
  commands/
    index.ts          — Command registry + router
    setup.ts          — /setup
    setupemojis.ts    — /setupemojis
    latestlog.ts      — /latestlog
    log.ts            — /log
    logs.ts           — /logs
    preview.ts        — /preview
    status.ts         — /status
assets/icons/
  class/              — 10 class icons (64x64)
  spec/               — 30 spec icons (64x64)
  section/            — Section header icons (DPS, healer, deaths, interrupts)
```

## Adding a Command

1. Create `src/commands/mycommand.ts`
2. Export `definition` (SlashCommandBuilder) and `execute` (async handler)
3. Import and add to the `commands` array in `src/commands/index.ts`
4. Rebuild and restart — commands auto-register on bot ready

## API

Uses the [wow-logs.co.in Public API v1](https://wow-logs.co.in/docs/api). Requires a Bearer API key. See the [API docs](https://wow-logs.co.in/docs/api) for endpoints and rate limits.

## Development

```bash
npm run dev     # Watch mode with tsx
npm test        # Fetch a log and print embed to console
npm test goats  # Print the weekly goats embed (optional: npm test goats 2)
npm run build   # Compile TypeScript
npm start       # Run the bot
```
