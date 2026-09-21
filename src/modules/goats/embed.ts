import { EmbedBuilder } from 'discord.js';
import type { EmojiMap } from '../../emoji.js';
import { FALLBACK_EMOJIS } from '../../emoji.js';
import { fmtK, primaryDifficulty, truncate } from '../../format/index.js';
import { weekdayName, type GoatMark, type NightBoard, type RankedGoat, type WeeklyGoats } from './aggregate.js';

const MEDALS = ['🥇', '🥈', '🥉'];
const RAID_ICONS: Record<string, string> = {
  ulduar: 'achievement_boss_algalon_01',
  icc: 'achievement_boss_lichking',
  toc: 'achievement_boss_anubarak',
  naxx: 'achievement_boss_kelthuzad_01',
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC', weekday: 'short', day: '2-digit', month: '2-digit',
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === t)?.value ?? '';
  const weekday = get('weekday');
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${get('day')}/${get('month')}`;
}

function raidLine(night: NightBoard): string {
  const diff = primaryDifficulty(night.raid.log.fights);
  return `[${shortDate(night.raid.firstFightStart)} · ${night.raid.raidName} ${diff || night.raid.size}](${night.raid.log.logUrl})`;
}

function streakOf(streaks: GoatMark[], name: string, weekday: number, role: 'DPS' | 'HEALER'): number {
  return streaks.find(s =>
    s.name.toLowerCase() === name.toLowerCase() && s.weekday === weekday && s.role === role,
  )?.streak ?? 0;
}

function weekLine(e: EmojiMap, rank: number, p: RankedGoat, streak: number): string {
  const icon = (p.spec ? e.spec(p.cls, p.spec) : '') || e.cls(p.cls);
  const who = icon ? `${icon} **${p.name}**` : `**${p.name}**`;
  const fire = streak >= 2 ? ` · 🔥×${streak}` : '';
  return `${MEDALS[rank] ?? `${rank + 1}.`} ${who} · ${fmtK(p.value)} · ${weekdayName(p.weekday)}${fire}`;
}

function board(e: EmojiMap, rows: RankedGoat[], role: 'DPS' | 'HEALER', streaks: GoatMark[]): string {
  return rows.map((p, i) => weekLine(e, i, p, streakOf(streaks, p.name, p.weekday, role))).join('\n');
}

export function buildGoatsEmbed(data: WeeklyGoats, emojis?: EmojiMap): EmbedBuilder {
  const e = emojis ?? FALLBACK_EMOJIS;
  const n = data.nights.length;
  const embed = new EmbedBuilder()
    .setTitle('🐐 Goats de la semana')
    .setColor(0xf1c40f)
    .setDescription(n ? truncate(data.nights.map(raidLine).join('\n'), 4096) : 'No hay raids recientes.')
    .setFooter({ text: data.preview ? `${data.guildName} · prueba (no se guarda)` : data.guildName });

  const slugs = [...new Set(data.nights.map(x => x.raid.log.raid.slug))];
  const iconName = slugs.length === 1 ? RAID_ICONS[slugs[0]] : undefined;
  if (iconName) {
    embed.setThumbnail(`https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg`);
  }

  if (data.dps.length) {
    embed.addFields({ name: 'DPS', value: truncate(board(e, data.dps, 'DPS', data.streaks), 1024) });
  }
  if (data.hps.length) {
    embed.addFields({ name: 'Heals', value: truncate(board(e, data.hps, 'HEALER', data.streaks), 1024) });
  }

  return embed;
}
