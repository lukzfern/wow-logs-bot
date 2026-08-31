import { Client, ChannelType, TextChannel, ThreadChannel, ThreadAutoArchiveDuration, DiscordAPIError } from 'discord.js';
import { api } from './api.js';
import type { WLLogDetail } from './types.js';
import { DEDUP_WINDOW_MS } from './types.js';
import { WowLogsApiError } from './errors.js';
import { resolveEmojis } from './emoji.js';
import { allConfigs, updateLastLogId, findMatchingRaid, addPostedRaid, addAltLog, type GuildConfig } from './store.js';
import { buildLogEmbed, threadTitle } from './format/index.js';

export function startWatcher(client: Client, intervalMs: number) {
  async function loop() {
    for (const [discordGuildId, cfg] of allConfigs()) {
      try {
        await checkGuild(client, discordGuildId, cfg);
      } catch (err) {
        if (err instanceof WowLogsApiError && err.status === 429) {
          console.warn('[watcher] Rate limited, skipping this cycle');
          break;
        }
        console.error(`[watcher] ${cfg.realm}/${cfg.guild}:`, err instanceof Error ? err.message : err);
      }
    }
    setTimeout(loop, intervalMs);
  }

  setTimeout(loop, 10_000);
  console.log(`[watcher] Polling every ${intervalMs / 1000}s`);
}

function raidSignature(log: WLLogDetail): { raidName: string; size: number; firstFightStart: string; killCount: number } {
  const bossFights = log.fights.filter(f => f.boss);
  return {
    raidName: log.raid.name,
    size: log.size,
    firstFightStart: bossFights[0]?.start ?? log.uploadedAt,
    killCount: bossFights.filter(f => f.kill).length,
  };
}

async function checkGuild(client: Client, discordGuildId: string, cfg: GuildConfig) {
  if (!cfg.channelId) return;

  const { logs } = await api.guildLogs(cfg.realm, cfg.guild, 5);
  if (!logs.length) return;

  if (cfg.lastLogId === null) {
    updateLastLogId(discordGuildId, logs[0].logId);
    console.log(`[watcher] Seeded lastLogId=${logs[0].logId} for ${cfg.realm}/${cfg.guild}`);
    return;
  }

  const newLogs = logs
    .filter(l => l.logId > cfg.lastLogId!)
    .sort((a, b) => a.logId - b.logId);

  if (!newLogs.length) return;

  const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
  if (!channel) {
    console.error(`[watcher] Channel ${cfg.channelId} not found`);
    return;
  }

  const isThread = channel.type === ChannelType.PublicThread || channel.type === ChannelType.PrivateThread;
  if (!isThread && channel.type !== ChannelType.GuildText) {
    console.error(`[watcher] Channel ${cfg.channelId} is not a text channel or thread`);
    return;
  }

  // Fetch all new log details first to enable grouping
  const fetched: { logId: number; log: WLLogDetail; guildName: string }[] = [];
  for (const meta of newLogs) {
    try {
      const { guild: wlGuild, log } = await api.guildLogDetail(cfg.realm, cfg.guild, meta.logId);
      fetched.push({ logId: meta.logId, log, guildName: wlGuild.name });
    } catch (err) {
      console.error(`[watcher] Failed to fetch log #${meta.logId}:`, err instanceof Error ? err.message : err);
    }
  }

  // Group by raid session: find best log per session, mark others as alts
  const processed = new Set<number>();

  for (const item of fetched) {
    if (processed.has(item.logId)) continue;

    const sig = raidSignature(item.log);

    // Check if this matches an already-posted raid
    const existingRaid = findMatchingRaid(discordGuildId, sig.raidName, sig.size, sig.firstFightStart);
    if (existingRaid) {
      // This is a duplicate of an already-posted raid
      await postAltLog(channel as TextChannel, existingRaid, item, discordGuildId, cfg);
      processed.add(item.logId);
      updateLastLogId(discordGuildId, item.logId);
      continue;
    }

    // Group with other new logs from the same session
    const sessionLogs = fetched.filter(other => {
      if (processed.has(other.logId) || other.logId === item.logId) return false;
      const otherSig = raidSignature(other.log);
      if (otherSig.raidName !== sig.raidName || otherSig.size !== sig.size) return false;
      const diff = Math.abs(new Date(otherSig.firstFightStart).getTime() - new Date(sig.firstFightStart).getTime());
      return diff < DEDUP_WINDOW_MS;
    });

    // Pick the best log (most kills, then highest logId as tiebreaker)
    const allInSession = [item, ...sessionLogs];
    allInSession.sort((a, b) => {
      const aKills = raidSignature(a.log).killCount;
      const bKills = raidSignature(b.log).killCount;
      return bKills - aKills || b.logId - a.logId;
    });

    const best = allInSession[0];
    const alts = allInSession.slice(1);

    try {
      const guild = await client.guilds.fetch(discordGuildId).catch(() => null);
      const altLogIds = alts.map(a => a.logId);
      const embed = buildLogEmbed(best.log, resolveEmojis(guild), best.guildName, altLogIds.length ? altLogIds : undefined);
      const title = threadTitle(best.log);
      const bestSig = raidSignature(best.log);

      let threadId: string | undefined;

      if (isThread) {
        await (channel as ThreadChannel).send({ embeds: [embed] });
      } else if (cfg.useThreads) {
        const thread = await (channel as TextChannel).threads.create({
          name: title.slice(0, 100),
          autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        });
        threadId = thread.id;
        await thread.send({ embeds: [embed] });
      } else {
        await (channel as TextChannel).send({ embeds: [embed] });
      }

      addPostedRaid(discordGuildId, {
        logId: best.logId,
        raidName: bestSig.raidName,
        size: bestSig.size,
        firstFightStart: bestSig.firstFightStart,
        threadId,
        altLogIds: alts.map(a => a.logId),
      });

      for (const entry of allInSession) {
        processed.add(entry.logId);
        updateLastLogId(discordGuildId, entry.logId);
      }

      const altStr = alts.length ? ` (+${alts.length} alt${alts.length > 1 ? 's' : ''})` : '';
      console.log(`[watcher] Posted log #${best.logId}${altStr}`);
    } catch (err) {
      if (err instanceof DiscordAPIError) {
        console.error(`[watcher] Discord error posting log #${best.logId}: ${err.message} (code ${err.code})`);
      } else {
        console.error(`[watcher] Failed log #${best.logId}:`, err instanceof Error ? err.message : err);
      }
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

// Alt logs only get stored in the DB — no separate Discord message.
// The main embed's footer shows alt IDs via buildLogEmbed(..., altLogIds).
async function postAltLog(
  _textChannel: TextChannel,
  existingRaid: { logId: number; threadId?: string; altLogIds: number[] },
  alt: { logId: number; log: WLLogDetail; guildName: string },
  discordGuildId: string,
  _cfg: GuildConfig,
) {
  addAltLog(discordGuildId, existingRaid.logId, alt.logId);
  console.log(`[watcher] Alt log #${alt.logId} linked to raid #${existingRaid.logId} (footer only)`);
}
