import { PermissionFlagsBits, type Guild, type GuildTextBasedChannel, type Role } from 'discord.js';

export const DEFAULT_ANNOUNCE = '{rol} Ya pueden sacar consumibles del Guild bank y usar el guild repair';

export function formatAnnounce(template: string, role: Role): string {
  const text = (template.trim() || DEFAULT_ANNOUNCE).replaceAll('{rol}', `<@&${role.id}>`);
  return text.includes(`<@&${role.id}>`) ? text : `${role} ${text}`;
}

export function mentionWarning(guild: Guild, role: Role): string | null {
  const me = guild.members.me;
  if (!me) return null;
  if (role.mentionable || me.permissions.has(PermissionFlagsBits.MentionEveryone)) return null;
  return '⚠️ El rol no es mencionable y al bot le falta el permiso de mencionar roles: el mensaje se ve, pero puede no notificar.';
}

export async function postAnnounce(channel: GuildTextBasedChannel, guild: Guild, role: Role, template: string): Promise<string | null> {
  const me = guild.members.me;
  if (!me?.permissionsIn(channel).has(PermissionFlagsBits.SendMessages)) {
    return '❌ No puedo hablar en este canal.';
  }
  await channel.send({
    content: formatAnnounce(template, role),
    allowedMentions: { roles: [role.id] },
  });
  return null;
}
