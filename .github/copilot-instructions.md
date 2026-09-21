---
applyTo: "**"
---

# WoW Logs Discord Bot

## Project Overview
Discord bot that auto-posts WoW raid logs from wow-logs.co.in into guild Discord channels.
Built for WoW private server communities, starting with Wow Patagonia.
Designed for multi-guild use and open-source contribution.

Agent entry point for new work (logs + future org/admin integrations): `AGENTS.md`.
Module contract: `src/modules/contract.ts`. Do not grow this file — put findings below.

## Tech Stack
- Runtime: Node.js 22+ (native fetch, no polyfills)
- Language: TypeScript 5+ (strict mode, ESM with .js import extensions)
- Framework: discord.js v14
- External API: wow-logs.co.in Public API v1 (Bearer auth, REST, JSON)
- Persistence: JSON file store at data/store.json (no database)

## Architecture

```
src/
  types.ts          — Shared WoW Logs API type definitions
  config.ts         — Environment variables (dotenv)
  api.ts            — API client singleton; tracks rate-limit headers
  errors.ts         — Error types + Spanish user-friendly messages
  emoji.ts          — WoW emoji resolution (spec → class → text fallback)
  store.ts          — JSON file persistence for per-Discord-guild config
  format/            — Embed building + formatting
    index.ts        — Re-exports for convenience
    utils.ts        — Number/date/duration formatting, difficulty labels
    stats.ts        — Reusable stat extractors (DPS, HPS, deaths, interrupts, encounters)
    embed.ts        — Discord embed builder (assembles stats into embed fields)
  watcher.ts        — Polling loop: detects new logs, deduplicates, posts to Discord
  commands/          — One file per slash command
    index.ts        — Command registry + router
    setup.ts        — /setup: configure guild, channel, thread mode
    setupemojis.ts  — /setupemojis: upload WoW icons as server emojis
    latestlog.ts    — /latestlog: post latest log embed
    log.ts          — /log: post specific log embed
    logs.ts         — /logs: list recent log metadata
    status.ts       — /status: API health + bot config
    preview.ts      — /preview: test embed without waiting for upload
  index.ts          — Bot entry point (login, register commands, start watcher)
  test-cli.ts       — CLI tool to test API + embed output without Discord
```

## WoW Logs API Quick Reference
- Base: https://api.wow-logs.co.in/api/v1
- Always use the api. subdomain (main domain has Cloudflare bot challenges)
- Auth: `Authorization: Bearer wl_live_...` on every request except /openapi.json
- Only public guilds are queryable; private ones return 404
- `player.role` is only `DPS` or `HEALER` — no separate TANK role in v1
- `?include=consumables,interrupts` enriches per-fight player data
- Log-list requests cost `limit` toward the per-minute RPM budget
- Guild name in the URL path is case-sensitive (e.g. `Serenity` not `serenity`)
- Rate-limit headers: X-RateLimit-Remaining, X-RateLimit-Monthly-Remaining, etc.

## User / Guild Context
- Guild: Serenity on Wow Patagonia (realm slug: `wow-patagonia`, server id: 12)
- Language: Spanish (Argentine) — all user-facing text in Spanish
- Timezone: America/Argentina/Buenos_Aires
- Locale: es-AR for number formatting (dot as thousands separator: 8.156)
- Raid size: 25-man primarily
- Date format: `Viernes 21/08/2026, 21:00hs`

## Key Design Decisions
- Thread per log (default) to keep the channel clean; togglable via /setup
- First watcher poll seeds lastLogId silently (no spam on first boot)
- Poll interval defaults to 2 min — well within Pro tier's 300 RPM
- Embed color: green (all kills), red (all wipes), orange (mixed)
- Top DPS/HPS shows average across all kill fights (not best single fight)
- Deaths exclude Hunters — Feign Death is counted as a real death by the API,
  making Hunter death counts unreliable. API only provides a count, no death type.
- Consumable compliance from the first kill fight (represents raid start)
- Deaths aggregated across all boss fights

## Coding Standards
- ESM imports with `.js` extensions (`import { x } from './foo.js'`)
- `node:` prefix for built-in modules (`import { readFileSync } from 'node:fs'`)
- Strict TypeScript — avoid `any`; use `unknown` + narrowing for API responses
- One file per slash command; export `definition` + `execute`
- User-facing strings in Spanish; console/debug logs in English with `[module]` prefix
- No excessive comments — code should be self-documenting
- Keep embed fields within Discord limits (field value ≤ 1024 chars, total ≤ 6000)
- Format numbers with `Intl.NumberFormat('es-AR')`
- Dates via `Intl.DateTimeFormat` with the configured timezone

