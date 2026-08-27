import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { api } from '../api.js';
import { friendlyError } from '../errors.js';
import { resolveEmojis } from '../emoji.js';
import { getGuildConfig } from '../store.js';
import { buildLogEmbed } from '../format/index.js';

export const definition = new SlashCommandBuilder()
  .setName('latestlog')
  .setDescription('Mostrar el último log de la guild')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const cfg = getGuildConfig(interaction.guildId!);
  if (!cfg) {
    await interaction.reply({ content: '❌ Usá `/setup` primero para configurar la guild.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply();
  try {
    const { guild, log } = await api.guildLogDetail(cfg.realm, cfg.guild, 'latest');
    const emojis = resolveEmojis(interaction.guild);
    await interaction.editReply({ embeds: [buildLogEmbed(log, emojis, guild.name)] });
  } catch (err) {
    await interaction.editReply(friendlyError(err));
  }
}
