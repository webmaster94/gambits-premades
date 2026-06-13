export async function fortunesFavor({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    const d20 = workflow.attackRoll.terms[0].results[0].result ? workflow.attackRoll.terms[0].results[0].result : workflow.attackRoll.total;
    if (!await foundry.applications.api.DialogV2.confirm({window: {title: this.name}, content: `${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.Spells.FortunesFavor.PromptRerollAttackRoll", { itemName: item.name })} <strong>${d20}</strong>`, yes: {default: true}})) return;
    const reRoll = await workflow.attackRoll.reroll({async: true});
    const red20 = reRoll.terms[0].results[0].result ? reRoll.terms[0].results[0].result : reRoll.total;
    if (await foundry.applications.api.DialogV2.confirm({window: {title: this.name}, content: game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.Spells.FortunesFavor.ReplaceRoll", { oldRoll: d20, newRoll: red20 }), yes: {default: true}}))
    workflow.setAttackRoll(reRoll);
    const effectsToDelete = actor.appliedEffects.filter(ef => ef.origin === item.uuid);
    if (effectsToDelete.length > 0) await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete.map(ef => ef.id))
}