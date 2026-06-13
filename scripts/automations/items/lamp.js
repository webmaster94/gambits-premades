import {
    showLightDialog,
    lightExtinguish
} from "../../utils/lightActions.js";
  
export async function lamp({ speaker, actor, token, item, args, workflow }) {
  if(!game.modules.get("ATL")?.active) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Items.Candle.MissingDependency"));
  const effectName = `${token.document.id} Lamp`;
  const gpsUuid = "ed5ddad4-9a4b-4ff8-ba7a-141862cb4fec";
  const filePath = "modules/gambits-premades/assets/images/lamp.webp";
  const animType = "lamp";
  
  if (args[0] === "off") {
    await lightExtinguish({ token, actor, effectName, gpsUuid, scenario: "off" });
    return;
  }
  else if(args[0] === "on" || args[0] === "init") return;

  let rangeDim = game.gps.convertFromFeet({range: 30});
  let rangeBright = game.gps.convertFromFeet({range: 15});

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
          { key: "ATL.light.animation", type: "custom", value: "{ type: \"lamp\", speed: 4, intensity: 4 }", priority: 20 },
          { key: "ATL.light.attenuation", type: "custom", value: "0.75", priority: 20 },
          { key: "ATL.light.contrast", type: "custom", value: "0.15", priority: 20 },
          { key: "ATL.light.shadows", type: "custom", value: "0.2", priority: 20 },
          {
            key: "macro.itemMacro",
            type: "custom",
            value: "function.game.gps.lamp",
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

  const activeLight = actor.appliedEffects.some(e => e.flags["gambits-premades"]?.gpsUuid === gpsUuid && !e.duration?.expired);
  const canThrow = game.modules.get("item-piles")?.active === true;
  const hasRemaining = (item.system.quantity !== 0);

  if (!activeLight) {
    if (!hasRemaining) {
      ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Items.Candle.DoNotAnyS", { animType: animType }));
      workflow.aborted = true;
      return;
    }
    else if (canThrow) {
      await showLightDialog({ actions: ["light", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid });
    } else {
      await showLightDialog({ actions: ["light"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid });
    }
  } else {
    if (canThrow) {
      await showLightDialog({ actions: ["extinguish", "throw"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid });
    } else {
      await showLightDialog({ actions: ["extinguish"], token, actor, item, effectName, filePath, lightEffect, animType, gpsUuid });
    }
  }
}