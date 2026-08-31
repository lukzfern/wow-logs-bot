import { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { api } from '../api.js';
import { setGuildConfig, type GuildConfig } from '../store.js';

export const definition = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configurar guild y canal para logs automáticos')
  .addStringOption(o => o.setName('realm').setDescription('Realm slug (ej: wow-patagonia)').setRequired(true))
  .addStringOption(o => o.setName('guild').setDescription('Guild name en wow-logs (ej: Serenity)').setRequired(true))
  .addChannelOption(o => o.setName('channel').setDescription('Canal o thread donde postear logs').addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread).setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const realm = interaction.options.getString('realm', true);
  const guild = interaction.options.getString('guild', true);
  const channel = interaction.options.getChannel('channel', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await api.guildLogs(realm, guild, 1);
  } catch {
    await interaction.editReply(`❌ No se encontró **${guild}** en **${realm}**. Verificá que la guild sea pública en wow-logs.co.in`);
    return;
  }

  const isThread = channel.type === ChannelType.PublicThread || channel.type === ChannelType.PrivateThread;
  const cfg: GuildConfig = { realm, guild, channelId: channel.id, lastLogId: null, useThreads: !isThread };
  setGuildConfig(interaction.guildId!, cfg);

  const mode = isThread ? 'Mensajes en thread existente' : 'Thread nuevo por log';
  await interaction.editReply(
    `✅ Configurado!\n` +
    `**Guild:** ${guild} @ ${realm}\n` +
    `**Canal:** <#${channel.id}>\n` +
    `**Modo:** ${mode}\n\n` +
    `Los nuevos logs se publicarán automáticamente.`,
  );
}
