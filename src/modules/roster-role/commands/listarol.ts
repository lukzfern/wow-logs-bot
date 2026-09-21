import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GatewayIntentBits,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Role,
} from 'discord.js';
import { buildPlanEmbed } from '../embed.js';
import { savePending } from '../pending.js';
import { buildRolePlan, roleManageError } from '../plan.js';
import { getPreset, setPreset, type RosterRoleMode } from '../store.js';

export const definition = new SlashCommandBuilder()
  .setName('listarol')
  .setDescription('Asignar un rol a una lista de nombres (export de Raid-Helper)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand(s => s
    .setName('setup')
    .setDescription('Guardar un preset (rol + modo) para este servidor')
    .addStringOption(o => o.setName('nombre').setDescription('Nombre del preset (ej: consumibles)').setRequired(true))
    .addRoleOption(o => o.setName('rol').setDescription('Rol a asignar').setRequired(true))
    .addStringOption(o => o.setName('modo').setDescription('Reemplazar saca el rol a quien no está en la lista').addChoices(
      { name: 'Reemplazar (recomendado)', value: 'replace' },
      { name: 'Solo agregar', value: 'add' },
    )))
  .addSubcommand(s => s
    .setName('preview')
    .setDescription('Ver el plan sin tocar roles')
    .addStringOption(o => o.setName('lista').setDescription('Export de nombres separados por espacio').setRequired(true))
    .addStringOption(o => o.setName('preset').setDescription('Preset guardado (ej: consumibles)'))
    .addRoleOption(o => o.setName('rol').setDescription('Rol (si no usás preset)')))
  .addSubcommand(s => s
    .setName('aplicar')
    .setDescription('Preparar la asignación (pide confirmación)')
    .addStringOption(o => o.setName('lista').setDescription('Export de nombres separados por espacio').setRequired(true))
    .addStringOption(o => o.setName('preset').setDescription('Preset guardado (ej: consumibles)'))
    .addRoleOption(o => o.setName('rol').setDescription('Rol (si no usás preset)')));

function resolveRole(interaction: ChatInputCommandInteraction, roleId: string): Role | null {
  return interaction.guild!.roles.cache.get(roleId) ?? null;
}

function resolveTarget(interaction: ChatInputCommandInteraction): { role: Role; mode: RosterRoleMode } | string {
  const presetName = interaction.options.getString('preset');
  const roleOpt = interaction.options.getRole('rol');
  if (presetName) {
    const preset = getPreset(interaction.guildId!, presetName);
    if (!preset) return `❌ No hay preset \`${presetName}\`. Usá \`/listarol setup\` primero.`;
    const role = resolveRole(interaction, preset.roleId);
    if (!role) return `❌ El rol del preset \`${presetName}\` ya no existe.`;
    return { role, mode: preset.mode };
  }
  if (roleOpt) {
    const role = resolveRole(interaction, roleOpt.id);
    if (!role) return '❌ No encontré ese rol en el servidor.';
    return { role, mode: 'replace' };
  }
  return '❌ Pasá un `preset` o un `rol`.';
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: '❌ Este comando solo funciona en un servidor.', flags: MessageFlags.Ephemeral });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === 'setup') {
    const name = interaction.options.getString('nombre', true).toLowerCase().trim();
    const roleOpt = interaction.options.getRole('rol', true);
    const mode = (interaction.options.getString('modo') ?? 'replace') as RosterRoleMode;
    const role = resolveRole(interaction, roleOpt.id);
    if (!role) {
      await interaction.reply({ content: '❌ Elegí un rol del servidor.', flags: MessageFlags.Ephemeral });
      return;
    }
    const err = roleManageError(interaction.guild, role);
    if (err) {
      await interaction.reply({ content: err, flags: MessageFlags.Ephemeral });
      return;
    }
    setPreset(interaction.guildId!, { name, roleId: role.id, mode });
    await interaction.reply({
      content:
        `✅ Preset **${name}** → ${role} · **${mode === 'replace' ? 'Reemplazar' : 'Solo agregar'}**.\n` +
        `Cada raid: \`/listarol aplicar preset:${name} lista:...\``,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.client.options.intents.has(GatewayIntentBits.GuildMembers)) {
    await interaction.reply({
      content:
        '❌ Falta **Server Members Intent** en el Discord Developer Portal.\n' +
        'Bot → Privileged Gateway Intents → activá **Server Members Intent** → Save → reiniciá el bot.\n' +
        'Hasta entonces los logs siguen funcionando; `/listarol` no puede leer el roster.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: sub === 'preview' ? MessageFlags.Ephemeral : undefined });
  const target = resolveTarget(interaction);
  if (typeof target === 'string') {
    await interaction.editReply(target);
    return;
  }

  const err = roleManageError(interaction.guild, target.role);
  if (err) {
    await interaction.editReply(err);
    return;
  }

  const list = interaction.options.getString('lista', true);
  const plan = await buildRolePlan(interaction.guild, list, target.role, target.mode);
  const embed = buildPlanEmbed(plan, sub === 'preview' ? '🧪 Preview — lista → rol' : 'Asignar roles');

  if (sub === 'preview') {
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (!plan.tokens.length) {
    await interaction.editReply('❌ La lista está vacía.');
    return;
  }

  const pending = savePending({
    guildId: interaction.guildId!,
    userId: interaction.user.id,
    roleId: plan.role.id,
    mode: plan.mode,
    addIds: plan.toAdd.map(m => m.id),
    removeIds: plan.toRemove.map(m => m.id),
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`rr:ok:${pending.id}`).setLabel('Confirmar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rr:no:${pending.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({
    content: 'Revisá el plan. **Confirmar** aplica los cambios (expira en 5 min).',
    embeds: [embed],
    components: [row],
  });
}
