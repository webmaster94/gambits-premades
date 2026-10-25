import { initCAT } from './utils/catIntegration.js';
import { chooseTeleportDestination, chooseTeleportTraveler } from './utils/teleport.js';
import { registerSettings } from './utils/settings.js';
import { registerHooks } from "./utils/hooks.js";
import { daeInitFlags, daeInjectFlags } from "./utils/hookUtils.js"
import { automationRegistry } from "./automations/index.js";
import { automationRegistry2024 } from "./automations2024/index.js";
import { registerWrapping, updateSettings } from "./utils/hookUtils.js";
import * as helpers from "./utils/helpers.js";
import { weaponAnimations } from "./utils/animationUtils.js";
import { animation } from './animations/_index.js';
import { registerCatConfig } from "./utils/catUtils.js";
import { deleteEnervationEffect } from "./automations/spells/enervation.js";

Hooks.once("catReady", registerCatConfig);
Hooks.on("updateSetting", setting => {
    if (setting.key === "cat.automationSources") return registerCatConfig();
});

Hooks.once('init', async function() {
    registerSettings();
    initCAT();
    helpers.registerDialogQueries();
    helpers.registerSpellVisuals();
    helpers.registerRemoteQueries({
        gm: {
            addReaction: helpers.addReaction,
            claimRegionEscape: helpers.claimRegionEscape,
            consumeDrafynMote: helpers.consumeDrafynMote,
            deleteChatMessage: helpers.deleteChatMessage,
            deleteEnervationEffect: deleteEnervationEffect,
            ensureFreedomEscape: helpers.ensureFreedomEscape,
            ensureRegionEscape: helpers.ensureRegionEscape,
            gmDeleteItem: helpers.gmDeleteItem,
            gmIdentifyItem: helpers.gmIdentifyItem,
            gmSetFlag: helpers.gmSetFlag,
            gmToggleStatus: helpers.gmToggleStatus,
            gmUpdateDisposition: helpers.gmUpdateDisposition,
            gpsActivityUpdate: helpers.gpsActivityUpdate,
            gpsApplyTempHp: helpers.gpsApplyTempHp,
            huntersSenseResult: helpers.huntersSenseResult,
            initializeDrafynMotes: helpers.initializeDrafynMotes,
            moveTokenByCardinal: helpers.moveTokenByCardinal,
            moveTokenByOriginPoint: helpers.moveTokenByOriginPoint,
            prepareRegion: helpers.prepareRegion,
            refundCounterspellSlot: helpers.refundCounterspellSlot,
            replaceChatCard: helpers.replaceChatCard,
            resolveHearthSpirit: helpers.resolveHearthSpirit,
            requestFuryOfTheSmall: helpers.requestFuryOfTheSmall,
            setRegionStatus: helpers.setRegionStatus,
            setSpellVisual: helpers.setSpellVisual,
        },
        user: {
            playSpellVisual: helpers.playSpellVisual,
            playCounterspellAnimation: helpers.playCounterspellAnimation,
            playSilveryBarbsAnimation: helpers.playSilveryBarbsAnimation,
            gpsActivityUse: helpers.gpsActivityUse,
            remoteCompleteItemUse: helpers.remoteCompleteItemUse,
            rollAsUser: helpers.rollAsUser,
            useRegionEscape: helpers.useRegionEscape,
        }
    });
    helpers.registerDetectionModes();
    game.gpsSettings = game.gpsSettings || {};
    updateSettings();
    daeInitFlags();

    if(game.settings.get('gambits-premades', 'enableTokenMovementSpeed') && !isNaN(game.settings.get('gambits-premades', 'tokenMovementSpeed'))) CONFIG.Token.movement.defaultSpeed = game.settings.get('gambits-premades', 'tokenMovementSpeed');

    Hooks.on("dae.modifySpecials", (specKey, specials) => {
        specials["flags.gambits-premades.oaImmunity"] = [new foundry.data.fields.StringField(), 5];
        specials["flags.gambits-premades.oaSuppression"] = [new foundry.data.fields.StringField(), 5];
        specials["flags.gambits-premades.oaDisadvantage"] = [new foundry.data.fields.StringField(), 5];
        specials["flags.gambits-premades.oaDisadvantageSource"] = [new foundry.data.fields.StringField(), 5];
    });

    registerWrapping();
    helpers.registerRulesReviewHooks();
});

Hooks.once('ready', async function() {
    game.gps = {
        ...game.gps,
        ...helpers,
        ...automationRegistry,
        ...automationRegistry2024,
        weaponAnimations,
        disableRegionTeleport: false,
        animation,
        logInfo: helpers.logInfo,
        chooseTeleportDestination,
        chooseTeleportTraveler
    };

    if(game.user.isGM && !game.settings.get("gambits-premades", "primaryGM")) game.settings.set("gambits-premades", "primaryGM", game.users.activeGM?.id);

    registerHooks();
    daeInjectFlags();
    await game.gps.syncOpportunityAttackRegions();

});
