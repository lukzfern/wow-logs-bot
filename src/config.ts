import 'dotenv/config';

export const config = {
  discordToken: process.env.DISCORD_TOKEN ?? '',
  clientId: process.env.DISCORD_CLIENT_ID ?? '',
  wowLogsApiKey: process.env.WOWLOGS_API_KEY ?? '',
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 120_000,
} as const;

export const API_BASE = 'https://api.wow-logs.co.in/api/v1';
