import { SlashCommandBuilder, ChannelType, ThreadAutoArchiveDuration, MessageFlags, PermissionFlagsBits, InteractionContextType, type ChatInputCommandInteraction, type TextChannel } from 'discord.js';
import { api } from '../api.js';
import { friendlyError } from '../errors.js';
import { resolveEmojis } from '../emoji.js';
import { getGuildConfig } from '../store.js';
import { buildLogEmbed, threadTitle } from '../format/index.js';

export const definition = new SlashCommandBuilder()
  .setName('preview')
  .setDescription('Vista previa de un log (para testear sin esperar un upload)')
  .addStringOption(o => o.setName('log').setDescription('Log ID o link (ej: 29243 o https://wow-logs.co.in/29243)').setRequired(true))
  .addBooleanOption(o => o.setName('thread').setDescription('Crear thread como haría el auto-post (default: no)'))
  .addStringOption(o => o.setName('alts').setDescription('IDs de logs alternativos separados por coma (ej: 29991,29990)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild);

function parseLogId(input: string): number | null {
  const match = input.match(/(\d+)\s*$/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return Number.isFinite(id) ? id : null;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const cfg = getGuildConfig(interaction.guildId!);
  if (!cfg) {
    await interaction.reply({ content: '❌ Usá `/setup` primero para configurar la guild.', flags: MessageFlags.Ephemeral });
    return;
  }

  const raw = interaction.options.getString('log', true);
  const logId = parseLogId(raw);
  if (!logId) {
    await interaction.reply({ content: '❌ No pude extraer un Log ID. Pasá el número o el link completo.', flags: MessageFlags.Ephemeral });
    return;
  }

  const createThread = interaction.options.getBoolean('thread') ?? false;
  const altsRaw = interaction.options.getString('alts') ?? '';
  const altIds = altsRaw.split(',').map(s => parseLogId(s.trim())).filter((id): id is number => id !== null);
  await interaction.deferReply({ flags: !createThread ? MessageFlags.Ephemeral : undefined });

  let log;
  let guildName: string | undefined;
  try {
    const res = await api.guildLogDetail(cfg.realm, cfg.guild, logId);
    log = res.log;
    guildName = res.guild.name;
  } catch (err) {
    await interaction.editReply(friendlyError(err));
    return;
  }
  const emojis = resolveEmojis(interaction.guild);
  const embed = buildLogEmbed(log, emojis, guildName, altIds.length ? altIds : undefined);

  if (createThread) {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.editReply('❌ Este comando necesita un canal de texto para crear threads.');
      return;
    }

    try {
      const title = `🧪 ${threadTitle(log)}`;
      const thread = await (channel as TextChannel).threads.create({
        name: title.slice(0, 100),
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      });
      await thread.send({ embeds: [embed] });
      await interaction.editReply(`✅ Thread de prueba creado: <#${thread.id}>`);
    } catch {
      await interaction.editReply('❌ No se pudo crear el thread. Verificá que el bot tenga permisos para crear threads en este canal.');
    }
  } else {
    await interaction.editReply({ content: `**🧪 Preview — Log #${logId}**`, embeds: [embed] });
  }
}
