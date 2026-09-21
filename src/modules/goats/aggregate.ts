import { api } from '../../api.js';
import { extractPresence, extractTopDps, extractTopHps } from '../../format/index.js';
import type { PlayerStat } from '../../format/stats.js';
import { DEDUP_WINDOW_MS, type WLLogDetail } from '../../types.js';

const LIST_LIMIT = 10;
const WEEK_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

export interface RaidSession {
  log: WLLogDetail;
  raidName: string;
  size: number;
  firstFightStart: string;
  killCount: number;
}

export interface NightBoard {
  raid: RaidSession;
  dps: PlayerStat[];
  hps: PlayerStat[];
}

export interface GoatMark {
  name: string;
  cls: string;
  spec: string;
  role: 'DPS' | 'HEALER';
  weekday: number;
  streak: number;
}

export interface RankedGoat extends PlayerStat {
  weekday: number;
}

export interface WeeklyGoats {
  guildName: string;
  weekId: string;
  nights: NightBoard[];
  dps: RankedGoat[];
  hps: RankedGoat[];
  streaks: GoatMark[];
  preview?: boolean;
}

const NIGHT_BOARD = 40;
const WEEK_DPS = 3;
const WEEK_HPS = 2;

export type GoatsSizeFilter = number | 'all';

function raidSignature(log: WLLogDetail): { raidName: string; size: number; firstFightStart: string; killCount: number } {
  const bossFights = log.fights.filter(f => f.boss);
  return {
    raidName: log.raid.name,
    size: log.size,
    firstFightStart: bossFights[0]?.start ?? log.uploadedAt,
    killCount: bossFights.filter(f => f.kill).length,
  };
}

function sameSession(a: ReturnType<typeof raidSignature>, b: ReturnType<typeof raidSignature>): boolean {
  if (a.raidName !== b.raidName || a.size !== b.size) return false;
  return Math.abs(new Date(a.firstFightStart).getTime() - new Date(b.firstFightStart).getTime()) < DEDUP_WINDOW_MS;
}

function pickBestLogs(details: WLLogDetail[]): RaidSession[] {
  const sessions: RaidSession[] = [];
  const used = new Set<number>();

  for (const log of details) {
    if (used.has(log.logId)) continue;
    const sig = raidSignature(log);
    const group = details.filter(other => !used.has(other.logId) && sameSession(sig, raidSignature(other)));
    group.sort((a, b) => raidSignature(b).killCount - raidSignature(a).killCount || b.logId - a.logId);
    const best = group[0];
    sessions.push({ log: best, ...raidSignature(best) });
    for (const item of group) used.add(item.logId);
  }

  return sessions.sort((a, b) => new Date(a.firstFightStart).getTime() - new Date(b.firstFightStart).getTime());
}

function nightBoard(raid: RaidSession): NightBoard {
  const killFights = raid.log.fights.filter(f => f.boss && f.kill && f.players?.length);
  if (!killFights.length) return { raid, dps: [], hps: [] };
  const presence = extractPresence(killFights);
  const minFights = Math.max(killFights.length - 1, 1);
  return {
    raid,
    dps: extractTopDps(killFights, presence, minFights, NIGHT_BOARD),
    hps: extractTopHps(killFights, presence, minFights, NIGHT_BOARD),
  };
}

function combine(nights: NightBoard[], role: 'DPS' | 'HEALER', limit: number): RankedGoat[] {
  const rows: RankedGoat[] = [];
  for (const night of nights) {
    const weekday = raidWeekday(night.raid.firstFightStart);
    for (const p of role === 'DPS' ? night.dps : night.hps) {
      rows.push({ ...p, weekday });
    }
  }
  return rows.sort((a, b) => b.value - a.value).slice(0, limit);
}

export function raidWeekday(iso: string): number {
  return new Date(iso).getUTCDay();
}

export function weekdayName(weekday: number): string {
  return ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][weekday] ?? '';
}

export function weekGoats(data: WeeklyGoats): GoatMark[] {
  return [
    ...data.dps.map(p => ({ name: p.name, cls: p.cls, spec: p.spec, role: 'DPS' as const, weekday: p.weekday, streak: 1 })),
    ...data.hps.map(p => ({ name: p.name, cls: p.cls, spec: p.spec, role: 'HEALER' as const, weekday: p.weekday, streak: 1 })),
  ];
}

/** ISO week from the fight timestamp as-is (Z is uploader local). */
export function isoWeekId(iso: string): string {
  const d = new Date(iso);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function loadWeeklyGoats(
  realm: string,
  guild: string,
  raidCount: number,
  size?: GoatsSizeFilter,
): Promise<WeeklyGoats> {
  const { guild: wlGuild, logs } = await api.guildLogs(realm, guild, LIST_LIMIT);
  const details: WLLogDetail[] = [];
  for (const meta of logs) {
    try {
      const { log } = await api.guildLogDetail(realm, guild, meta.logId);
      details.push(log);
    } catch (err) {
      console.error(`[goats] Failed log #${meta.logId}:`, err instanceof Error ? err.message : err);
    }
  }

  const sessions = pickBestLogs(details);
  const newest = sessions[sessions.length - 1];
  const wantSize = size === 'all' ? undefined : size ?? newest?.size;
  const sized = sessions.filter(s => wantSize == null || s.size === wantSize);
  const newestStart = sized.length ? new Date(sized[sized.length - 1].firstFightStart).getTime() : 0;
  const raids = sized
    .filter(s => newestStart - new Date(s.firstFightStart).getTime() <= WEEK_WINDOW_MS)
    .slice(-raidCount);

  const nights = raids.map(nightBoard);
  const weekId = raids.length ? isoWeekId(raids[raids.length - 1].firstFightStart) : '';
  return {
    guildName: wlGuild.name,
    weekId,
    nights,
    dps: combine(nights, 'DPS', WEEK_DPS),
    hps: combine(nights, 'HEALER', WEEK_HPS),
    streaks: [],
  };
}
