import { Client, GatewayIntentBits, Events, REST, Routes, MessageFlags } from 'discord.js';
import { config } from './config.js';
import { friendlyError } from './errors.js';
import { commandDefinitions, handleCommand } from './commands/index.js';
import { startWatcher } from './watcher.js';
import { modules } from './modules/index.js';
import { startModuleWatchers } from './modules/runtime.js';

const extraIntents = modules.flatMap(m => m.extraIntents ?? []);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, ...extraIntents],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  const rest = new REST().setToken(config.discordToken);
  await rest.put(Routes.applicationCommands(config.clientId), {
    body: commandDefinitions.map(cmd => cmd.toJSON()),
  });
  console.log(`Registered ${commandDefinitions.length} slash commands`);

  startWatcher(client, config.pollIntervalMs);
  startModuleWatchers(client, modules);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await handleCommand(interaction);
  } catch (err) {
    console.error(`[cmd] /${interaction.commandName}:`, err);
    const content = friendlyError(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content }).catch(() => {});
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

client.login(config.discordToken);