## Adding a New Slash Command
1. Create `src/commands/mycommand.ts`
2. Export `definition` (SlashCommandBuilder) and `execute` (async handler)
3. Import and add to the `commands` array in `src/commands/index.ts`
4. `npm run build` and restart — commands auto-register on bot ready

## Testing
- `npm test` — fetch a real log from the API and print the embed to console (no Discord needed)
- `/preview <logId>` — test the full embed in Discord without uploading a new log
- Pass `thread:True` to `/preview` to also test thread creation

## Environment Variables (see .env.example)
- DISCORD_TOKEN — Bot token from Discord Developer Portal
- DISCORD_CLIENT_ID — Application Client ID
- WOWLOGS_API_KEY — wow-logs.co.in API key (wl_live_...)
- POLL_INTERVAL_MS — Watcher interval in ms (default 120000)
- TIMEZONE — IANA timezone (default America/Argentina/Buenos_Aires)

## Workflow Rules
- When uncertain about what the API returns, ALWAYS make a real API call yourself
  using the debug scripts or test-cli before guessing. Ask the user for a log ID if needed.
- Check this file and /memories/ for prior findings before asking the user questions
  that may already be answered.
- Document every API discovery, behavioral finding, or user preference in this file
  immediately — future sessions depend on it.
- Use `src/debug-consumables.ts` or write ad-hoc scripts in src/ to inspect raw API
  responses. Clean up debug scripts after the issue is resolved.
- When an API response looks wrong (missing data, all-zero fields, unexpected format),
  write a short bug report for the user to post in the wow-logs.co.in Discord server.
  Format: one-liner summary, endpoint + params, actual vs expected, and a curl example.
  Save each report as a numbered .md file in `bug-reports/` (e.g. `001-consumables-always-empty.md`).
- The wow-logs API may time out from some networks. Always try the call yourself first;
  if it fails, explain the connectivity issue and ask the user to run the debug script.

## API Bug Reports (to post in wow-logs Discord)
### Consumables data always empty (all servers)
**Verified 2026-08-27 across 3 guilds on 2 servers — confirmed API-wide, not server-specific.**

`?include=consumables` is accepted (property appears in response, absent without it),
but every field is always zero/false for all players in every fight:
```json
{"potionsUsed":0,"healthstonesUsed":0,"flaskActive":false,"flaskUptime":null,"foodBuff":false,"hadPrepot":false}
```
Tested on:
- wow-patagonia / Serenity (log #29994, 12 kill fights, 25 players each)
- wow-patagonia / Havoc (latest log)
- warmane-onyxia / secrets (latest log)

All returned identical empty objects. The param works (consumables key is absent
without `include`), but the data is never populated.
```
curl -s -H "Authorization: Bearer wl_live_YOUR_KEY" \
  "https://api.wow-logs.co.in/api/v1/guilds/warmane-onyxia/secrets/logs/latest?include=consumables"
```

## API Data Findings
- **Consumables (ALL servers):** As of 2026-08-27, `?include=consumables` returns
  all-zero / all-false data across every server tested (wow-patagonia, warmane-onyxia).
  The param is accepted (property appears), but data is never populated. API-wide issue.
  The embed skips the Consumibles section when all values are empty.
- **Deaths:** API only provides `player.deaths` as an integer count per fight — no
  death cause/type. Hunter Feign Death is counted as a real death (known upstream bug).
  We exclude Hunters from the death leaderboard entirely. "Mysterious Death" cannot
  be filtered since we have no type breakdown.
- **Timestamps:** API fight timestamps have a `Z` (UTC) suffix but are actually in
  the uploader's local timezone. Do NOT convert them — display as-is using `timeZone: 'UTC'`
  in Intl.DateTimeFormat to preserve the raw values. Confirmed: raid starts at 21:00 AR,
  first pull shows 21:14 when displayed without conversion.
- **Encounters display:** Bosses are grouped by bossName. Killed bosses show the kill
  row only (with wipe count if not a one-shot). Undefeated bosses show one row with
  total wipe count and last attempt duration.
