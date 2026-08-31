# Bug: Merged/redirected logs still appear in list endpoint

## Summary

When two logs are uploaded for the same raid and get merged on the server side, the detail endpoint correctly redirects (returns the merged log's data and `logUrl`), but the list endpoint still returns both original log IDs as separate entries.

## Endpoints

- `GET /api/v1/guilds/{realm}/{guild}/logs` — lists both IDs
- `GET /api/v1/guilds/{realm}/{guild}/logs/{logId}` — redirects to merged log

## Example

Logs #30792 and #30794 for guild Serenity on wow-patagonia:

**List endpoint** returns both as separate entries:

```json
{ "logId": 30794, "logUrl": "https://wow-logs.co.in/30794" },
{ "logId": 30792, "logUrl": "https://wow-logs.co.in/30792" }
```

**Detail endpoint** for #30792 returns #30794's data:

```json
{
  "logId": 30792,
  "logUrl": "https://wow-logs.co.in/30794",
  "fights": [...]  // identical to #30794
}
```

The website also redirects `wow-logs.co.in/30792` → `wow-logs.co.in/30794`.

## Expected behavior

Merged logs should either:

- Not appear in the list endpoint, or
- Be marked with a field like `"mergedInto": 30794` so consumers can filter them

## Reproduction

```bash
# List shows both
curl -s -H "Authorization: Bearer wl_live_YOUR_KEY" \
  "https://api.wow-logs.co.in/api/v1/guilds/wow-patagonia/Serenity/logs?limit=5"

# Detail for 30792 returns 30794's logUrl
curl -s -H "Authorization: Bearer wl_live_YOUR_KEY" \
  "https://api.wow-logs.co.in/api/v1/guilds/wow-patagonia/Serenity/logs/30792" \
  | jq '.data.log.logUrl'
# → "https://wow-logs.co.in/30794"
```

Tested 2026-08-30. Server: wow-patagonia (id 12), guild: Serenity.
