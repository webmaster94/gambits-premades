export async function fancyFootwork({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if(args[0].macroPass === "preWaitForAttackRoll") {
        const currentTokenId = game.combat?.current?.tokenId;
        if(!currentTokenId) return;
        let actionType = workflow.activity?.actionType;
        if(actionType != "mwak" && actionType != "msak") return;
        let targetId = workflow.targets.first()?.id;
        if (!targetId) return;
        let currentCombatant = canvas.tokens.get(currentTokenId);
        if (currentCombatant?.id !== token.id) return;
        let existingTargets = await actor.getFlag("midi-qol", `oaFancyFootworkAttack`) || [];
        if (!existingTargets.includes(targetId)) {
            existingTargets.push(targetId);
        }
        await actor.setFlag("midi-qol", `oaFancyFootworkAttack`, existingTargets);
    }

    if(args[0] === "each") {
        await actor.unsetFlag("midi-qol", `oaFancyFootworkAttack`);
    }
}
