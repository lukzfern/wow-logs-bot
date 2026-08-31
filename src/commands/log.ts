import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, InteractionContextType, type ChatInputCommandInteraction } from 'discord.js';
import { api } from '../api.js';
import { friendlyError } from '../errors.js';
import { resolveEmojis } from '../emoji.js';
import { getGuildConfig } from '../store.js';
import { buildLogEmbed } from '../format/index.js';

export const definition = new SlashCommandBuilder()
  .setName('log')
  .setDescription('Mostrar un log específico')
  .addIntegerOption(o => o.setName('id').setDescription('Log ID (número del link)').setRequired(true))
  .addStringOption(o => o.setName('alts').setDescription('IDs de logs alternativos (ej: 29991,29990)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const cfg = getGuildConfig(interaction.guildId!);
  if (!cfg) {
    await interaction.reply({ content: '❌ Usá `/setup` primero para configurar la guild.', flags: MessageFlags.Ephemeral });
    return;
  }

  const logId = interaction.options.getInteger('id', true);
  const altsRaw = interaction.options.getString('alts') ?? '';
  const altIds = altsRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n));
  await interaction.deferReply();
  try {
    const { guild, log } = await api.guildLogDetail(cfg.realm, cfg.guild, logId);
    const emojis = resolveEmojis(interaction.guild);
    await interaction.editReply({ embeds: [buildLogEmbed(log, emojis, guild.name, altIds.length ? altIds : undefined)] });
  } catch (err) {
    await interaction.editReply(friendlyError(err));
  }
}
