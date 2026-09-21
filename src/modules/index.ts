import { assertUniqueCommandNames, type IntegrationManifest } from './contract.js';
import { module as rankings } from './rankings/index.js';
import { module as rosterRole } from './roster-role/index.js';

export const modules: IntegrationManifest[] = [rankings, rosterRole];

assertUniqueCommandNames(modules);

export { assertUniqueCommandNames };
export type { IntegrationDomain, IntegrationManifest, SlashCommand, WatcherJob } from './contract.js';
