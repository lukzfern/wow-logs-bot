import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { api } from '../api.js';
import { friendlyError } from '../errors.js';
import { getGuildConfig } from '../store.js';

export const definition = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Estado del bot y la API')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const health = await api.health();
    const rate = api.rateInfo;
    const cfg = getGuildConfig(interaction.guildId!);

    let msg = `**API:** ${health.status} · **Tier:** ${health.tier}`;
    if (rate) {
      msg += `\n**RPM:** ${rate.remaining}/${rate.limit} · **Mensual:** ${rate.monthlyRemaining.toLocaleString()}/${rate.monthlyLimit.toLocaleString()}`;
    }
    if (cfg) {
      msg += `\n\n**Guild:** ${cfg.guild} @ ${cfg.realm}`;
      msg += `\n**Canal:** <#${cfg.channelId}> · **Threads:** ${cfg.useThreads ? 'Sí' : 'No'}`;
      msg += `\n**Último log visto:** ${cfg.lastLogId ?? 'ninguno'}`;
    } else {
      msg += '\n\n⚠️ No configurado — usá `/setup`';
    }

    await interaction.editReply(msg);
  } catch (err) {
    await interaction.editReply(friendlyError(err));
  }
}
