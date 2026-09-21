import type { Guild } from 'discord.js';
import type { PendingApply } from './pending.js';

export interface ApplyProgress {
  step: number;
  total: number;
  action: 'add' | 'remove';
  name: string;
}

export async function applyPending(
  guild: Guild,
  pending: PendingApply,
  onProgress?: (progress: ApplyProgress) => Promise<void>,
): Promise<{ added: number; removed: number; failed: string[] }> {
  const role = await guild.roles.fetch(pending.roleId);
  const failed: string[] = [];
  let added = 0;
  let removed = 0;
  if (!role) return { added: 0, removed: 0, failed: ['El rol ya no existe.'] };

  const total = pending.addIds.length + pending.removeIds.length;
  let step = 0;

  for (const id of pending.addIds) {
    const member = await guild.members.fetch(id).catch(() => null);
    step++;
    if (!member) {
      failed.push(`${id} (no está en el server)`);
      continue;
    }
    await onProgress?.({ step, total, action: 'add', name: member.displayName });
    try {
      await member.roles.add(role, 'Serenity Bot — /listarol');
      added++;
    } catch (err) {
      failed.push(`${member.displayName}: ${err instanceof Error ? err.message : 'error'}`);
    }
  }

  for (const id of pending.removeIds) {
    const member = await guild.members.fetch(id).catch(() => null);
    step++;
    if (!member) continue;
    await onProgress?.({ step, total, action: 'remove', name: member.displayName });
    try {
      await member.roles.remove(role, 'Serenity Bot — /listarol');
      removed++;
    } catch (err) {
      failed.push(`${member.displayName}: ${err instanceof Error ? err.message : 'error'}`);
    }
  }

  return { added, removed, failed };
}
