import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { DEDUP_WINDOW_MS } from './types.js';

const STORE_PATH = join(process.cwd(), 'data', 'store.json');

export interface GuildConfig {
  realm: string;
  guild: string;
  channelId: string;
  lastLogId: number | null;
  useThreads: boolean;
}

export interface PostedRaid {
  logId: number;
  raidName: string;
  size: number;
  firstFightStart: string;
  threadId?: string;
  altLogIds: number[];
}

interface StoreData {
  guilds: Record<string, GuildConfig>;
  postedRaids: Record<string, PostedRaid[]>;
}

function load(): StoreData {
  if (!existsSync(STORE_PATH)) return { guilds: {}, postedRaids: {} };
  const data = JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
  if (!data.postedRaids) data.postedRaids = {};
  return data;
}

function save(data: StoreData): void {
  const dir = dirname(STORE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export function getGuildConfig(discordGuildId: string): GuildConfig | null {
  return load().guilds[discordGuildId] ?? null;
}

export function setGuildConfig(discordGuildId: string, cfg: GuildConfig): void {
  const data = load();
  data.guilds[discordGuildId] = cfg;
  save(data);
}

export function updateLastLogId(discordGuildId: string, logId: number): void {
  const data = load();
  const g = data.guilds[discordGuildId];
  if (g) {
    g.lastLogId = logId;
    save(data);
  }
}

export function allConfigs(): [string, GuildConfig][] {
  return Object.entries(load().guilds);
}

export function findMatchingRaid(discordGuildId: string, raidName: string, size: number, firstFightStart: string): PostedRaid | null {
  const raids = load().postedRaids[discordGuildId] ?? [];
  const targetTime = new Date(firstFightStart).getTime();
  return raids.find(r => {
    if (r.raidName !== raidName || r.size !== size) return false;
    const diff = Math.abs(new Date(r.firstFightStart).getTime() - targetTime);
    return diff < DEDUP_WINDOW_MS;
  }) ?? null;
}

export function addPostedRaid(discordGuildId: string, raid: PostedRaid): void {
  const data = load();
  const raids = data.postedRaids[discordGuildId] ?? [];
  raids.push(raid);
  // Keep only last 50 raids to avoid unbounded growth
  if (raids.length > 50) raids.splice(0, raids.length - 50);
  data.postedRaids[discordGuildId] = raids;
  save(data);
}

export function addAltLog(discordGuildId: string, mainLogId: number, altLogId: number): void {
  const data = load();
  const raids = data.postedRaids[discordGuildId] ?? [];
  const raid = raids.find(r => r.logId === mainLogId);
  if (raid && !raid.altLogIds.includes(altLogId)) {
    raid.altLogIds.push(altLogId);
    save(data);
  }
}
