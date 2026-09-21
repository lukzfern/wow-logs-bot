import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, InteractionContextType, type ChatInputCommandInteraction } from 'discord.js';
import { friendlyError } from '../../../errors.js';
import { resolveEmojis } from '../../../emoji.js';
import { getGuildConfig } from '../../../store.js';
import { loadWeeklyGoats, weekGoats, type GoatsSizeFilter } from '../aggregate.js';
import { buildGoatsEmbed } from '../embed.js';
import { applyGoatsScenario, GOATS_SCENARIOS, type GoatsScenarioId } from '../scenarios.js';
import { recordWeek } from '../store.js';

export const definition = new SlashCommandBuilder()
  .setName('goats')
  .setDescription('Goats de la semana — top 3 DPS y top 2 heals entre las 2 raids')
  .addIntegerOption(o => o
    .setName('raids')
    .setDescription('Cuántas raids recientes (default 2)')
    .setMinValue(1)
    .setMaxValue(4))
  .addStringOption(o => o
    .setName('tamaño')
    .setDescription('Tamaño (default: el del último log, para no mezclar 25 con 10)')
    .addChoices(
      { name: 'Mismo que el último', value: 'auto' },
      { name: '25', value: '25' },
      { name: '10', value: '10' },
      { name: 'Todas', value: 'all' },
    ))
  .addStringOption(o => o
    .setName('escenario')
    .setDescription('Prueba de embed (solo vos lo ves, no guarda racha)')
    .addChoices(...GOATS_SCENARIOS.map(s => ({ name: s.name, value: s.id }))))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const cfg = getGuildConfig(interaction.guildId!);
  if (!cfg) {
    await interaction.reply({ content: '❌ Usá `/setup` primero para configurar la guild.', flags: MessageFlags.Ephemeral });
    return;
  }

  const raidCount = interaction.options.getInteger('raids') ?? 2;
  const sizeOpt = interaction.options.getString('tamaño');
  const size: GoatsSizeFilter | undefined = sizeOpt === 'all'
    ? 'all'
    : sizeOpt === '25' || sizeOpt === '10'
      ? Number(sizeOpt)
      : undefined;
  const escenario = interaction.options.getString('escenario') as GoatsScenarioId | null;
  await interaction.deferReply({ flags: escenario ? MessageFlags.Ephemeral : undefined });

  try {
    const loaded = await loadWeeklyGoats(cfg.realm, cfg.guild, raidCount, size);
    if (!loaded.nights.length) {
      await interaction.editReply('No encontré raids recientes en wow-logs.');
      return;
    }
    const data = escenario ? applyGoatsScenario(loaded, escenario) : loaded;
    if (!escenario) {
      const goats = weekGoats(data);
      data.streaks = recordWeek(interaction.guildId!, {
        weekId: data.weekId,
        logIds: data.nights.map(n => n.raid.log.logId),
        goats: goats.map(g => ({ name: g.name, role: g.role, weekday: g.weekday, cls: g.cls, spec: g.spec })),
      }, goats);
    }
    const emojis = resolveEmojis(interaction.guild);
    await interaction.editReply({ embeds: [buildGoatsEmbed(data, emojis)] });
    console.log(`[goats] ${cfg.realm}/${cfg.guild} week=${data.weekId} preview=${escenario ?? 'live'} nights=${data.nights.length}`);
  } catch (err) {
    await interaction.editReply(friendlyError(err));
  }
}
