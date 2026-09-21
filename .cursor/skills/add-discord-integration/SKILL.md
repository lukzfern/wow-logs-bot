---
name: add-discord-integration
description: Adds a new Discord bot integration (logs, raid org, or guild admin) using IntegrationManifest. Use when the user asks for a new bot feature, module, watcher, officer tool, attendance, calendar, loot, roster, welcome, roles, or Discord server admin.
---

# Add a Discord integration

## 1. Classify the domain

| User intent | Domain | Examples |
|---|---|---|
| wow-logs, parses, embeds, rankings | `logs` | weekly recap, `/rankings`, parse alerts |
| raid life, officers, roster | `org` | ausencias, asistencia, calendario, loot, bench |
| Discord server itself | `discord-admin` | bienvenida, roles por clase, canales, warns |

If it spans two domains, split into two modules that talk via store keys — do not share files.

Read [domains.md](domains.md) for the backlog and permission/intent matrix.

## 2. Design the manifest (before coding)

Fill this and show it to the user if anything is ambiguous (intents, who can run the command, which channel):

```
id:
domain:
commands:        # /name + who (admin / officer / raider)
watchers:        # none | interval + what it posts
storeNamespaces: # keys owned in data/store.json
extraIntents:    # almost always none
botPermissions:  # SendMessages, EmbedLinks, ManageRoles, …
```

Stop and ask if you need `GuildMembers`, `MessageContent`, or `GuildPresences`.

## 3. Scaffold

```
src/modules/<id>/
  index.ts
  commands/<command>.ts
  store.ts          # only if new keys
  watcher.ts        # only if polling/cron
```

- `index.ts` exports `const module: IntegrationManifest` and is appended to `modules` in `src/modules/index.ts`.
- Command files follow `.cursor/skills/add-slash-command/SKILL.md`.
- Until `src/index.ts` composes `modules[]`, also register commands in `src/commands/index.ts` and start watchers next to `startWatcher` — then leave a `// TODO(modules): wire via registry` comment. Prefer wiring the registry if the change is small.

## 4. Store

```typescript
// ✅ this module's namespace
data.org.attendance[discordGuildId]

// ❌ do not grow GuildConfig with unrelated fields
cfg.attendanceChannelId = ...
```

Keep `GuildConfig` for wow-logs realm/guild/channel/lastLogId/useThreads only. Add a typed slice in the module `store.ts` (load/save the same `data/store.json`, namespaced).

## 5. Implement and verify

- Spanish user text, English `[id]` console logs
- `assertUniqueCommandNames` still holds
- `npx tsc --noEmit && npm run build`
- If it posts messages: exercise the command in Discord (`/preview` for logs; the real command for org/admin)
- Update `AGENTS.md` domain table only if you introduced a new domain id
