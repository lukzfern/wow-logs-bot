import 'dotenv/config';
import { api } from './api.js';
import { buildLogEmbed, threadTitle } from './format/index.js';

const arg = process.argv[2];
const logId = arg?.match(/(\d+)/)?.[1];

async function main() {
  console.log('[test-cli] Checking API health...');
  const health = await api.health();
  console.log(`  Status: ${health.status} · Tier: ${health.tier}`);
  const rate = api.rateInfo!;
  console.log(`  RPM: ${rate.remaining}/${rate.limit} · Monthly: ${rate.monthlyRemaining}/${rate.monthlyLimit}\n`);

  const realm = process.env.TEST_REALM ?? 'wow-patagonia';
  const guild = process.env.TEST_GUILD ?? 'Serenity';

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
