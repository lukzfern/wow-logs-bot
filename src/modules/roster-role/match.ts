import type { Collection, GuildMember } from 'discord.js';

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}

function collapseSlash(value: string): string {
  return value.replace(/\s*\/\s*/g, '/');
}

/** "Frodito / Lorileyy Lucca" → ["Frodito/Lorileyy", "Lucca"] */
export function parseRosterTokens(list: string): string[] {
  return collapseSlash(list).split(/\s+/).map(t => t.trim()).filter(Boolean);
}

function memberAliases(member: GuildMember): string[] {
  const raw = [
    member.nickname,
    member.displayName,
    member.user.globalName,
    member.user.username,
  ].filter((v): v is string => !!v);
  const aliases = new Set<string>();
  for (const value of raw) {
    const n = normalize(value);
    aliases.add(n);
    aliases.add(collapseSlash(n));
  }
  return [...aliases];
}

function matchScore(member: GuildMember, needle: string): number {
  const collapsed = collapseSlash(needle);
  const fields = [
    member.nickname,
    member.displayName,
    member.user.globalName,
    member.user.username,
  ];
  let best = 0;
  fields.forEach((value, i) => {
    if (!value) return;
    const n = normalize(value);
    if (n === needle || collapseSlash(n) === collapsed) {
      best = Math.max(best, 4 - i);
    }
  });
  return best;
}

function pickBest(hits: GuildMember[], needle: string): GuildMember[] {
  if (hits.length <= 1) return hits;
  let best = 0;
  const scored = hits.map(m => {
    const s = matchScore(m, needle);
    if (s > best) best = s;
    return { m, s };
  });
  const top = scored.filter(x => x.s === best && x.s > 0).map(x => x.m);
  return top.length === 1 ? top : hits;
}

function lookup(members: Collection<string, GuildMember>, token: string): GuildMember[] {
  const needle = normalize(token);
  const collapsed = collapseSlash(needle);
  const hits = members.filter(m => {
    const aliases = memberAliases(m);
    return aliases.includes(needle) || aliases.includes(collapsed);
  });
  return pickBest([...hits.values()], needle);
}

/** Raid-Helper sometimes exports "Main/Alt". Try each side if the full token misses. */
function lookupWithAlts(members: Collection<string, GuildMember>, token: string): GuildMember[] {
  const exact = lookup(members, token);
  if (exact.length) return exact;
  if (!token.includes('/')) return [];
  const parts = token.split('/').map(p => p.trim()).filter(Boolean);
  const found = new Map<string, GuildMember>();
  for (const part of parts) {
    for (const m of lookup(members, part)) found.set(m.id, m);
  }
  return [...found.values()];
}

export interface RosterMatch {
  matched: GuildMember[];
  unmatched: string[];
  ambiguous: { token: string; members: GuildMember[] }[];
}

export function matchRoster(members: Collection<string, GuildMember>, tokens: string[]): RosterMatch {
  const matched = new Map<string, GuildMember>();
  const unmatched: string[] = [];
  const ambiguous: { token: string; members: GuildMember[] }[] = [];

  for (const token of tokens) {
    const hits = lookupWithAlts(members, token);
    if (hits.length === 1) {
      matched.set(hits[0].id, hits[0]);
    } else if (hits.length > 1) {
      ambiguous.push({ token, members: hits });
    } else {
      unmatched.push(token);
    }
  }

  return { matched: [...matched.values()], unmatched, ambiguous };
}
