export interface WLRaid {
  id: number;
  slug: string;
  name: string;
}

export interface WLConsumables {
  potionsUsed: number;
  healthstonesUsed: number;
  flaskActive: boolean;
  elixirActive: boolean;
  flaskUptime: number | null;
  foodBuff: boolean;
  hadPrepot: boolean;
}

export interface WLPlayer {
  name: string;
  class: string;
  spec: string | null;
  role: 'DPS' | 'HEALER';
  dps: number;
  hps: number;
  damage: number;
  healing: number;
  deaths: number | null;
  damageTaken: number;
  activity: number | null;
  overhealing: number | null;
  biggestHit: number | null;
  consumables?: WLConsumables;
  interrupts?: number;
}

export interface WLFight {
  fightId: number;
  encounter: string;
  boss: boolean;
  bossId: number;
  bossName: string;
  kill: boolean;
  start: string;
  durationSec: number;
  difficulty: string;
  players: WLPlayer[];
}

// Two logs are from the same raid if same raid+size and first fight within this window
export const DEDUP_WINDOW_MS = 30 * 60 * 1000;

export interface WLLogMeta {
  logId: number;
  logUrl: string;
  title: string;
  uploadedAt: string;
  server: { slug: string; name: string; serverName: string };
  raid: WLRaid;
  size: number;
}

export interface WLLogDetail extends WLLogMeta {
  fights: WLFight[];
}

export interface WLGuild {
  id: number;
  name: string;
  realm: { slug: string; name: string };
}

export interface RateInfo {
  limit: number;
  remaining: number;
  cost: number;
  monthlyLimit: number;
  monthlyRemaining: number;
}
