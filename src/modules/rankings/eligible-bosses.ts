import type { WLRankingPlayer, WLRankings } from '../../types.js';

/**
 * Official wow-logs Ulduar rules — these never appear on player ranking tables.
 * Hodir is excluded from All-Star / Boss Points (confirmed on live profiles).
 */
const ULDUAR_EXCLUDED = new Set([
  'Flame Leviathan',
  'General Vezax',
  'Hodir',
]);

/** Encounter detection is unreliable — excluded from rankings on this realm only. */
const ULDUAR_EXCLUDED_BY_REALM: Record<string, Set<string>> = {
  'wow-patagonia': new Set(['Mimiron']),
};

/**
 * Ulduar hardmodes that are actually scored on 10/25 HC ladders.
 * A null here means "no parse qualifies for this ladder" (buffs/trinkets/externals),
 * not "the guild never killed the boss". Thorim Hardcore is the usual example
 * (Aura of Celerity disqualifies Hardcore only).
 */
const ULDUAR_HARDMODE = [
  'XT-002 Deconstructor',
  'Assembly of Iron',
  'Thorim',
  'Freya',
  'Yogg-Saron',
] as const;

function isHeroic(difficultyId: string): boolean {
  return difficultyId.endsWith('-hc');
}

function excludedOnRealm(boss: string, realmSlug: string): boolean {
  if (ULDUAR_EXCLUDED.has(boss)) return true;
  return ULDUAR_EXCLUDED_BY_REALM[realmSlug]?.has(boss) ?? false;
}

export function rankedBossNames(data: WLRankings): { bosses: string[]; hardmode: boolean } {
  const realm = data.guild.realm.slug;
  const raid = data.filters.raid.slug;

  if (raid === 'ulduar' && isHeroic(data.filters.difficulty.id)) {
    return {
      bosses: ULDUAR_HARDMODE.filter(b => !excludedOnRealm(b, realm)),
      hardmode: true,
    };
  }

  if (raid === 'ulduar') {
    return {
      bosses: data.bossOrder.filter(b => !excludedOnRealm(b, realm)),
      hardmode: false,
    };
  }

  return { bosses: data.bossOrder, hardmode: false };
}

export function playerBossCoverage(player: WLRankingPlayer, bosses: string[]): { parsed: number; total: number } {
  const parsed = bosses.filter(b => player.bosses[b] != null).length;
  return { parsed, total: bosses.length };
}
