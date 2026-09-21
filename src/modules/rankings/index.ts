import type { IntegrationManifest } from '../contract.js';
import * as rankings from './commands/rankings.js';

export const module: IntegrationManifest = {
  id: 'rankings',
  domain: 'logs',
  summary: 'Guild Boss Points rankings from wow-logs.co.in',
  commands: [rankings],
  storeNamespaces: [],
};
