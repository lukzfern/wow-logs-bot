import { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { api } from '../api.js';
import { setGuildConfig, type GuildConfig } from '../store.js';

export const definition = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configurar guild y canal para logs automáticos')
  .addStringOption(o => o.setName('realm').setDescription('Realm slug (ej: wow-patagonia)').setRequired(true))
  .addStringOption(o => o.setName('guild').setDescription('Guild name en wow-logs (ej: Serenity)').setRequired(true))
  .addChannelOption(o => o.setName('channel').setDescription('Canal donde postear logs').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .addBooleanOption(o => o.setName('threads').setDescription('Crear thread por log (default: sí)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const realm = interaction.options.getString('realm', true);
  const guild = interaction.options.getString('guild', true);
  const channel = interaction.options.getChannel('channel', true);
  const useThreads = interaction.options.getBoolean('threads') ?? true;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await api.guildLogs(realm, guild, 1);
  } catch {
    await interaction.editReply(`❌ No se encontró **${guild}** en **${realm}**. Verificá que la guild sea pública en wow-logs.co.in`);
    return;
  }

  const cfg: GuildConfig = { realm, guild, channelId: channel.id, lastLogId: null, useThreads };
  setGuildConfig(interaction.guildId!, cfg);

  await interaction.editReply(
    `✅ Configurado!\n` +
    `**Guild:** ${guild} @ ${realm}\n` +
    `**Canal:** <#${channel.id}>\n` +
    `**Threads:** ${useThreads ? 'Sí' : 'No'}\n\n` +
    `Los nuevos logs se publicarán automáticamente.`,
  );
}
