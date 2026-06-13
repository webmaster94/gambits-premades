import {
    showLightDialog,
    lightExtinguish
} from "../../utils/lightActions.js";
  
export async function lanternHooded({ speaker, actor, token, item, args, workflow }) {
  if(!game.modules.get("ATL")?.active) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Items.Candle.MissingDependency"));
  const effectName = `${token.document.id} Hooded Lantern`;
  const gpsUuid = "4d035518-5171-42fb-94e0-2f68f1208e55";
  const gpsUuidDim = "16b82105-df43-4489-89ac-d20b4915e601";
  let filePath = "modules/gambits-premades/assets/images/hoodUpLantern.webp"
  let filePathDim = "modules/gambits-premades/assets/images/hoodDownLantern.webp"
  const animType = "lanternHooded";
  
  if (args[0] === "off") {
    await lightExtinguish({ token, actor, effectName, gpsUuid, scenario: "off" });
    return;
  }
  else if(args[0] === "on" || args[0] === "init") return;

  let rangeDim = game.gps.convertFromFeet({range: 60});
  let rangeBright = game.gps.convertFromFeet({range: 30});

  const lightEffect = [
    {
      origin: item.uuid,
      duration: { value: 21600, units: "seconds" },
      start: { time: game.time?.worldTime ?? 0 },
      disabled: false,
      name: item.name,
      img: item.img,
      type: "base",
      system: {
        changes: [
        { key: "ATL.light.dim", type: "custom", value: `${rangeDim}`, priority: 20 },
        { key: "ATL.light.bright", type: "custom", value: `${rangeBright}`, priority: 20 },
        { key: "ATL.light.alpha", type: "custom", value: "0.25", priority: 20 },
        { key: "ATL.light.angle", type: "custom", value: "360", priority: 20 },
        { key: "ATL.light.luminosity", type: "custom", value: "0.5", priority: 20 },
        { key: "ATL.light.color", type: "custom", value: "#ffb433", priority: 20 },
        { key: "ATL.light.animation", type: "custom", value: "{ type: \"torch\", speed: 4, intensity: 4 }", priority: 20 },
        { key: "ATL.light.attenuation", type: "custom", value: "0.75", priority: 20 },
        { key: "ATL.light.contrast", type: "custom", value: "0.15", priority: 20 },
        { key: "ATL.light.shadows", type: "custom", value: "0.2", priority: 20 },
        {
          key: "macro.itemMacro",
          type: "custom",
          value: "function.game.gps.lanternHooded",
          priority: 20
        }
        ]
      },
      transfer: false,
      flags: {
        "gambits-premades": { gpsUuid: gpsUuid }
      }
    }
  ];

  const lightEffectDim = [
    {
      origin: item.uuid,
      duration: { value: 21600, units: "seconds" },
      start: { time: game.time?.worldTime ?? 0 },
      disabled: false,
      name: item.name,
      img: item.img,
      type: "base",
      system: {
        changes: [
        { key: "ATL.light.dim", type: "custom", value: "5", priority: 20 },
        { key: "ATL.light.bright", type: "custom", value: "0", priority: 20 },
        { key: "ATL.light.alpha", type: "custom", value: "0.25", priority: 20 },
        { key: "ATL.light.angle", type: "custom", value: "360", priority: 20 },
        { key: "ATL.light.luminosity", type: "custom", value: "0.5", priority: 20 },
        { key: "ATL.light.color", type: "custom", value: "#ffb433", priority: 20 },
        { key: "ATL.light.animation", type: "custom", value: "{ type: \"torch\", speed: 4, intensity: 4 }", priority: 20 },
        { key: "ATL.light.attenuation", type: "custom", value: "0.75", priority: 20 },
        { key: "ATL.light.contrast", type: "custom", value: "0.15", priority: 20 },
        { key: "ATL.light.shadows", type: "custom", value: "0.2", priority: 20 },
        {
          key: "macro.itemMacro",
          type: "custom",
          value: "function.game.gps.lanternHooded",
          priority: 20
        }
        ]
      },
      transfer: false,
      flags: {
        "gambits-premades": { gpsUuid: gpsUuidDim }
      }
    }
  ];

  const activeLight = actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid && !e.duration?.expired);
  const activeLightDim = actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid && !e.duration?.expired);
  const canThrow = game.modules.get("item-piles")?.active === true;
  const hasRemaining = (item.system.quantity !== 0);

  if (!activeLight && !activeLightDim) {
    if (!hasRemaining) {
      ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Items.Candle.DoNotAnyS", { animType: animType }));
      workflow.aborted = true;
      return;
    }
    else if (canThrow) {
      await showLightDialog({ actions: ["light", "dim", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim, gpsUuidDim });
    } else {
      await showLightDialog({ actions: ["light", "dim"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim , gpsUuidDim});
    }
  } else if (activeLight) {
    if (canThrow) {
      await showLightDialog({ actions: ["dim", "extinguish", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim, gpsUuidDim });
    } else {
      await showLightDialog({ actions: ["dim", "extinguish"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, filePathDim, lightEffectDim, gpsUuidDim });
    }
  }
  else if (activeLightDim) {
    if (canThrow) {
      await showLightDialog({ actions: ["light", "extinguish", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, lightEffectDim, gpsUuidDim });
    } else {
      await showLightDialog({ actions: ["light", "extinguish"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid, lightEffectDim, gpsUuidDim });
    }
  }
}