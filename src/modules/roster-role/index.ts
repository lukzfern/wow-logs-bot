import { GatewayIntentBits, PermissionFlagsBits, type ButtonInteraction } from 'discord.js';
import type { IntegrationManifest } from '../contract.js';
import { handleRosterRoleButton } from './buttons.js';
import * as listarol from './commands/listarol.js';

export const module: IntegrationManifest = {
  id: 'roster-role',
  domain: 'discord-admin',
  summary: 'Assign a configured Discord role from a pasted Raid-Helper name list',
  commands: [listarol],
  extraIntents: [GatewayIntentBits.GuildMembers],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  storeNamespaces: ['rosterRole'],
  handleComponent: (interaction: ButtonInteraction) => handleRosterRoleButton(interaction),
};
