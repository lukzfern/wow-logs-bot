import { PermissionFlagsBits, type Guild, type GuildMember, type Role } from 'discord.js';
import { matchRoster, parseRosterTokens } from './match.js';
import type { RosterRoleMode } from './store.js';

export interface RolePlan {
  role: Role;
  mode: RosterRoleMode;
  tokens: string[];
  matched: GuildMember[];
  toAdd: GuildMember[];
  toRemove: GuildMember[];
  unmatched: string[];
  ambiguous: { token: string; members: GuildMember[] }[];
}

export function roleManageError(guild: Guild, role: Role): string | null {
  const me = guild.members.me;
  if (!me) return '❌ No pude ver el usuario del bot en este servidor.';
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return '❌ Al bot le falta el permiso **Gestionar roles**. Reinvitalo o dale ese permiso.';
  }
  if (role.managed) return `❌ ${role} lo gestiona una integración y no se puede asignar a mano.`;
  if (role.id === guild.id) return '❌ No se puede asignar @everyone.';
  if (role.position >= me.roles.highest.position) {
    return `❌ El rol del bot tiene que estar **arriba** de ${role} en Configuración del servidor → Roles.`;
  }
  return null;
}

export async function buildRolePlan(guild: Guild, list: string, role: Role, mode: RosterRoleMode): Promise<RolePlan> {
  const tokens = parseRosterTokens(list);
  const members = await guild.members.fetch();
  const { matched, unmatched, ambiguous } = matchRoster(members, tokens);
  const matchedIds = new Set(matched.map(m => m.id));
  const toAdd = matched.filter(m => !m.roles.cache.has(role.id));
  const holding = members.filter(m => m.roles.cache.has(role.id));
  const toRemove = mode === 'replace'
    ? [...holding.values()].filter(m => !matchedIds.has(m.id))
    : [];

  return { role, mode, tokens, matched, toAdd, toRemove, unmatched, ambiguous };
}
