import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { STORE_PATH } from '../../store.js';

export type RosterRoleMode = 'replace' | 'add';

export interface RosterRolePreset {
  name: string;
  roleId: string;
  mode: RosterRoleMode;
}

interface RosterRoleFile {
  rosterRole?: Record<string, { presets: Record<string, RosterRolePreset> }>;
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

function guildSlice(data: Record<string, unknown>, discordGuildId: string): { presets: Record<string, RosterRolePreset> } {
  const root = (data as RosterRoleFile).rosterRole ?? {};
  return root[discordGuildId] ?? { presets: {} };
}

export function getPreset(discordGuildId: string, name: string): RosterRolePreset | null {
  const data = loadFile();
  return guildSlice(data, discordGuildId).presets[name.toLowerCase()] ?? null;
}

export function setPreset(discordGuildId: string, preset: RosterRolePreset): void {
  const data = loadFile();
  const root = ((data as RosterRoleFile).rosterRole ??= {});
  const guild = (root[discordGuildId] ??= { presets: {} });
  guild.presets[preset.name.toLowerCase()] = { ...preset, name: preset.name.toLowerCase() };
  (data as RosterRoleFile).rosterRole = root;
  saveFile(data);
}

export function listPresets(discordGuildId: string): RosterRolePreset[] {
  return Object.values(guildSlice(loadFile(), discordGuildId).presets);
}
