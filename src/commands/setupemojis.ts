import { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CLASS_ICONS: Record<string, string> = {
  wow_deathknight: 'class/deathknight.png',
  wow_druid: 'class/druid.png',
  wow_hunter: 'class/hunter.png',
  wow_mage: 'class/mage.png',
  wow_paladin: 'class/paladin.png',
  wow_priest: 'class/priest.png',
  wow_rogue: 'class/rogue.png',
  wow_shaman: 'class/shaman.png',
  wow_warlock: 'class/warlock.png',
  wow_warrior: 'class/warrior.png',
};

const SPEC_ICONS: Record<string, string> = {
  wow_dk_blood: 'spec/deathknight_blood.png', wow_dk_frost: 'spec/deathknight_frost.png', wow_dk_unholy: 'spec/deathknight_unholy.png',
  wow_druid_balance: 'spec/druid_balance.png', wow_druid_feral: 'spec/druid_feral.png', wow_druid_resto: 'spec/druid_restoration.png',
  wow_hunt_bm: 'spec/hunter_beastmastery.png', wow_hunt_mm: 'spec/hunter_marksman.png', wow_hunt_surv: 'spec/hunter_survival.png',
  wow_mage_arcane: 'spec/mage_arcane.png', wow_mage_fire: 'spec/mage_fire.png', wow_mage_frost: 'spec/mage_frost.png',
  wow_pal_holy: 'spec/paladin_holy.png', wow_pal_prot: 'spec/paladin_protection.png', wow_pal_ret: 'spec/paladin_retribution.png',
  wow_priest_disc: 'spec/priest_discipline.png', wow_priest_holy: 'spec/priest_holy.png', wow_priest_shadow: 'spec/priest_shadow.png',
  wow_rog_assa: 'spec/rogue_assassination.png', wow_rog_combat: 'spec/rogue_combat.png', wow_rog_sub: 'spec/rogue_subtlety.png',
  wow_sha_ele: 'spec/shaman_elemental.png', wow_sha_enh: 'spec/shaman_enhancement.png', wow_sha_resto: 'spec/shaman_restoration.png',
  wow_lock_aff: 'spec/warlock_affliction.png', wow_lock_demo: 'spec/warlock_demonology.png', wow_lock_destro: 'spec/warlock_destruction.png',
  wow_war_arms: 'spec/warrior_arms.png', wow_war_fury: 'spec/warrior_fury.png', wow_war_prot: 'spec/warrior_protection.png',
};

const SECTION_ICONS: Record<string, string> = {
  wow_dps: 'section/wow_dps.jpg',
  wow_healer: 'section/wow_healer.jpg',
  wow_deaths: 'section/wow_deaths_final.jpg',
  wow_interrupts: 'section/wow_interrupts.jpg',
};

export const definition = new SlashCommandBuilder()
  .setName('setupemojis')
  .setDescription('Subir iconos WoW como emojis del servidor')
  .addStringOption(o => o
    .setName('modo')
    .setDescription('Qué iconos subir')
    .setRequired(true)
    .addChoices(
      { name: '🎯 Specs — 34 emojis (spec icons + secciones, recomendado)', value: 'specs' },
      { name: '⚔️ Clases — 14 emojis (class icons + secciones)', value: 'classes' },
      { name: '📝 Solo texto — 0 emojis (no ocupa slots)', value: 'text' },
    ))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
  .setContexts(InteractionContextType.Guild);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: '❌ Este comando solo funciona en un servidor.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const modo = interaction.options.getString('modo', true);
  if (modo === 'text') {
    await interaction.editReply('✅ Los embeds mostrarán clase y spec en texto. No se necesitan emojis.');
    return;
  }

  const iconsDir = join(process.cwd(), 'assets', 'icons');
  const existing = interaction.guild.emojis.cache;

  const selectedIcons = modo === 'specs'
    ? { ...SPEC_ICONS, ...SECTION_ICONS }
    : { ...CLASS_ICONS, ...SECTION_ICONS };

  const toUpload = Object.entries(selectedIcons).filter(([name]) => !existing.find(e => e.name === name));
  const skipped = Object.keys(selectedIcons).length - toUpload.length;
  let created = 0;
  let failed = 0;

  if (!toUpload.length) {
    await interaction.editReply(`✅ Los **${skipped}** emojis ya estaban subidos. No hay nada que hacer.`);
    return;
  }

  await interaction.editReply(`Subiendo **${toUpload.length}** emojis (${skipped} ya existían)...`);

  for (let i = 0; i < toUpload.length; i++) {
    const [emojiName, filePath] = toUpload[i];
    const progress = `[${i + 1}/${toUpload.length}]`;

    await interaction.editReply(`${progress} Subiendo \`${emojiName}\`...`);
    console.log(`[emojis] ${progress} Uploading ${emojiName}...`);

    try {
      const image = readFileSync(join(iconsDir, filePath));
      const uploadPromise = interaction.guild.emojis.create({
        attachment: image,
        name: emojiName,
        reason: 'WoW Logs Bot — class/spec icons',
      });
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
      await Promise.race([uploadPromise, timeout]);
      created++;
      console.log(`[emojis] ✅ ${emojiName}`);
    } catch (err) {
      const reason = err instanceof Error && err.message === 'timeout' ? 'timeout (rate-limited?)' : (err instanceof Error ? err.message : String(err));
      failed++;
      await interaction.editReply(`${progress} ❌ \`${emojiName}\` falló: ${reason}`).catch(() => {});
      console.error(`[emojis] ❌ ${emojiName}: ${reason}`);
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  let summary = '';
  if (failed === 0 && created === 0) {
    summary = `✅ Los **${skipped}** emojis ya estaban subidos.`;
  } else if (failed === 0) {
    summary = `✅ **${created}** emojis subidos correctamente.`;
  } else if (created === 0 && failed > 0) {
    summary = `❌ No se pudieron subir **${failed}** emojis. Esperá unos minutos e intentá de nuevo — Discord limita la velocidad de subida.`;
  } else {
    summary = `**${created}** emojis subidos · **${failed}** fallaron. Esperá unos minutos y corré \`/setupemojis\` de nuevo para reintentar los faltantes.`;
  }
  if (skipped > 0 && (created > 0 || failed > 0)) {
    summary += `\n${skipped} ya existían.`;
  }
  if (created > 0) {
    summary += '\n\nLos embeds del bot ahora mostrarán los iconos automáticamente.';
  }

  await interaction.editReply(summary);
}
