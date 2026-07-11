function gpsEscapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[character]);
}

async function createLegendaryResistanceChatCard({ validTokenPrimary, itemProperName, remainingUses, maxUses, gmUser, gpsUuid }) {
    const actorName = gpsEscapeHTML(validTokenPrimary.actor.name);
    const itemName = gpsEscapeHTML(itemProperName);
    const outcomeKey = "GAMBITSPREMADES.Dialogs.Automations.MonsterFeatures.LegendaryResistance.Outcome";
    const usedKey = "GAMBITSPREMADES.Dialogs.Automations.MonsterFeatures.LegendaryResistance.Used";
    const remainingKey = "GAMBITSPREMADES.Dialogs.Automations.MonsterFeatures.LegendaryResistance.RemainingUses";
    const outcomeLocalized = game.i18n.localize(outcomeKey);
    const usedLocalized = game.i18n.format(usedKey, { actorName, itemName });
    const remainingLocalized = game.i18n.format(remainingKey, { remaining: remainingUses, max: maxUses });
    const outcomeText = outcomeLocalized === outcomeKey ? "Failed Save -> Success" : outcomeLocalized;
    const usedText = usedLocalized === usedKey ? `${actorName} uses ${itemName} to turn a failed saving throw into a success.` : usedLocalized;
    const remainingText = remainingLocalized === remainingKey ? `${remainingUses} of ${maxUses} Legendary Resistances remaining.` : remainingLocalized;
    const content = `
        <div class="gps-legendary-resistance-card" style="border: 1px solid rgba(120, 92, 42, 0.45); border-left: 4px solid #8a6a2f; border-radius: 5px; background: rgba(255, 255, 255, 0.06); padding: 8px 10px;">
            <div style="font-weight: 700; font-size: 14px; line-height: 1.2; color: inherit;">${itemName}</div>
            <div style="margin-top: 4px; line-height: 1.35;">${usedText}</div>
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px;">
                <span style="border: 1px solid rgba(57, 132, 74, 0.35); border-radius: 4px; background: rgba(57, 132, 74, 0.12); color: #2f7d42; font-weight: 700; padding: 2px 6px;">${outcomeText}</span>
                <span style="opacity: 0.82;">${remainingText}</span>
            </div>
        </div>
    `;
    const chatData = {
        author: gmUser,
        speaker: ChatMessage.getSpeaker({ token: validTokenPrimary }),
        content,
        flags: {
            "gambits-premades": {
                gpsUuid,
                legendaryResistanceUsed: true,
                tokenUuid: validTokenPrimary.document.uuid
            }
        }
    };
    await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });
}

export async function legendaryResistance({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "d8956f7f-bc03-4ff1-8990-b48ffdef44cb";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Legendary Resistance";
    let dialogId = gpsUuid;
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: "feature", itemChecked: ["legres"], reactionCheck: false, sightCheck: false, rangeCheck: false, rangeTotal: null, dispositionCheck: false, dispositionCheckType: null, workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});

    let browserUser;

    for (const validTokenPrimary of findValidTokens) {
        let failedToken = workflow.failedSaves.has(validTokenPrimary)
            ? validTokenPrimary
            : Array.from(workflow.failedSaves).find(t => t.document?.uuid === validTokenPrimary.document.uuid);
        if(!failedToken) continue;

        const identifiedLegendaryResistance = validTokenPrimary.actor.identifiedItems?.get?.("legendary-resistance", { type: "feat" });
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid)
            ?? validTokenPrimary.actor.items.find(i => i.identifier === "legendary-resistance")
            ?? identifiedLegendaryResistance?.first?.()
            ?? identifiedLegendaryResistance;
        let itemProperName = chosenItem?.name ?? itemName;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemProperName });
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.MonsterFeatures.LegendaryResistance.PromptUseLegendaryResistance", { actorName: validTokenPrimary.actor.name, itemName: itemProperName  })}</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${chosenItem?.img ?? validTokenPrimary.actor.img}" class="gps-dialog-image">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="gps-dialog-button-container">
                    <button id="pauseButton_${dialogId}" type="button" class="gps-dialog-button">
                        <i class="fas fa-pause" id="pauseIcon_${dialogId}" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}
                    </button>
                </div>
            </div>
        `;

        let result;

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Common.ReactionAvailableRollTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`
        let chatData = { author: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUser !== gmUser) {
            let userDialogArgs = { dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "user",type: "multiDialog", browserUser: browserUser, notificationId: notificationMessage._id };
            
            let gmDialogArgs = { dialogTitle:dialogTitleGM,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
        
            result = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {userDialogArgs, gmDialogArgs});
        } else {
            result = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUser, {dialogTitle:dialogTitlePrimary,dialogContent,dialogId,initialTimeLeft,validTokenPrimaryUuid: validTokenPrimary.document.uuid,source: gmUser === browserUser ? "gm" : "user",type:"singleDialog", notificationId: notificationMessage._id});
        }

        const { userDecision, enemyTokenUuid, allyTokenUuid, damageChosen, source, type } = result || {};

        if (!userDecision) {
            continue;
        }
        else if (userDecision) {
            const legres = validTokenPrimary.actor.system.resources?.legres;
            if((legres?.value ?? 0) <= 0) continue;
            const remainingUses = Math.max(Number(legres.value ?? 0) - 1, 0);
            const maxUses = Number.isFinite(Number(legres.max)) ? Number(legres.max) : "?";
            const itemRoll = await game.gps.socket.executeAsUser("gmUpdateActor", gmUser, {
                actorUuid: validTokenPrimary.actor.uuid,
                updates: {"system.resources.legres.spent": (legres.spent ?? 0) + 1}
            });
            if(!itemRoll) continue;

            workflow.saves.add(failedToken);
            workflow.failedSaves.delete(failedToken);
            workflow.legendaryResistanceUsed = true;
            await createLegendaryResistanceChatCard({ validTokenPrimary, itemProperName, remainingUses, maxUses, gmUser, gpsUuid });
        }
    }
}
