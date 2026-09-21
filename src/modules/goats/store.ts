import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { STORE_PATH } from '../../store.js';
import type { GoatMark } from './aggregate.js';

const KEEP_WEEKS = 20;

export interface GoatWeek {
  weekId: string;
  logIds: number[];
  goats: { name: string; role: 'DPS' | 'HEALER'; weekday: number; cls: string; spec: string }[];
}

interface GoatsFile {
  goats?: Record<string, { weeks: GoatWeek[] }>;
}

function loadFile(): Record<string, unknown> {
  if (!existsSync(STORE_PATH)) return {};
  return JSON.parse(readFileSync(STORE_PATH, 'utf-8')) as Record<string, unknown>;
}

function saveFile(data: Record<string, unknown>): void {
  const dir = dirname(STORE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export function prevIsoWeek(weekId: string): string {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return '';
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week > 1) return `${year}-W${String(week - 1).padStart(2, '0')}`;
  const dec28 = new Date(Date.UTC(year - 1, 11, 28));
  const d = new Date(Date.UTC(dec28.getUTCFullYear(), dec28.getUTCMonth(), dec28.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const prev = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(prev).padStart(2, '0')}`;
}

export function recordWeek(discordGuildId: string, week: GoatWeek, current: GoatMark[]): GoatMark[] {
  const data = loadFile();
  const root = ((data as GoatsFile).goats ??= {});
  const guild = (root[discordGuildId] ??= { weeks: [] });
  guild.weeks = guild.weeks.filter(w => w.weekId !== week.weekId);
  guild.weeks.push(week);
  guild.weeks.sort((a, b) => a.weekId.localeCompare(b.weekId));
  if (guild.weeks.length > KEEP_WEEKS) guild.weeks.splice(0, guild.weeks.length - KEEP_WEEKS);
  (data as GoatsFile).goats = root;
  saveFile(data);

  const byWeek = new Map(guild.weeks.map(w => [w.weekId, w]));
  return current
    .map(g => {
      let streak = 1;
      let cursor = prevIsoWeek(week.weekId);
      while (cursor && byWeek.get(cursor)?.goats.some(x =>
        x.name.toLowerCase() === g.name.toLowerCase() && x.weekday === g.weekday && x.role === g.role
      )) {
        streak += 1;
        cursor = prevIsoWeek(cursor);
      }
      return { ...g, streak };
    })
    .filter(g => g.streak >= 2)
    .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name, 'es'));
}
