# Domain backlog and constraints

Primary guild: **Serenity** on realm slug `wow-patagonia` (server id 12). Raid size 25. Officers use Manage Server today; future org tools may use Manage Events or a role check.

## `logs` — wow-logs.co.in

Already shipped (flat `src/`, not yet extracted):

- Watcher: seed `lastLogId` silently, then post new logs
- Dedup: same `raid.name` + `size` + first boss start within 30 min (`DEDUP_WINDOW_MS`)
- Best log = most boss kills, then highest `logId`
- Alts: footer only, no extra Discord message
- Commands: `/setup` `/setupemojis` `/log` `/latestlog` `/logs` `/preview` `/status`

Shipped in modules: `/rankings`, `/goats` (combined weekly top 3 DPS / top 2 heals + same-weekday streaks).

Good next integrations:

- Weekly recap watcher that auto-posts `/goats` (command exists; no cron yet)
- Meta-driven raid/boss lists (`/meta/raids`, `/meta/raids/{slug}/bosses`) instead of hardcoding thumbnails in `/logs`

Do not re-enable consumables until `bug-reports/001` is fixed upstream.

## `org` — raid organization

No code yet. Typical officer workflows for a 25-man WotLK guild:

| Module id | Commands (suggested) | Store | Intents |
|---|---|---|---|
| `absences` | `/ausente`, `/ausencias` | `org.absences` | Guilds |
| `attendance` | `/asistencia` | `org.attendance` | Guilds (Members only if you auto-match nicknames) |
| `calendar` | `/raid`, `/raids` | `org.events` | Guilds + Discord Scheduled Events API |
| `roster` | `/roster`, `/main` | `org.roster` | Guilds |
| `loot` | `/loot`, `/reservas` | `org.loot` | Guilds |

Calendar should prefer Discord Guild Scheduled Events over a home-grown embed when possible. Attendance should start as opt-in slash reactions/buttons, not scraping chat.

## `discord-admin` — guild Discord

No code yet. Keep this **opt-in per Discord server** (same multi-guild rule as logs).

| Module id | Purpose | Extra bot perms | Privileged intents? |
|---|---|---|---|
| `welcome` | mensaje / rol de llegada | ManageRoles? | **GuildMembers** — ask first |
| `class-roles` | botones de clase/spec | ManageRoles | no |
| `channels` | plantilla de categorías raid | ManageChannels | no |
| `moderation` | warn / timeout helpers | ModerateMembers | no |
| `roster-role` | `/listarol` — assign a configured role from a pasted name list | ManageRoles | **GuildMembers** (enabled) |

Invite bitfield (`326686026752`) includes Manage Roles plus the original logs perms. Server Members Intent must be on in the Developer Portal. The bot's role must sit above the target role.

## Official wow-logs overlap

The website lists “Discord broadcasts” (site-side) and a **planned** official Discord bot. This repo is a community client of the Public API. Do not scrape the website. Do not assume webhooks from wow-logs exist until documented. Rankings/meta are fair game via API v1.
