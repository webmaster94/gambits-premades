export async function biohazard({speaker, actor, character, item, args, scope, workflow, options, tokenUuid, regionUuid, regionScenario, regionStatus, userId}) {
    let gmUser = game.gps.getPrimaryGM();

    if (args?.[0]?.macroPass === "templatePlaced") {
        const template = await fromUuid(workflow.templateUuid);
        await template.setFlag("gambits-premades", "biohazardCastLevel", workflow.castData.castLevel - 1)
        game.gps.animation.biohazard({template, itemUuid: workflow.item.uuid});
        return;
    }

    if(!tokenUuid || !regionUuid || !regionScenario) return;

    if(game.user.id !== userId) return;

    let region = await fromUuid(regionUuid);
    let template;
    if(region?.flags["region-attacher"]?.attachedTemplate) {
        template = await fromUuid(region.flags["region-attacher"].attachedTemplate);
    }
    else return;
    
    let tokenDocument = await fromUuid(tokenUuid);
    let token = tokenDocument?.object;

    if (!MidiQOL.isTargetable(token)) return;

    if ((token.actor.type !== 'npc' && token.actor.type !== 'character')) return;

    let chosenItem = await fromUuid(region.flags["region-attacher"].itemUuid);
    let castLevel = template.getFlag("gambits-premades", "biohazardCastLevel");
    const combatRound = game.combat?.round;
    const biohazardRoundKey = Number.isInteger(combatRound) ? `${token.id}_${combatRound}` : null;
    const damagedThisTurn = await region.getFlag("gambits-premades", "checkBiohazardRound");
    if(biohazardRoundKey && damagedThisTurn === biohazardRoundKey) return;

    let resumeMovement;
    if(regionScenario === "tokenEnter") resumeMovement = await tokenDocument.pauseMovement();

    let activityToUpdate = chosenItem.system.activities.find(a => a.identifier === "syntheticSave");
    let damageParts = foundry.utils.duplicate(activityToUpdate.damage.parts);
    damageParts[0].number = castLevel;

    await game.gps.socket.executeAsUser("gpsActivityUpdate", gmUser, { activityUuid: activityToUpdate.uuid, updates: {"damage.parts": damageParts} });
    await game.gps.gpsActivityUse({itemUuid: chosenItem.uuid, identifier: "syntheticSave", targetUuid: token.document.uuid});
    
    if (biohazardRoundKey) {
        await game.gps.socket.executeAsUser("gmSetFlag", gmUser, { flagDocumentUuid: region.uuid, key: "checkBiohazardRound", value: biohazardRoundKey });
    }
    if(regionScenario === "tokenEnter") await resumeMovement();
}
