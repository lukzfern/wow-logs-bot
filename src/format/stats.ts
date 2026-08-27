import type { WLFight, WLPlayer } from '../types.js';

export interface PlayerStat {
  name: string;
  value: number;
  cls: string;
  spec: string;
}

export interface EncounterRow {
  bossName: string;
  kill: boolean;
  durationSec: number;
  wipeCount: number;
}

export function extractPresence(killFights: WLFight[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const fight of killFights) {
    for (const p of fight.players ?? []) {
      map.set(p.name, (map.get(p.name) ?? 0) + 1);
    }
  }
  return map;
}

export function extractTopDps(killFights: WLFight[], presence: Map<string, number>, minFights: number, limit = 5): PlayerStat[] {
  const map = new Map<string, { total: number; count: number; cls: string; spec: string }>();
  for (const fight of killFights) {
    for (const p of fight.players) {
      if (p.role !== 'DPS') continue;
      const cur = map.get(p.name) ?? { total: 0, count: 0, cls: p.class, spec: p.spec ?? '' };
      cur.total += p.dps;
      cur.count += 1;
      map.set(p.name, cur);
    }
  }
  return [...map.entries()]
    .filter(([name]) => (presence.get(name) ?? 0) >= minFights)
    .map(([name, { total, count, cls, spec }]) => ({ name, value: total / count, cls, spec }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function extractTopHps(killFights: WLFight[], presence: Map<string, number>, minFights: number, limit = 3): PlayerStat[] {
  const map = new Map<string, { total: number; count: number; cls: string; spec: string }>();
  for (const fight of killFights) {
    for (const p of fight.players) {
      if (p.role !== 'HEALER') continue;
      const cur = map.get(p.name) ?? { total: 0, count: 0, cls: p.class, spec: p.spec ?? '' };
      cur.total += p.hps;
      cur.count += 1;
      map.set(p.name, cur);
    }
  }
  return [...map.entries()]
    .filter(([name]) => (presence.get(name) ?? 0) >= minFights)
    .map(([name, { total, count, cls, spec }]) => ({ name, value: total / count, cls, spec }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function extractDeaths(bossFights: WLFight[], limit = 8): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const f of bossFights) {
    for (const p of f.players ?? []) {
      // API counts Hunter Feign Death as a real death
      if (p.deaths && p.deaths > 0 && p.class !== 'Hunter') {
        map.set(p.name, (map.get(p.name) ?? 0) + p.deaths);
      }
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function extractInterrupts(bossFights: WLFight[], limit = 5): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const f of bossFights) {
    for (const p of f.players ?? []) {
      if (p.interrupts && p.interrupts > 0) {
        map.set(p.name, (map.get(p.name) ?? 0) + p.interrupts);
      }
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function groupEncounters(bossFights: WLFight[]): EncounterRow[] {
  const summary = new Map<string, { kill: WLFight | null; wipes: WLFight[] }>();
  for (const f of bossFights) {
    const entry = summary.get(f.bossName) ?? { kill: null, wipes: [] };
    if (f.kill) entry.kill = f;
    else entry.wipes.push(f);
    summary.set(f.bossName, entry);
  }
  const rows: EncounterRow[] = [];
  for (const [bossName, { kill, wipes }] of summary) {
    if (kill) {
      rows.push({ bossName, kill: true, durationSec: kill.durationSec, wipeCount: wipes.length });
    } else if (wipes.length) {
      const last = wipes[wipes.length - 1];
      rows.push({ bossName, kill: false, durationSec: last.durationSec, wipeCount: wipes.length });
    }
  }
  return rows;
}

export function extractConsumables(killFights: WLFight[]): { total: number; flask: number; food: number; prepot: number } | null {
  const fight = killFights.find(f => f.players.some(p => p.consumables));
  if (!fight) return null;
  const ps = fight.players.filter(p => p.consumables);
  const total = ps.length;
  const flask = ps.filter(p => p.consumables!.flaskActive).length;
  const food = ps.filter(p => p.consumables!.foodBuff).length;
  const prepot = ps.filter(p => p.consumables!.hadPrepot).length;
  const potions = ps.reduce((s, p) => s + (p.consumables!.potionsUsed ?? 0), 0);
  if (flask === 0 && food === 0 && prepot === 0 && potions === 0) return null;
  return { total, flask, food, prepot };
}
