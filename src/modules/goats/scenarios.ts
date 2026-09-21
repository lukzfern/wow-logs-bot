import { weekGoats, type GoatMark, type WeeklyGoats } from './aggregate.js';

export const GOATS_SCENARIOS = [
  { id: 'primera', name: 'Primera semana (sin historial)' },
  { id: 'rachas', name: 'Todos con racha' },
  { id: 'movida', name: 'Algunos con racha' },
] as const;

export type GoatsScenarioId = (typeof GOATS_SCENARIOS)[number]['id'];

export function applyGoatsScenario(data: WeeklyGoats, scenario: GoatsScenarioId): WeeklyGoats {
  const goats = weekGoats(data);

  if (scenario === 'primera') {
    return { ...data, preview: true, streaks: [] };
  }

  if (scenario === 'rachas') {
    const streaks: GoatMark[] = goats.map((g, i) => ({
      ...g,
      streak: i === 0 ? 4 : g.role === 'HEALER' && g.name === data.hps[0]?.name ? 3 : 2,
    }));
    return { ...data, preview: true, streaks };
  }

  return {
    ...data,
    preview: true,
    streaks: goats
      .filter(g => g.name === data.dps[0]?.name || g.name === data.hps[0]?.name)
      .map(g => ({ ...g, streak: g.role === 'DPS' ? 5 : 2 })),
  };
}
