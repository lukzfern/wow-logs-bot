import { GatewayIntentBits, PermissionFlagsBits, type ButtonInteraction } from 'discord.js';
import type { IntegrationManifest } from '../contract.js';
import { handleRosterRoleButton } from './buttons.js';
import * as listarol from './commands/listarol.js';

export const module: IntegrationManifest = {
  id: 'roster-role',
  domain: 'discord-admin',
  summary: 'Assign a Discord role from a Raid-Helper list and announce it to the raid',
  commands: [listarol],
  extraIntents: [GatewayIntentBits.GuildMembers],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  storeNamespaces: ['rosterRole'],
  handleComponent: (interaction: ButtonInteraction) => handleRosterRoleButton(interaction),
};
