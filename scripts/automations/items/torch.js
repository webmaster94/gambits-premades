import {
    showLightDialog,
    lightExtinguish
} from "../../utils/lightActions.js";
  
export async function torch({ speaker, actor, token, item, args, workflow }) {
  if(!game.modules.get("ATL")?.active) return ui.notifications.warn(game.i18n.localize("GAMBITSPREMADES.Notifications.Items.Candle.MissingDependency"));
  const effectName = `${token.document.id} Torch`;
  const gpsUuid = "31ef3b37-2ae3-4057-8335-63f690d1ae8d";
  const filePath = "modules/gambits-premades/assets/images/torch.webp";
  const animType = "torch";
  
  if (args[0] === "off") {
    await lightExtinguish({ token, actor, effectName, gpsUuid, scenario: "off" });
    return;
  }
  else if(args[0] === "on" || args[0] === "init") return;

  let rangeDim = game.gps.convertFromFeet({range: 40});
  let rangeBright = game.gps.convertFromFeet({range: 20});

  const lightEffect = [
    {
      origin: item.uuid,
      duration: { value: 3600, units: "seconds" },
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
            value: "function.game.gps.torch",
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
  const canThrow = game.modules.get("item-piles")?.active;
  const hasRemaining = (item.system.quantity !== 0);

  if (!activeLight) {
    if (!hasRemaining) {
      ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Items.Torch.DoNotAnyEs", { animType: animType }));
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