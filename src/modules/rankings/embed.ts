import { EmbedBuilder } from 'discord.js';
import type { WLRankings } from '../../types.js';
import type { EmojiMap } from '../../emoji.js';
import { FALLBACK_EMOJIS } from '../../emoji.js';
import { playerBossCoverage, rankedBossNames } from './eligible-bosses.js';

const FIELD_MAX = 1024;

function joinFieldLines(lines: string[]): string {
  const kept: string[] = [];
  let size = 0;
  for (const line of lines) {
    const next = kept.length === 0 ? line.length : size + 1 + line.length;
    if (next > FIELD_MAX) break;
    kept.push(line);
    size = next;
  }
  return kept.join('\n') || lines[0]?.slice(0, FIELD_MAX - 1) + '…';
}

const LADDER_LABEL: Record<string, string> = {
  regular: 'Regular',
  competitive: 'Competitive',
  hardcore: 'Hardcore',
};

const RAID_ICONS: Record<string, string> = {
  ulduar: 'achievement_boss_algalon_01',
  icc: 'achievement_boss_lichking',
  toc: 'achievement_boss_anubarak',
  naxx: 'achievement_boss_kelthuzad_01',
};

function playerLine(e: EmojiMap, rank: number, name: string, cls: string, spec: string | null, pct: number, pts: number, parsed: number, bosses: number, hardmode: boolean): string {
  const icon = (spec ? e.spec(cls, spec) : '') || e.cls(cls);
  const label = icon ? `${icon} ${name}` : `${name} (${cls})`;
  const coverage = hardmode ? `${parsed}/${bosses} HM` : `${parsed}/${bosses}`;
  return `**${rank}.** ${label} — **${pct.toFixed(1)}%** · ${Math.round(pts)} pts · ${coverage}`;
}

export function buildRankingsEmbed(data: WLRankings, limit: number, emojis?: EmojiMap): EmbedBuilder {
  const e = emojis ?? FALLBACK_EMOJIS;
  const { filters, rankings, guild } = data;
  const scored = rankings.players.filter(p => p.bossPoints > 0 || p.averagePercent > 0);
  const top = scored.slice(0, limit);
  const { bosses: rankedBosses, hardmode } = rankedBossNames(data);

  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${filters.raid.name} ${filters.difficulty.label}`)
    .setColor(0xf1c40f)
    .setDescription(
      `**${guild.name}** · Temporada ${filters.season} · ${LADDER_LABEL[filters.ladder] ?? filters.ladder}`,
    )
    .setFooter({ text: `${guild.name} · Boss Points V2 · Top ${top.length}/${scored.length}` });

  const iconName = RAID_ICONS[filters.raid.slug];
  if (iconName) {
    embed.setThumbnail(`https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg`);
  }

  if (!top.length) {
    embed.addFields({ name: 'Rankings', value: 'Nadie tiene parses en esta combinación de raid / temporada / dificultad.' });
    return embed;
  }

  const lines = top.map((p, i) => {
    const { parsed, total } = playerBossCoverage(p, rankedBosses);
    return playerLine(e, i + 1, p.name, p.class, p.spec, p.averagePercent, p.bossPoints, parsed, total, hardmode);
  });
  embed.addFields({ name: 'Jugadores', value: joinFieldLines(lines) });
  return embed;
}
