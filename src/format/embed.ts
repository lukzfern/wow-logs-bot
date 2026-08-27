import { EmbedBuilder } from 'discord.js';
import type { WLLogDetail } from '../types.js';
import type { EmojiMap } from '../emoji.js';
import { FALLBACK_EMOJIS } from '../emoji.js';
import { fmtK, fmtDuration, spanishDateTime, truncate, primaryDifficulty } from './utils.js';
import { extractPresence, extractTopDps, extractTopHps, extractDeaths, extractInterrupts, groupEncounters, extractConsumables } from './stats.js';

function playerLabel(e: EmojiMap, name: string, cls: string, spec: string): string {
  const specIcon = spec ? e.spec(cls, spec) : '';
  if (specIcon) return `${specIcon} ${name}`;
  const classIcon = e.cls(cls);
  if (classIcon) return `${classIcon} ${name} (${spec || cls})`;
  return `${name} (${cls}${spec ? ` · ${spec}` : ''})`;
}

function footerText(logId: number, guildName?: string, altLogIds?: number[]): string {
  let text = `${guildName ?? 'wow-logs.co.in'} · Log #${logId}`;
  if (altLogIds?.length) {
    text += ` · Alt: ${altLogIds.map(id => `#${id}`).join(', ')}`;
  }
  return text;
}

export function threadTitle(log: WLLogDetail): string {
  const diff = primaryDifficulty(log.fights);
  const raidStart = log.fights[0]?.start ?? log.uploadedAt;
  const sizeLabel = diff || String(log.size);
  return `${log.raid.name} ${sizeLabel} — ${spanishDateTime(raidStart)}`;
}

export function buildLogEmbed(log: WLLogDetail, emojis?: EmojiMap, guildName?: string, altLogIds?: number[]): EmbedBuilder {
  const e = emojis ?? FALLBACK_EMOJIS;
  const bossFights = log.fights.filter(f => f.boss);
  const kills = bossFights.filter(f => f.kill).length;
  const wipes = bossFights.filter(f => !f.kill).length;
  const diff = primaryDifficulty(log.fights);
  const raidStart = log.fights[0]?.start ?? log.uploadedAt;
  const lastFight = log.fights[log.fights.length - 1];
  const wallClockSec = lastFight
    ? Math.round((new Date(lastFight.start).getTime() + lastFight.durationSec * 1000 - new Date(raidStart).getTime()) / 1000)
    : 0;

  const color = wipes === 0 ? 0x2ecc71 : kills === 0 ? 0xe74c3c : 0xf39c12;

  const embed = new EmbedBuilder()
    .setTitle(`📜 ${log.raid.name} ${diff || log.size}`.trim())
    .setURL(log.logUrl)
    .setColor(color)
    .setDescription(
      `${spanishDateTime(raidStart)} · **${kills} kills** · **${wipes} wipes** · ⏱️ ${fmtDuration(wallClockSec)}`,
    )
    .setFooter({ text: footerText(log.logId, guildName, altLogIds) })
    .setTimestamp(new Date(log.uploadedAt));

  // ── Encounters ──
  const encounters = groupEncounters(bossFights);
  if (encounters.length) {
    const lines = encounters.map(row => {
      if (row.kill) {
        const wipeSuffix = row.wipeCount > 0 ? ` (${row.wipeCount} wipe${row.wipeCount > 1 ? 's' : ''})` : '';
        return `✅ ${row.bossName} — ${fmtDuration(row.durationSec)}${wipeSuffix}`;
      }
      const wipeSuffix = row.wipeCount > 1 ? ` (${row.wipeCount} wipes)` : '';
      return `❌ ${row.bossName}${wipeSuffix} — ${fmtDuration(row.durationSec)}`;
    });
    embed.addFields({ name: `${e.section('encounters', '⚔️')} Encuentros`, value: truncate(lines.join('\n'), 1024) });
  }

  // ── Top DPS ──
  const killFights = bossFights.filter(f => f.kill && f.players?.length);
  const presence = extractPresence(killFights);
  // Players must be present in all-but-one kill fight to qualify for leaderboards
  const minFights = Math.max(killFights.length - 1, 1);
  const topDps = extractTopDps(killFights, presence, minFights);
  if (topDps.length) {
    embed.addFields({
      name: `${e.section('dps', '🗡️')} Top DPS (promedio)`,
      value: topDps.map((p, i) => `**${i + 1}.** ${playerLabel(e, p.name, p.cls, p.spec)} — ${fmtK(p.value)}`).join('\n'),
      inline: true,
    });
  }

  // ── Top HPS ──
  const topHps = extractTopHps(killFights, presence, minFights);
  if (topHps.length) {
    embed.addFields({
      name: `${e.section('healer', '💚')} Top HPS (promedio)`,
      value: topHps.map((p, i) => `**${i + 1}.** ${playerLabel(e, p.name, p.cls, p.spec)} — ${fmtK(p.value)}`).join('\n'),
      inline: true,
    });
  }

  // ── Consumables ──
  const cons = extractConsumables(killFights);
  if (cons) {
    const pct = (n: number) => Math.round((n / cons.total) * 100);
    embed.addFields({
      name: `${e.section('consumables', '🧪')} Consumibles`,
      value: `Flask: **${cons.flask}/${cons.total}** (${pct(cons.flask)}%) · Food: **${cons.food}/${cons.total}** (${pct(cons.food)}%) · Prepot: **${cons.prepot}/${cons.total}** (${pct(cons.prepot)}%)`,
    });
  }

  // ── Deaths ──
  const deaths = extractDeaths(bossFights);
  if (deaths.length) {
    embed.addFields({
      name: `${e.section('deaths', '💀')} Muertes`,
      value: truncate(deaths.map(d => `${d.name} (${d.count})`).join(' · '), 1024),
    });
  }

  // ── Interrupts ──
  const interrupts = extractInterrupts(bossFights);
  if (interrupts.length) {
    embed.addFields({
      name: `${e.section('interrupts', '🛡️')} Interrupts`,
      value: interrupts.map(i => `${i.name} (${i.count})`).join(' · '),
    });
  }

  return embed;
}
