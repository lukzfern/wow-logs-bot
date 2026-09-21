---
name: wowlogs-api
description: Investigates or extends the wow-logs.co.in Public API v1 client. Use when changing api.ts, types, watcher dedup, embeds, rate limits, or when an API field looks empty or wrong.
---

# wow-logs Public API v1

## Call, don't guess

```bash
# health + latest embed dump (needs .env WOWLOGS_API_KEY)
npx tsx src/test-cli.ts
npx tsx src/test-cli.ts 29994
```

Base: `https://api.wow-logs.co.in/api/v1`. Header: `Authorization: Bearer $WOWLOGS_API_KEY`.

Used today in `src/api.ts`:

- `GET /health`
- `GET /guilds/{realm}/{guild}/logs?limit=&cursor=`
- `GET /guilds/{realm}/{guild}/logs/{id|latest}?include=consumables,interrupts`

Unused but documented (`/docs/api`, `/openapi.json`):

- `/meta/servers` `/meta/raids` `/meta/raids/{slug}/bosses` `/meta/ladders` `/meta/difficulties` `/meta/seasons`
- `/guilds/{realm}/{guild}/rankings?raid=&season=&difficulty=&ladder=`

## Known lies in the payload

| Field | Reality | Bot behavior |
|---|---|---|
| `fights[].start` ends with `Z` | Uploader local time, not UTC | `spanishDateTime` uses `timeZone: 'UTC'` |
| `consumables.*` | Always 0/false (API-wide) | `extractConsumables` returns `null` |
| `player.deaths` | Hunter FD counts | Hunters omitted from death board |
| `player.role` | `DPS` \| `HEALER` | No tank bucket |
| List vs detail after merge | List keeps old ids; detail `logUrl` points at survivor | Dedup window 30 min |

If you confirm a new API bug, add `bug-reports/00N-short-slug.md` with endpoint, expected vs actual, and a curl. Full notes: `.github/copilot-instructions.md` and `.cursor/rules/wowlogs-api.mdc`.
