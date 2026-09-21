import { buildGoatsEmbed } from './embed.js';
import { loadWeeklyGoats } from './aggregate.js';
import { applyGoatsScenario, GOATS_SCENARIOS } from './scenarios.js';

export async function previewGoatsScenarios(realm: string, guild: string): Promise<void> {
  const data = await loadWeeklyGoats(realm, guild, 2);
  if (!data.nights.length) {
    console.log('[goats] Need raid nights to preview scenarios.');
    return;
  }

  for (const scen of GOATS_SCENARIOS) {
    const json = buildGoatsEmbed(applyGoatsScenario(data, scen.id)).toJSON();
    console.log(`\n${'═'.repeat(64)}\n${scen.name}\n${'═'.repeat(64)}`);
    console.log(`  ${json.title}`);
    console.log(`  ${(json.description ?? '').split('\n').join('\n  ')}`);
    for (const field of json.fields ?? []) {
      console.log(`\n  [${field.name}]`);
      for (const line of field.value.split('\n')) console.log(`    ${line}`);
    }
    console.log(`\n  Footer: ${json.footer?.text}`);
  }
}
