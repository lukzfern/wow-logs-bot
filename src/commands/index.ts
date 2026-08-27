import type { ChatInputCommandInteraction } from 'discord.js';
import * as setup from './setup.js';
import * as latestlog from './latestlog.js';
import * as log from './log.js';
import * as logs from './logs.js';
import * as status from './status.js';
import * as preview from './preview.js';
import * as setupemojis from './setupemojis.js';

const all = [setup, latestlog, log, logs, status, preview, setupemojis];

export const commandDefinitions = all.map(c => c.definition);

export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const cmd = all.find(c => c.definition.name === interaction.commandName);
  if (cmd) await cmd.execute(interaction);
}
