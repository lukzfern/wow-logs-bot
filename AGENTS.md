# WoW Logs Bot — Agent briefing

Discord bot for **Serenity @ Wow Patagonia** (WotLK 3.3.5). Today it auto-posts raid logs from [wow-logs.co.in](https://wow-logs.co.in) Public API v1. The target is a **guild ops bot**: logs plus raid organization and Discord administration.

Read this file first. Then open the matching rule/skill. Do not invent API fields — call the API or read `bug-reports/`.

## Stack

- Node 22+, TypeScript strict, ESM with `.js` import extensions
- discord.js v14, `GatewayIntentBits.Guilds` only
- Persistence: `data/store.json` (gitignored). No database.
- UI language: **Spanish (es-AR)**. Console logs: English with `[module]` prefix.

## Current runtime (as-is)

```
src/index.ts          login → register global slash commands → startWatcher
src/watcher.ts        poll wow-logs every POLL_INTERVAL_MS (default 120s)
src/api.ts            Bearer client; only health / guild logs / log detail
src/store.ts          per-Discord-guild config + posted-raid dedup
src/commands/*        one file per slash command; registry in commands/index.ts
src/format/*          embed + stat extractors (never mix those)
src/modules/          target home for new integrations (see contract.ts)
```

Deep product/API notes live in `.github/copilot-instructions.md`.

## Target domains

| Domain | id examples | Owns | Does not own |
|---|---|---|---|
| `logs` | `logs`, `rankings` | wow-logs API, raid embeds, log watcher | Discord roles, calendars |
| `org` | `attendance`, `absences`, `roster`, `loot`, `calendar` | guild process, officer tools | rewriting log embeds |
| `discord-admin` | `welcome`, `roles`, `channels`, `moderation` | Discord server structure | wow-logs payloads |

New work goes in `src/modules/<id>/` and implements `IntegrationManifest` from `src/modules/contract.ts`. Do not dump org/admin state into `GuildConfig`.

## Non-negotiables

1. User-facing strings in Spanish; errors via `friendlyError()`.
2. One slash command per file; export `definition` + `execute`.
3. Reuse `src/format/stats.ts` for numbers; do not re-parse fights in a command.
4. Never convert wow-logs fight timestamps — they have `Z` but are **uploader local time**. Display with `timeZone: 'UTC'`.
5. Do not add privileged Discord intents (`GuildMembers`, `MessageContent`, `GuildPresences`) without asking.
6. Do not call `www`/`wow-logs.co.in` for the API — only `https://api.wow-logs.co.in/api/v1`.
7. Guild path names are **case-sensitive** (`Serenity`, not `serenity`).
8. When the API looks wrong, write `bug-reports/00N-....md` instead of papering over it.

## Skills (read when the task matches)

- Adding any new bot capability → `.cursor/skills/add-discord-integration/SKILL.md`
- Adding only a slash command in the current logs bot → `.cursor/skills/add-slash-command/SKILL.md`
- Touching wow-logs payloads → `.cursor/skills/wowlogs-api/SKILL.md`

## Verify

```bash
npx tsc --noEmit
npm run build
```

For embed/API work: `npm test` (optional log id) and `/preview` in Discord. There is no browser UI to click.
