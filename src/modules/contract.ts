import type { ButtonInteraction, Client, ChatInputCommandInteraction, GatewayIntentBits, PermissionResolvable, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

/**
 * Target contract for every Discord integration (logs, org, guild admin).
 * Existing commands/watcher are the `logs` module in everything-but-name;
 * new work should land under `src/modules/<id>/` and register via this shape.
 */

export type IntegrationDomain = 'logs' | 'org' | 'discord-admin';

export interface SlashCommand {
  definition: { name: string; toJSON: () => RESTPostAPIChatInputApplicationCommandsJSONBody };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface WatcherJob {
  /** English console tag, e.g. `[raid-calendar]` */
  name: string;
  /** Delay before first tick. Default: 10s (matches current logs watcher). */
  initialDelayMs?: number;
  intervalMs: number;
  tick: (client: Client) => Promise<void>;
}

export interface IntegrationManifest {
  id: string;
  domain: IntegrationDomain;
  /** One-line purpose for agents and /status. */
  summary: string;
  commands: SlashCommand[];
  /** Return true if this module handled the button. */
  handleComponent?: (interaction: ButtonInteraction) => Promise<boolean>;
  watchers?: WatcherJob[];
  /**
   * Extra Gateway intents beyond Guilds.
   * Privileged intents (Members, MessageContent, Presence) need a product decision
   * and a Discord Developer Portal enable — never add silently.
   */
  extraIntents?: GatewayIntentBits[];
  /** Bot permissions this module needs in the invite URL / channel. */
  botPermissions?: PermissionResolvable[];
  /** JSON keys this module owns inside data/store.json. Never write another module's keys. */
  storeNamespaces: string[];
}

export function assertUniqueCommandNames(modules: IntegrationManifest[]): void {
  const seen = new Map<string, string>();
  for (const mod of modules) {
    for (const cmd of mod.commands) {
      const name = cmd.definition.name;
      const owner = seen.get(name);
      if (owner) {
        throw new Error(`Duplicate slash command /${name} in modules "${owner}" and "${mod.id}"`);
      }
      seen.set(name, mod.id);
    }
  }
}
