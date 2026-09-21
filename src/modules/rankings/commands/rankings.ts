import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, InteractionContextType, type ChatInputCommandInteraction } from 'discord.js';
import { api } from '../../../api.js';
import { WowLogsApiError, friendlyError } from '../../../errors.js';
import { resolveEmojis } from '../../../emoji.js';
import { getGuildConfig } from '../../../store.js';
import { buildRankingsEmbed } from '../embed.js';

export const definition = new SlashCommandBuilder()
  .setName('rankings')
  .setDescription('Rankings de Boss Points de la guild')
  .addStringOption(o => o.setName('raid').setDescription('Raid (default: fase activa del realm)').addChoices(
    { name: 'Naxxramas', value: 'naxx' },
    { name: 'Ulduar', value: 'ulduar' },
    { name: 'Trial of the Crusader', value: 'toc' },
    { name: 'Icecrown Citadel', value: 'icc' },
  ))
  .addIntegerOption(o => o.setName('temporada').setDescription('Temporada (default: activa del realm)').setMinValue(1).setMaxValue(20))
  .addStringOption(o => o.setName('dificultad').setDescription('Dificultad (default: 25 HC)').addChoices(
    { name: '25 HC', value: '25-hc' },
    { name: '25 NM', value: '25-nm' },
    { name: '10 HC', value: '10-hc' },
    { name: '10 NM', value: '10-nm' },
  ))
  .addStringOption(o => o.setName('ladder').setDescription('Ladder (default: Regular)').addChoices(
    { name: 'Regular', value: 'regular' },
    { name: 'Competitive', value: 'competitive' },
    { name: 'Hardcore', value: 'hardcore' },
  ))
  .addIntegerOption(o => o.setName('cantidad').setDescription('Jugadores a mostrar (default 10, max 10)').setMinValue(5).setMaxValue(10))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const cfg = getGuildConfig(interaction.guildId!);
  if (!cfg) {
    await interaction.reply({ content: '❌ Usá `/setup` primero para configurar la guild.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply();

  const difficulty = interaction.options.getString('dificultad') ?? '25-hc';
  const ladder = interaction.options.getString('ladder') ?? 'regular';
  const limit = interaction.options.getInteger('cantidad') ?? 10;
  let raid = interaction.options.getString('raid');
  let season = interaction.options.getInteger('temporada');

  try {
    if (!raid || season == null) {
      const { servers } = await api.metaServers();
      const server = servers.find(s => s.slug === cfg.realm);
      if (!server) {
        await interaction.editReply(`❌ No encontré el realm \`${cfg.realm}\` en wow-logs.`);
        return;
      }
      const { server: seasonInfo } = await api.metaSeason(server.id);
      raid = raid ?? seasonInfo.rankingRaid.slug;
      season = season ?? seasonInfo.activeSeason;
    }

    const data = await api.guildRankings(cfg.realm, cfg.guild, {
      raid,
      season,
      difficulty,
      ladder,
    });
    const emojis = resolveEmojis(interaction.guild);
    await interaction.editReply({ embeds: [buildRankingsEmbed(data, limit, emojis)] });
  } catch (err) {
    if (err instanceof WowLogsApiError && err.status === 404) {
      await interaction.editReply(
        `❌ ${err.message}\nSi no pasaste raid/temporada, usá los defaults o el raid de la fase activa del realm.`,
      );
      return;
    }
    await interaction.editReply(friendlyError(err));
  }
}
