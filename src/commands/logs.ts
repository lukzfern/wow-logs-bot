import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { api } from '../api.js';
import { friendlyError } from '../errors.js';
import { resolveEmojis } from '../emoji.js';
import { getGuildConfig } from '../store.js';
import { spanishDate, fmtDuration, fmtK, primaryDifficulty, extractPresence, extractTopDps, extractTopHps } from '../format/index.js';

export const definition = new SlashCommandBuilder()
  .setName('logs')
  .setDescription('Listar últimos logs')
  .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad (default 5, max 10)'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const cfg = getGuildConfig(interaction.guildId!);
  if (!cfg) {
    await interaction.reply({ content: '❌ Usá `/setup` primero para configurar la guild.', flags: MessageFlags.Ephemeral });
    return;
  }

  const limit = Math.min(Math.max(interaction.options.getInteger('cantidad') ?? 5, 1), 10);
  await interaction.deferReply();

  try {
    const { guild, logs } = await api.guildLogs(cfg.realm, cfg.guild, limit);
    if (!logs.length) {
      await interaction.editReply('No se encontraron logs.');
      return;
    }

    const emojis = resolveEmojis(interaction.guild);

    const embeds: EmbedBuilder[] = [];
    for (const l of logs) {
      let date = spanishDate(l.uploadedAt);
      let desc = '';
      let color = 0x3498db;
      let diff = '';

      try {
        const { log } = await api.guildLogDetail(cfg.realm, cfg.guild, l.logId);
        const bossFights = log.fights.filter(f => f.boss);
        const kills = bossFights.filter(f => f.kill).length;
        const wipes = bossFights.filter(f => !f.kill).length;
        diff = primaryDifficulty(log.fights);
        const raidStart = log.fights[0]?.start;
        if (raidStart) date = spanishDate(raidStart);
        const lastFight = log.fights[log.fights.length - 1];
        const wallSec = lastFight && raidStart
          ? Math.round((new Date(lastFight.start).getTime() + lastFight.durationSec * 1000 - new Date(raidStart).getTime()) / 1000)
          : 0;

        desc = `✅ **${kills} kills** · ❌ **${wipes} wipes**`;
        if (wallSec > 0) desc += ` · ⏱️ ${fmtDuration(wallSec)}`;

        const killFights = bossFights.filter(f => f.kill && f.players?.length);
        if (killFights.length) {
          const presence = extractPresence(killFights);
          const minFights = Math.max(killFights.length - 1, 1);
          const topDps = extractTopDps(killFights, presence, minFights, 1);
          const topHps = extractTopHps(killFights, presence, minFights, 1);
          const mvps: string[] = [];
          if (topDps[0]) {
            const icon = emojis.spec(topDps[0].cls, topDps[0].spec) || emojis.cls(topDps[0].cls);
            mvps.push(`${icon} ${topDps[0].name} ${fmtK(topDps[0].value)}`);
          }
          if (topHps[0]) {
            const icon = emojis.spec(topHps[0].cls, topHps[0].spec) || emojis.cls(topHps[0].cls);
            mvps.push(`${icon} ${topHps[0].name} ${fmtK(topHps[0].value)}`);
          }
          if (mvps.length) desc += `\n${mvps.join(' · ')}`;
        }

        color = wipes === 0 ? 0x2ecc71 : kills === 0 ? 0xe74c3c : 0xf39c12;
      } catch (detailErr) {
        console.error(`[logs] Failed detail for #${l.logId}:`, detailErr instanceof Error ? detailErr.message : detailErr);
        desc = `${l.raid.name} ${l.size}`;
      }

      const title = diff
        ? `${l.raid.name} ${diff} — ${date}`
        : `${l.raid.name} ${l.size} — ${date}`;

      const raidIcons: Record<string, string> = {
        ulduar: 'achievement_boss_algalon_01',
        icc: 'achievement_boss_lichking',
        toc: 'achievement_boss_anubarak',
        naxx: 'achievement_boss_kelthuzad_01',
        onyxia: 'achievement_boss_onyxia',
        'obsidian-sanctum': 'achievement_boss_sartharion_01',
        'eye-of-eternity': 'achievement_boss_malygos_01',
        'ruby-sanctum': 'achievement_boss_halion',
        voa: 'achievement_boss_archavon_01',
      };
      const iconName = raidIcons[l.raid.slug];
      const iconUrl = iconName ? `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg` : undefined;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setURL(l.logUrl)
        .setColor(color)
        .setDescription(desc);

      if (iconUrl) embed.setThumbnail(iconUrl);

      embeds.push(embed);
    }

    await interaction.editReply({ embeds });
  } catch (err) {
    await interaction.editReply(friendlyError(err));
  }
}
