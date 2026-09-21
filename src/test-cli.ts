import 'dotenv/config';
import { api } from './api.js';
import { buildLogEmbed, threadTitle } from './format/index.js';
import { loadWeeklyGoats, type GoatsSizeFilter } from './modules/goats/aggregate.js';
import { buildGoatsEmbed } from './modules/goats/embed.js';
import { previewGoatsScenarios } from './modules/goats/preview-scenarios.js';

const arg = process.argv[2];
const logId = arg?.match(/(\d+)/)?.[1];

async function previewGoats(realm: string, guild: string): Promise<void> {
  const raidCount = Number(process.argv[3] ?? 2);
  const sizeArg = process.argv[4];
  const size: GoatsSizeFilter | undefined = sizeArg === 'all'
    ? 'all'
    : sizeArg === '25' || sizeArg === '10'
      ? Number(sizeArg)
      : undefined;
  console.log(`[test-cli] Building goats for last ${Number.isFinite(raidCount) ? raidCount : 2} raids${size == null ? ' (same size as latest)' : size === 'all' ? '' : ` (${size})`}…`);
  const data = await loadWeeklyGoats(realm, guild, Number.isFinite(raidCount) ? raidCount : 2, size);
  const json = buildGoatsEmbed(data).toJSON();
  console.log(`\n── Goats Embed ──`);
  console.log(`  Title: ${json.title}`);
  console.log(`  Description:\n    ${(json.description ?? '').split('\n').join('\n    ')}`);
  for (const field of json.fields ?? []) {
    console.log(`\n  [${field.name}]${field.inline ? ' (inline)' : ''}`);
    for (const line of field.value.split('\n')) console.log(`    ${line}`);
  }
  console.log(`\n  Footer: ${json.footer?.text}`);
  console.log(`\n[test-cli] Done. Embed has ${JSON.stringify(json).length} chars total.`);
}

async function main() {
  console.log('[test-cli] Checking API health...');
  const health = await api.health();
  console.log(`  Status: ${health.status} · Tier: ${health.tier}`);
  const rate = api.rateInfo!;
  console.log(`  RPM: ${rate.remaining}/${rate.limit} · Monthly: ${rate.monthlyRemaining}/${rate.monthlyLimit}\n`);

  const realm = process.env.TEST_REALM ?? 'wow-patagonia';
  const guild = process.env.TEST_GUILD ?? 'Serenity';

  if (arg === 'goats') {
    await previewGoats(realm, guild);
    return;
  }
  if (arg === 'goats-scen') {
    await previewGoatsScenarios(realm, guild);
    return;
  }

  if (!logId) {
    console.log(`[test-cli] No log ID provided — fetching latest for ${guild} @ ${realm}...`);
  } else {
    console.log(`[test-cli] Fetching log #${logId} for ${guild} @ ${realm}...`);
  }

  const { log } = await api.guildLogDetail(realm, guild, logId ? Number(logId) : 'latest');

  console.log(`\n── Thread Title ──`);
  console.log(threadTitle(log));

  console.log(`\n── Log Metadata ──`);
  console.log(`  ID: ${log.logId}`);
  console.log(`  URL: ${log.logUrl}`);
  console.log(`  Raid: ${log.raid.name} (${log.size})`);
  console.log(`  Uploaded: ${log.uploadedAt}`);
  console.log(`  Fights: ${log.fights.length}`);

  const embed = buildLogEmbed(log);
  const json = embed.toJSON();

  console.log(`\n── Embed Preview ──`);
  console.log(`  Title: ${json.title}`);
  console.log(`  Color: #${json.color?.toString(16).padStart(6, '0')}`);
  console.log(`  Description: ${json.description}`);

  for (const field of json.fields ?? []) {
    console.log(`\n  [${field.name}]${field.inline ? ' (inline)' : ''}`);
    for (const line of field.value.split('\n')) {
      console.log(`    ${line}`);
    }
  }

  console.log(`\n  Footer: ${json.footer?.text}`);
  console.log(`\n[test-cli] Done. Embed has ${JSON.stringify(json).length} chars total.`);
}

main().catch(err => {
  console.error('[test-cli] Fatal:', err);
  process.exit(1);
});
