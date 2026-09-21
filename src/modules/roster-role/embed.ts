import { EmbedBuilder } from 'discord.js';
import { truncate } from '../../format/index.js';
import type { RolePlan } from './plan.js';

function nameList(members: { displayName: string }[], empty: string): string {
  if (!members.length) return empty;
  return truncate(members.map(m => m.displayName).join(', '), 1024);
}

export function buildPlanEmbed(plan: RolePlan, title: string): EmbedBuilder {
  const color = plan.unmatched.length || plan.ambiguous.length ? 0xf39c12 : 0x2ecc71;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setDescription(
      `${plan.role} · **${plan.mode === 'replace' ? 'Reemplazar' : 'Solo agregar'}** · ${plan.tokens.length} nombres en la lista`,
    );

  embed.addFields({
    name: `✅ En lista (${plan.matched.length})`,
    value: nameList(plan.matched, 'Nadie matcheó.'),
  });
  embed.addFields({
    name: `➕ Se asigna (${plan.toAdd.length})`,
    value: nameList(plan.toAdd, 'Nadie nuevo.'),
  });
  if (plan.mode === 'replace') {
    embed.addFields({
      name: `➖ Se saca (${plan.toRemove.length})`,
      value: nameList(plan.toRemove, 'Nadie pierde el rol.'),
    });
  }
  if (plan.unmatched.length) {
    embed.addFields({
      name: `❓ Sin match (${plan.unmatched.length})`,
      value: truncate(plan.unmatched.join(', '), 1024),
    });
  }
  if (plan.ambiguous.length) {
    const lines = plan.ambiguous.map(a =>
      `${a.token} → ${a.members.map(m => m.displayName).join(' | ')}`,
    );
    embed.addFields({
      name: `⚠️ Ambiguo (${plan.ambiguous.length})`,
      value: truncate(lines.join('\n'), 1024),
    });
  }

  const notes: string[] = [];
  if (plan.unmatched.length) {
    notes.push('Los nombres sin match **no** reciben el rol. En modo Reemplazar, un nick distinto al export (ej. Frodito vs Frodito/Alt) puede hacer que se lo saquen.');
  }
  if (notes.length) embed.setFooter({ text: notes.join(' ') });
  return embed;
}
