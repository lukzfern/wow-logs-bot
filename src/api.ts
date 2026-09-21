import { API_BASE, config } from './config.js';
import { WowLogsApiError } from './errors.js';
import type { WLGuild, WLLogDetail, WLLogMeta, WLRankings, WLSeasonInfo, WLServer, RateInfo } from './types.js';

export type { WLRaid, WLConsumables, WLPlayer, WLFight, WLLogMeta, WLLogDetail, WLGuild, WLRankings, WLSeasonInfo, WLServer, RateInfo } from './types.js';

// ── Client ──

class WowLogsApi {
  private _rate: RateInfo | null = null;
  get rateInfo() { return this._rate; }

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}${path}${qs}`, {
      headers: { Authorization: `Bearer ${config.wowLogsApiKey}` },
    });

    this._rate = {
      limit: Number(res.headers.get('x-ratelimit-limit') ?? 0),
      remaining: Number(res.headers.get('x-ratelimit-remaining') ?? 0),
      cost: Number(res.headers.get('x-ratelimit-cost') ?? 0),
      monthlyLimit: Number(res.headers.get('x-ratelimit-monthly-limit') ?? 0),
      monthlyRemaining: Number(res.headers.get('x-ratelimit-monthly-remaining') ?? 0),
    };

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } })) as any;
      throw new WowLogsApiError(res.status, body?.error?.code ?? 'UNKNOWN', body?.error?.message ?? `HTTP ${res.status}`);
    }

    const body = (await res.json()) as { ok: boolean; data: T; error?: { code: string; message: string } };
    if (!body.ok) {
      throw new WowLogsApiError(400, body.error?.code ?? 'API_ERROR', body.error?.message ?? 'Unknown API error');
    }
    return body.data;
  }

  private guildPath(realm: string, guild: string) {
    return `/guilds/${encodeURIComponent(realm)}/${encodeURIComponent(guild)}`;
  }

  health() {
    return this.request<{
      status: string;
      tier: string;
      limits: { monthlyLimit: number | null; rpmLimit: number | null; logsListMax: number };
    }>('/health');
  }

  guildLogs(realm: string, guild: string, limit = 5, cursor?: string) {
    const p: Record<string, string> = { limit: String(limit) };
    if (cursor) p.cursor = cursor;
    return this.request<{
      guild: WLGuild;
      logs: WLLogMeta[];
      pagination: { limit: number; nextCursor?: string };
    }>(`${this.guildPath(realm, guild)}/logs`, p);
  }

  guildLogDetail(realm: string, guild: string, logId: number | 'latest') {
    return this.request<{ guild: WLGuild; log: WLLogDetail }>(
      `${this.guildPath(realm, guild)}/logs/${logId}`,
      { include: 'consumables,interrupts' },
    );
  }

  metaServers() {
    return this.request<{ servers: WLServer[] }>('/meta/servers');
  }

  metaSeason(serverId: number) {
    return this.request<{ server: WLSeasonInfo }>('/meta/seasons', { serverId: String(serverId) });
  }

  guildRankings(realm: string, guild: string, params: {
    raid: string;
    season: number;
    difficulty: string;
    ladder: string;
  }) {
    return this.request<WLRankings>(`${this.guildPath(realm, guild)}/rankings`, {
      raid: params.raid,
      season: String(params.season),
      difficulty: params.difficulty,
      ladder: params.ladder,
    });
  }
}

export const api = new WowLogsApi();
