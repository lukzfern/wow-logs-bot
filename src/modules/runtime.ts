import type { Client } from 'discord.js';
import type { IntegrationManifest } from './contract.js';

export function startModuleWatchers(client: Client, mods: IntegrationManifest[]): void {
  for (const mod of mods) {
    for (const job of mod.watchers ?? []) {
      const delay = job.initialDelayMs ?? 10_000;
      async function loop() {
        try {
          await job.tick(client);
        } catch (err) {
          console.error(`[${job.name}]`, err instanceof Error ? err.message : err);
        }
        setTimeout(loop, job.intervalMs);
      }
      setTimeout(loop, delay);
      console.log(`[${job.name}] Polling every ${job.intervalMs / 1000}s`);
    }
  }
}
