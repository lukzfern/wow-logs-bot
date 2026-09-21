import { Client, GatewayIntentBits, Events, REST, Routes, MessageFlags } from 'discord.js';
import { config } from './config.js';
import { friendlyError } from './errors.js';
import { commandDefinitions, handleCommand } from './commands/index.js';
import { startWatcher } from './watcher.js';
import { modules } from './modules/index.js';
import { startModuleWatchers } from './modules/runtime.js';

const privilegedIntents = modules.flatMap(m => m.extraIntents ?? []);

function wireClient(client: Client): void {
  client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    if (!client.options.intents.has(GatewayIntentBits.GuildMembers)) {
      console.warn('[bot] Running without Server Members Intent — /listarol cannot fetch the roster. Enable it in the Developer Portal (Bot → Privileged Gateway Intents) and restart.');
    }

    const rest = new REST().setToken(config.discordToken);
    await rest.put(Routes.applicationCommands(config.clientId), {
      body: commandDefinitions.map(cmd => cmd.toJSON()),
    });
    console.log(`Registered ${commandDefinitions.length} slash commands`);

    startWatcher(client, config.pollIntervalMs);
    startModuleWatchers(client, modules);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton()) {
        for (const mod of modules) {
          if (mod.handleComponent && await mod.handleComponent(interaction)) return;
        }
        return;
      }
      if (!interaction.isChatInputCommand()) return;
      await handleCommand(interaction);
    } catch (err) {
      const name = interaction.isChatInputCommand()
        ? `/${interaction.commandName}`
        : 'customId' in interaction ? interaction.customId : 'interaction';
      console.error(`[cmd] ${name}:`, err);
      const content = friendlyError(err);
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content }).catch(() => {});
        } else {
          await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      }
    }
  });
}

function isDisallowedIntents(err: unknown): boolean {
  return err instanceof Error && err.message.includes('Used disallowed intents');
}

async function login(): Promise<void> {
  const withPrivileged = new Client({
    intents: [GatewayIntentBits.Guilds, ...privilegedIntents],
  });
  wireClient(withPrivileged);
  try {
    await withPrivileged.login(config.discordToken);
    return;
  } catch (err) {
    if (!isDisallowedIntents(err) || !privilegedIntents.length) throw err;
    console.warn('[bot] Discord rejected GuildMembers (not enabled in the Developer Portal). Starting logs-only; /listarol will stay limited until you enable Server Members Intent and restart.');
    withPrivileged.destroy();
  }

  const fallback = new Client({ intents: [GatewayIntentBits.Guilds] });
  wireClient(fallback);
  await fallback.login(config.discordToken);
}

await login();
