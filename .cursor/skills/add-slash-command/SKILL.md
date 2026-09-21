---
name: add-slash-command
description: Adds a discord.js slash command to this bot. Use when the user asks for a new /command, to split a command, or to change command options or permissions.
---

# Add a slash command

1. Create `src/commands/<name>.ts` (or `src/modules/<id>/commands/<name>.ts` if it belongs to a new integration).
2. Export `definition` (`SlashCommandBuilder`) and `execute`.
3. Spanish `setDescription` and option names a raider would type (`cantidad`, `canal`, not `limit`).
4. `.setDefaultMemberPermissions(...)` + `.setContexts(InteractionContextType.Guild)`.
5. Register in `src/commands/index.ts` (and in the module manifest if one exists).
6. `npx tsc --noEmit`. Commands re-register on bot ready via `Routes.applicationCommands`.

```typescript
import { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { getGuildConfig } from '../store.js';

export const definition = new SlashCommandBuilder()
  .setName('ejemplo')
  .setDescription('Descripción en español')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const cfg = getGuildConfig(interaction.guildId!);
  if (!cfg) {
    await interaction.reply({ content: '❌ Usá `/setup` primero para configurar la guild.', flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await interaction.editReply('✅ Hecho.');
}
```

Defer before any `fetch` / Discord API call. Do not put DPS/HPS math here — `src/format/stats.ts`.
