import { randomUUID } from 'node:crypto';
import type { RosterRoleMode } from './store.js';

const TTL_MS = 5 * 60 * 1000;

export interface PendingApply {
  id: string;
  guildId: string;
  userId: string;
  roleId: string;
  mode: RosterRoleMode;
  addIds: string[];
  removeIds: string[];
  expiresAt: number;
}

const pending = new Map<string, PendingApply>();

function prune(now = Date.now()): void {
  for (const [id, item] of pending) {
    if (item.expiresAt <= now) pending.delete(id);
  }
}

export function savePending(input: Omit<PendingApply, 'id' | 'expiresAt'>): PendingApply {
  prune();
  const item: PendingApply = {
    ...input,
    id: randomUUID(),
    expiresAt: Date.now() + TTL_MS,
  };
  pending.set(item.id, item);
  return item;
}

export function peekPending(id: string): PendingApply | null {
  prune();
  return pending.get(id) ?? null;
}

export function takePending(id: string): PendingApply | null {
  const item = peekPending(id);
  if (item) pending.delete(id);
  return item;
}
