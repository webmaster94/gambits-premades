import { catDialog } from '../../utils/catDialog.js';
export async function bootsOfSpeed({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    if (args[0].macroPass === "preItemRoll") {
        if(!actor.appliedEffects.some(e => e.name === "Boots of Speed" && !e.duration?.expired)) return;

        await catDialog.wait({
            window: { title: game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Items.BootsOfSpeed.Windowtitle") },
            content: `
                <div class="gps-dialog-container">
                    <div class="gps-dialog-section">
                        <div class="gps-dialog-content">
                            <div>
                                <div class="gps-dialog-flex">
                                    <p class="gps-dialog-paragraph">${game.i18n.localize("GAMBITSPREMADES.Dialogs.Automations.Items.BootsOfSpeed.Prompt")}</p>
                                    <div id="image-container" class="gps-dialog-image-container">
                                        <img src="${item.img}" class="gps-dialog-image">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            buttons: [
            {
                action: "Yes",
                label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.Yes"),
                callback: async () => {
                    await updateEffect(actor,item);
                    workflow.aborted = true;
                }
            },
            {
                action: "No",
                label: game.i18n.localize("GAMBITSPREMADES.Dialogs.Common.No"),
                callback: async () => {
                    return false;
                }
            }],
            close: async () => {return false;},
            rejectClose: false
        });
    }

    if(args[0] === "off" && args[2]["expiry-reason"]?.includes("longRest")) {
        await updateEffect(actor, item, 100);
        let effectData = await actor.allApplicableEffects().find(e => e.flags["gambits-premades"]?.gpsUuid === "61bf2fcd-bc81-4b38-a4bb-41bc2159c9cf");
        await effectData.update({"disabled" : false, "duration.expired" : false});
    }

    else if(args[0] === "off" && args[2].efData.flags["gambits-premades"]?.gpsUuid === "61bf2fcd-bc81-4b38-a4bb-41bc2159c9cf") {
        let effectDataCurrent = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "6274a76f-2c25-4f80-8cc0-70e02f8d880c");
        if(effectDataCurrent) await effectDataCurrent.delete();
        let effectData = await actor.allApplicableEffects().find(e => e.flags["gambits-premades"]?.gpsUuid === "61bf2fcd-bc81-4b38-a4bb-41bc2159c9cf");
        await effectData.update({"disabled" : false, "duration.expired" : false});
    }

    else if(args[0] === "off" && args[2].efData.flags["gambits-premades"]?.gpsUuid === "6274a76f-2c25-4f80-8cc0-70e02f8d880c") {
        await updateEffect(actor, item);
        let expiredEffect = actor.effects.find(e => e.flags["gambits-premades"]?.gpsUuid === "6274a76f-2c25-4f80-8cc0-70e02f8d880c" && e.duration?.expired);
        if(expiredEffect) await expiredEffect.delete();
        let effectData = await actor.allApplicableEffects().find(e => e.flags["gambits-premades"]?.gpsUuid === "61bf2fcd-bc81-4b38-a4bb-41bc2159c9cf");
        await effectData.update({"disabled" : false, "duration.expired" : false});
    }

    async function updateEffect(actor, item, duration) {
        item = actor.items.find(i => i.flags["gambits-premades"]?.gpsUuid === "6274a76f-2c25-4f80-8cc0-70e02f8d880c")
        let effectData = await item.effects.find(e => e.flags["gambits-premades"]?.gpsUuid === "6274a76f-2c25-4f80-8cc0-70e02f8d880c");
        let effectDataCurrent = args?.[2]?.efData;
        let manualTrigger = false;
        if(!effectDataCurrent) {
            effectDataCurrent = actor.appliedEffects.find(e => e.flags["gambits-premades"]?.gpsUuid === "6274a76f-2c25-4f80-8cc0-70e02f8d880c");
            manualTrigger = true;
        }
        let currentSeconds = effectDataCurrent?.duration?.units === "seconds" ? effectDataCurrent?.duration?.value : undefined;
        let currentRounds;
        if(!currentSeconds) currentRounds = effectDataCurrent?.duration?.units === "rounds" ? effectDataCurrent?.duration?.value : undefined;
        else currentRounds = currentSeconds / 6;
        if(currentRounds || duration) {
            await effectData.update({ "duration.value": duration ? duration : currentRounds, "duration.units": "rounds" });
        }
        if(manualTrigger) await effectDataCurrent.delete();
    }
}