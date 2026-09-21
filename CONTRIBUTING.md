# Contributing

## Getting started

1. Fork the repo and clone it
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your keys
4. `npm run dev` to start in watch mode

## Adding a command

1. Create `src/commands/mycommand.ts`
2. Export `definition` (SlashCommandBuilder) and `execute` (async handler)
3. Add it to the array in `src/commands/index.ts`
4. Rebuild — commands register automatically on bot startup

## Project conventions

- **TypeScript strict mode** — no `any`, use `unknown` + narrowing
- **ESM** with `.js` import extensions
- **One file per command** in `src/commands/`
- **Reusable stats** go in `src/format/stats.ts`, not in the embed builder
- **User-facing text** in Spanish, console logs in English with `[module]` prefix
- **Numbers** formatted with `fmtK()` (e.g. 8.2K)
- Read `AGENTS.md` first, then `.github/copilot-instructions.md` for API/product findings
- New features that are not log-posting belong in `src/modules/<id>/` (see `.cursor/skills/add-discord-integration/`)

## Before submitting a PR

```bash
npx tsc --noEmit    # Must pass with no errors
npm run build       # Must compile
```

Test your changes with `/preview` in Discord before submitting.

## Reporting API issues

If you find a bug in the wow-logs.co.in API (not our bot), create a report in `bug-reports/` following the format of existing reports. Include:
- Endpoint and parameters
- Expected vs actual response
- curl command to reproduce
