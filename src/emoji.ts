import type { Guild } from 'discord.js';

const CLASS_EMOJI_NAMES: Record<string, string> = {
  'Death Knight': 'wow_deathknight',
  'Druid': 'wow_druid',
  'Hunter': 'wow_hunter',
  'Mage': 'wow_mage',
  'Paladin': 'wow_paladin',
  'Priest': 'wow_priest',
  'Rogue': 'wow_rogue',
  'Shaman': 'wow_shaman',
  'Warlock': 'wow_warlock',
  'Warrior': 'wow_warrior',
};

// API spec name → emoji name, keyed by "Class|Spec"
const SPEC_EMOJI_NAMES: Record<string, string> = {
  'Death Knight|Blood': 'wow_dk_blood', 'Death Knight|Frost': 'wow_dk_frost', 'Death Knight|Unholy': 'wow_dk_unholy',
  'Druid|Balance': 'wow_druid_balance', 'Druid|Feral Combat': 'wow_druid_feral', 'Druid|Restoration': 'wow_druid_resto',
  'Hunter|Beast Mastery': 'wow_hunt_bm', 'Hunter|Marksmanship': 'wow_hunt_mm', 'Hunter|Survival': 'wow_hunt_surv',
  'Mage|Arcane': 'wow_mage_arcane', 'Mage|Fire': 'wow_mage_fire', 'Mage|Frost': 'wow_mage_frost',
  'Paladin|Holy': 'wow_pal_holy', 'Paladin|Protection': 'wow_pal_prot', 'Paladin|Retribution': 'wow_pal_ret',
  'Priest|Discipline': 'wow_priest_disc', 'Priest|Holy': 'wow_priest_holy', 'Priest|Shadow': 'wow_priest_shadow',
  'Rogue|Assassination': 'wow_rog_assa', 'Rogue|Combat': 'wow_rog_combat', 'Rogue|Subtlety': 'wow_rog_sub',
  'Shaman|Elemental': 'wow_sha_ele', 'Shaman|Enhancement': 'wow_sha_enh', 'Shaman|Restoration': 'wow_sha_resto',
  'Warlock|Affliction': 'wow_lock_aff', 'Warlock|Demonology': 'wow_lock_demo', 'Warlock|Destruction': 'wow_lock_destro',
  'Warrior|Arms': 'wow_war_arms', 'Warrior|Fury': 'wow_war_fury', 'Warrior|Protection': 'wow_war_prot',
};

const SECTION_EMOJI_NAMES: Record<string, string> = {
  encounters: 'wow_encounters',
  dps: 'wow_dps',
  healer: 'wow_healer',
  deaths: 'wow_deaths',
  interrupts: 'wow_interrupts',
  consumables: 'wow_consumables',
};

export interface EmojiMap {
  spec(className: string, specName: string): string;
  cls(className: string): string;
  section(key: string, fallback: string): string;
}

export const FALLBACK_EMOJIS: EmojiMap = {
  spec: () => '',
  cls: () => '',
  section: (_key, fallback) => fallback,
};

export function resolveEmojis(guild: Guild | null | undefined): EmojiMap {
  const cache = guild?.emojis.cache;
  if (!cache || cache.size === 0) return FALLBACK_EMOJIS;

  function find(name: string): string | null {
    const emoji = cache!.find(e => e.name === name);
    return emoji ? `<:${emoji.name}:${emoji.id}>` : null;
  }

  return {
    spec(className: string, specName: string): string {
      const key = `${className}|${specName}`;
      const name = SPEC_EMOJI_NAMES[key];
      return name ? (find(name) ?? '') : '';
    },
    cls(className: string): string {
      const name = CLASS_EMOJI_NAMES[className];
      return name ? (find(name) ?? '') : '';
    },
    section(key: string, fallback: string): string {
      const name = SECTION_EMOJI_NAMES[key];
      return name ? (find(name) ?? fallback) : fallback;
    },
  };
}
