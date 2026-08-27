# Bug: Consumable data always empty in Public API log detail

## Summary
The WoW Logs Public API v1 endpoint for fetching guild log details supports an optional `?include=consumables` query parameter that adds a `consumables` object to each player in each fight. The object is correctly returned when the parameter is present (and absent without it), but every field inside is always zero or false — no actual consumable usage is ever populated.

## Endpoint
```
GET /api/v1/guilds/{realm}/{guild}/logs/{logId}?include=consumables
GET /api/v1/guilds/{realm}/{guild}/logs/latest?include=consumables
```
As documented at https://wow-logs.co.in/docs/api#guild-logs

## Expected behavior
Player objects should reflect actual in-game consumable usage:
```json
{
  "potionsUsed": 2,
  "healthstonesUsed": 1,
  "flaskActive": true,
  "flaskUptime": null,
  "foodBuff": true,
  "hadPrepot": true
}
```
(This matches the sample response shown in the API documentation.)

## Actual behavior
Every player in every fight returns identical empty data:
```json
{
  "potionsUsed": 0,
  "healthstonesUsed": 0,
  "flaskActive": false,
  "flaskUptime": null,
  "foodBuff": false,
  "hadPrepot": false
}
```

## Reproduction
```bash
# With consumables — property appears but all values are zero/false
curl -s -H "Authorization: Bearer wl_live_YOUR_KEY" \
  "https://api.wow-logs.co.in/api/v1/guilds/warmane-onyxia/secrets/logs/latest?include=consumables" \
  | jq '.data.log.fights[0].players[0].consumables'

# Without consumables — property is correctly absent
curl -s -H "Authorization: Bearer wl_live_YOUR_KEY" \
  "https://api.wow-logs.co.in/api/v1/guilds/warmane-onyxia/secrets/logs/latest" \
  | jq '.data.log.fights[0].players[0].consumables'
# → null (key not present)
```

## Scope
Tested across 3 guilds on 2 different servers — all return identical empty data:

| Server | Guild | Log | Kill fights checked | Any non-zero? |
|--------|-------|-----|--------------------:|:-------------:|
| wow-patagonia | Serenity | #29994 | 12 | No |
| wow-patagonia | Havoc | latest | 1 | No |
| warmane-onyxia | secrets | latest | 1 | No |

This appears to be an API-wide issue, not server or guild specific.

## Notes
- The `include` parameter itself works correctly: the `consumables` key is present when requested and absent when not. So the query param plumbing is fine — it's just the data population that seems to be missing.
- The `?include=interrupts` parameter (which can be combined as `?include=consumables,interrupts`) was not tested for this report but appears to return data normally.
- Tested on 2026-08-27.
