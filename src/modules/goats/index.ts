import type { IntegrationManifest } from '../contract.js';
import * as goats from './commands/goats.js';

export const module: IntegrationManifest = {
  id: 'goats',
  domain: 'logs',
  summary: 'Weekly goats: combined top 3 DPS / top 2 heals across both raid nights',
  commands: [goats],
  storeNamespaces: ['goats'],
};
