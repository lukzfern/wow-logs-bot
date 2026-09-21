import type { ChatInputCommandInteraction } from 'discord.js';
import { modules } from '../modules/index.js';
import * as setup from './setup.js';
import * as latestlog from './latestlog.js';
import * as log from './log.js';
import * as logs from './logs.js';
import * as status from './status.js';
import * as preview from './preview.js';
import * as setupemojis from './setupemojis.js';

const legacy = [setup, latestlog, log, logs, status, preview, setupemojis];
const fromModules = modules.flatMap(m => m.commands);
const all = [...legacy, ...fromModules];

const commandNames = all.map(c => c.definition.name);
const duplicate = commandNames.find((name, i) => commandNames.indexOf(name) !== i);
if (duplicate) {
  throw new Error(`Duplicate slash command /${duplicate}`);
}

export const commandDefinitions = all.map(c => c.definition);

export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const cmd = all.find(c => c.definition.name === interaction.commandName);
  if (cmd) await cmd.execute(interaction);
}
