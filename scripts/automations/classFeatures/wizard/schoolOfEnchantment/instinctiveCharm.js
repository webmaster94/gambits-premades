export async function instinctiveCharm({workflowData,workflowType,workflowCombat}) {
    const workflow = await MidiQOL.Workflow.getWorkflow(workflowData);
    if(!workflow) return;
    const gpsUuid = "b9a797f2-3262-4a89-9b32-d8482a0c5f29";
    if(workflow.item.flags["gambits-premades"]?.gpsUuid === gpsUuid) return;
    let itemName = "Instinctive Charm";
    let dialogId = gpsUuid;
    let target = workflow.token;
    let debugEnabled = MidiQOL.safeGetGameSetting('gambits-premades', 'debugEnabled');
    let gmUser = game.gps.getPrimaryGM();
    const initialTimeLeft = Number(MidiQOL.safeGetGameSetting('gambits-premades', `${itemName} Timeout`));

    let findValidTokens = game.gps.findValidTokens({initiatingToken: workflow.token, targetedToken: null, itemName: itemName, itemType: null, itemChecked: null, reactionCheck: true, sightCheck: true, rangeCheck: true, rangeTotal: 30, dispositionCheck: false, dispositionCheckType: null, workflowType: workflowType, workflowCombat: workflowCombat, gpsUuid: gpsUuid});
    
    let browserUser;
    
    for (const validTokenPrimary of findValidTokens) {
        let targets = canvas.tokens.placeables.filter(t => t.document.uuid !== validTokenPrimary.document.uuid && t.document.uuid !== target.document.uuid && MidiQOL.canSee(target, t) && MidiQOL.computeDistance(target, t, true) <= workflow.item.system.range.value);

        if(targets.length === 0) {
            if(debugEnabled) game.gps.logInfo(`${itemName} for ${validTokenPrimary.actor.name} failed at alternate target within range`);
            return;
        }
    
        const targetUuids = targets.map(t => t.document.uuid);
        const targetNames = targets.map(t => t.document.name);

        targetUuids.map((uuid, index) => 
            `<option value="${uuid}">${targetNames[index]}</option>`
        ).join('');
        
        let chosenItem = validTokenPrimary.actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === gpsUuid);
        let itemProperName = chosenItem?.name;
        if(target.actor.appliedEffects.some(e => e.name === `${itemProperName} - Immunity` && !e.duration?.expired)) return;
        const dialogTitlePrimary = `${validTokenPrimary.actor.name} | ${itemProperName}`;
        const dialogTitleGM = game.i18n.format("GAMBITSPREMADES.Dialogs.Common.WaitingForSelection", { actorName: validTokenPrimary.actor.name, itemName: itemProperName });
        browserUser = game.gps.getBrowserUser({ actorUuid: validTokenPrimary.actor.uuid });

        let dialogContent = `
            <div class="gps-dialog-container">
                <div class="gps-dialog-section">
                    <div class="gps-dialog-content">
                        <div>
                            <div class="gps-dialog-flex">
                                <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Wizard.SchoolOfEnchantment.InstinctiveCharm.Prompt", { itemProperName: itemProperName })}</p>
                                <div id="image-container" class="gps-dialog-image-container">
                                    <img id="img_${dialogId}" src="${chosenItem.img}" class="gps-dialog-image">
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

        let content = `<span style='text-wrap: wrap;'><img src="${validTokenPrimary.actor.img}" style="width: 25px; height: auto;" /> ${game.i18n.format("GAMBITSPREMADES.ChatMessages.Automations.ClassFeatures.Wizard.SchoolOfEnchantment.InstinctiveCharm.OptionAvailableAttackTrigger", { actorName: validTokenPrimary.actor.name, itemProperName: itemProperName })}</span>`
        let chatData = { author: gmUser, content: content, roll: false };
        let notificationMessage = await MidiQOL.socket().executeAsUser("createChatMessage", gmUser, { chatData });

        let result;

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
            const options = {
                showFullCard: false,
                createWorkflow: true,
                versatile: false,
                configureDialog: true,
                targetUuids: [target.document.uuid],
            };

            let itemRoll;
            if(source && source === "user") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", browserUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });
            else if(source && source === "gm") itemRoll = await MidiQOL.socket().executeAsUser("completeItemUse", gmUser, { itemData: chosenItem, actorUuid: validTokenPrimary.actor.uuid, options: options });

            if(!itemRoll) continue;

            await game.gps.addReaction({actorUuid: `${validTokenPrimary.actor.uuid}`});

            let dialogIdTarget = "instinctivecharmtarget";
            let browserUserTarget = game.gps.getBrowserUser({ actorUuid: target.actor.uuid });

            const spellDC = validTokenPrimary.actor.system.attributes.spell.dc;
            let saveAbility = "wis";
            const saveActivityId = "instCharmSave001";

            const itemData = {
                name: `${itemProperName} Save`,
                type: "feat",
                img: chosenItem.img,
                effects: [],
                flags: {
                    "midi-qol": {
                        noProvokeReaction: true,
                        onUseMacroName: null,
                        forceCEOff: true
                    },
                    "midiProperties": {
                        magiceffect: true
                    }

                },
                system: {
                    activities: {
                        [saveActivityId]: {
                            _id: saveActivityId,
                            type: "save",
                            activation: {
                                type: "special",
                                value: null,
                                override: false
                            },
                            consumption: {
                                targets: [],
                                scaling: {
                                    allowed: false,
                                    max: ""
                                },
                                spellSlot: false
                            },
                            description: {
                                // This synthetic save has no visual component. The opt-out also
                                // prevents Autoanimations from trying to migrate an unsaved Item.
                                chatFlavor: "[noaa]"
                            },
                            duration: {
                                units: "inst",
                                concentration: false,
                                override: false
                            },
                            effects: [],
                            range: {
                                override: false,
                                units: "any"
                            },
                            target: {
                                prompt: false,
                                template: {
                                    contiguous: false,
                                    units: "ft"
                                },
                                affects: {
                                    choice: false,
                                    count: "1",
                                    type: "creature"
                                },
                                override: true
                            },
                            uses: {
                                spent: 0,
                                max: "",
                                recovery: []
                            },
                            damage: {
                                onSave: "none",
                                parts: [],
                                critical: {
                                    allow: false
                                }
                            },
                            save: {
                                ability: [saveAbility],
                                dc: {
                                    calculation: "",
                                    formula: `${spellDC}`
                                }
                            },
                            midiProperties: {
                                identifier: "instinctiveCharmSave",
                                automationOnly: false,
                                triggeredActivityId: "none",
                                triggeredActivityTargets: "targets",
                                triggeredActivityRollAs: "self",
                                autoConsume: false,
                                confirmTargets: "default",
                                autoTargetType: "any",
                                autoTargetAction: "default",
                                otherActivityCompatible: false,
                                otherActivityAsParentType: true
                            },
                            name: `${itemProperName} Save`
                        }
                    }
                },
            };
            const itemUpdateTarget = new CONFIG.Item.documentClass(itemData, {parent: validTokenPrimary.actor});
            const optionsTarget = {
                midiOptions: {
                    targetUuids: [target.document.uuid],
                    noOnUseMacro: true,
                    configureDialog: false,
                    showFullCard: false,
                    ignoreUserTargets: true,
                    checkGMStatus: true,
                    autoRollAttack: true,
                    autoRollDamage: "always",
                    fastForwardAttack: true,
                    fastForwardDamage: true,
                    workflowData: true
                }
            };
            const saveResult = await MidiQOL.completeItemUse(itemUpdateTarget, optionsTarget, {}, {});
            if(!saveResult) continue;
            const hasCharmImmunity = target.actor.system.traits.ci.value.has("charmed");
            if (saveResult.failedSaves.size !== 0 && !hasCharmImmunity) {
                let dialogContentTarget = `
                    <div class="gps-dialog-container">
                        <div class="gps-dialog-section">
                            <div class="gps-dialog-content">
                                <p class="gps-dialog-paragraph">${game.i18n.format("GAMBITSPREMADES.Dialogs.Automations.ClassFeatures.Wizard.SchoolOfEnchantment.InstinctiveCharm.ForcedSelectNew", { itemProperName: itemProperName })}</p>
                                <div>
                                    <div class="gps-dialog-flex">
                                        <label for="enemy-token" class="gps-dialog-label">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Target")}</label>
                                        <select id="enemy-token" class="gps-dialog-select">
                                            ${targetNames.map((name, index) => `<option class="gps-dialog-option" value="${targetUuids[index]}">${name}</option>`).join('')}
                                        </select>
                                        <div id="image-container" class="gps-dialog-image-container">
                                            <img id="img_${dialogIdTarget}" src="${chosenItem.img}" class="gps-dialog-image">
                                        </div>
                                    </div>
                                    <div class="gps-dialog-flex">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="gps-dialog-button-container">
                            <button id="pauseButton_${dialogIdTarget}" type="button" class="gps-dialog-button">
                                <i class="fas fa-pause" id="pauseIcon_${dialogIdTarget}" style="margin-right: 5px;"></i>${game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Pause")}
                            </button>
                        </div>
                    </div>
                `;

                let resultTarget;
        
                if (MidiQOL.safeGetGameSetting('gambits-premades', 'Mirror 3rd Party Dialog for GMs') && browserUserTarget !== gmUser) {
                    let userDialogArgsTarget = { dialogTitle:dialogTitlePrimary,dialogContent: dialogContentTarget,dialogId: dialogIdTarget,initialTimeLeft,validTokenPrimaryUuid: target.document.uuid,source: "user",type: "multiDialog", browserUser: browserUserTarget, notificationId: notificationMessage._id };
                    
                    let gmDialogArgsTarget = { dialogTitle:dialogTitleGM,dialogContent: dialogContentTarget,dialogId: dialogIdTarget,initialTimeLeft,validTokenPrimaryUuid: target.document.uuid,source: "gm",type: "multiDialog", notificationId: notificationMessage._id };
                
                    resultTarget = await game.gps.socket.executeAsUser("handleDialogPromises", gmUser, {
                        userDialogArgs: userDialogArgsTarget,
                        gmDialogArgs: gmDialogArgsTarget
                    });
                } else {
                    resultTarget = await game.gps.socket.executeAsUser("process3rdPartyReactionDialog", browserUserTarget, {dialogTitle:dialogTitlePrimary,dialogContent: dialogContentTarget,dialogId: dialogIdTarget,initialTimeLeft,validTokenPrimaryUuid: target.document.uuid,source: gmUser === browserUserTarget ? "gm" : "user",type:"singleDialog"});
                }
        
                const { enemyTokenUuid } = resultTarget;

                let newTarget = await fromUuid(enemyTokenUuid);
                workflow.targets.delete(validTokenPrimary);
                workflow.targets.add(newTarget.object);
                return;
            }
            else {
                if(hasCharmImmunity) ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.ClassFeatures.Wizard.SchoolOfEnchantment.InstinctiveCharm.CharmImmunity"));
                let effectData = [
                    {
                        "img": `${chosenItem.img}`,
                        "origin": `${validTokenPrimary.actor.uuid}`,
                        "disabled": false,
                        "name": `${chosenItem.name} - Immunity`,
                        "transfer": false,
                        "flags": {
                            "dae": {
                                "specialDuration": [
                                    "longRest"
                                ]
                            }
                        }
                    }
                ];
                await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: target.actor.uuid, effects: effectData });

                continue;
            }
        }
    }
}
