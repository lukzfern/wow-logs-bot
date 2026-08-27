import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { api } from '../api.js';
import { friendlyError } from '../errors.js';
import { getGuildConfig } from '../store.js';

export const definition = new SlashCommandBuilder()
  .setName('logs')
  .setDescription('Listar últimos logs')
  .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad (default 5, max 25)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const cfg = getGuildConfig(interaction.guildId!);
  if (!cfg) {
    await interaction.reply({ content: '❌ Usá `/setup` primero para configurar la guild.', flags: MessageFlags.Ephemeral });
    return;
  }

  const limit = Math.min(Math.max(interaction.options.getInteger('cantidad') ?? 5, 1), 25);
  await interaction.deferReply();

  try {
    const { logs } = await api.guildLogs(cfg.realm, cfg.guild, limit);
    if (!logs.length) {
      await interaction.editReply('No se encontraron logs.');
      return;
    }

    const lines = logs.map(l => {
      const d = new Date(l.uploadedAt);
      const date = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `**${l.title}** (${l.raid.name} ${l.size}) — ${date}\n> ${l.logUrl}`;
    });
    await interaction.editReply(lines.join('\n\n'));
  } catch (err) {
    await interaction.editReply(friendlyError(err));
  }
}
