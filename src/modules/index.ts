import type { IntegrationManifest } from './contract.js';

/**
 * Registry of integrations. `logs` still lives in src/commands + src/watcher
 * until it is extracted. New domains register here.
 */
export const modules: IntegrationManifest[] = [];

export type { IntegrationDomain, IntegrationManifest, SlashCommand, WatcherJob } from './contract.js';
