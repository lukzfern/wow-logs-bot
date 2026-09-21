import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { applyPending } from './apply.js';
import { peekPending, takePending } from './pending.js';

export async function handleRosterRoleButton(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith('rr:')) return false;

  const [, action, id] = interaction.customId.split(':');
  const pending = peekPending(id);
  if (!pending) {
    await interaction.reply({ content: '❌ Esta confirmación expiró. Corré `/listarol aplicar` de nuevo.', flags: MessageFlags.Ephemeral });
    return true;
  }
  if (pending.userId !== interaction.user.id) {
    await interaction.reply({ content: '❌ Solo quien corrió el comando puede confirmar.', flags: MessageFlags.Ephemeral });
    return true;
  }
  if (pending.guildId !== interaction.guildId) {
    await interaction.reply({ content: '❌ Esta confirmación es de otro servidor.', flags: MessageFlags.Ephemeral });
    return true;
  }
  takePending(id);

  if (action === 'no') {
    await interaction.update({ content: '❎ Cancelado. No se tocaron roles.', embeds: [], components: [] });
    return true;
  }

  if (!interaction.guild) {
    await interaction.reply({ content: '❌ Este comando solo funciona en un servidor.', flags: MessageFlags.Ephemeral });
    return true;
  }

  const total = pending.addIds.length + pending.removeIds.length;
  await interaction.update({
    content: total ? `⏳ Aplicando roles — \`[0/${total}]\`…` : '⏳ Aplicando roles…',
    embeds: [],
    components: [],
  });

  const result = await applyPending(interaction.guild, pending, async ({ step, total: n, action, name }) => {
    const verb = action === 'add' ? 'Asignando' : 'Sacando';
    await interaction.editReply({
      content: `⏳ \`[${step}/${n}]\` ${verb} **${name}**…`,
    }).catch(() => {});
  });

  let msg = `✅ Roles actualizados: **+${result.added}** · **−${result.removed}**.`;
  if (result.failed.length) {
    msg += `\n⚠️ No se pudo aplicar a: ${result.failed.slice(0, 10).join(', ')}`;
  }
  await interaction.editReply({ content: msg, embeds: [], components: [] });
  console.log(`[roster-role] ${interaction.guildId} +${result.added} -${result.removed} fail=${result.failed.length}`);
  return true;
}
