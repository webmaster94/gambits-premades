export function ashardalonsStride({type, token, itemUuid}) {
    let cprConfig = game.gps.getCprConfig({itemUuid});
    if(!cprConfig.animEnabled) return;

    if(type === "use") {
        return new Sequence({moduleName: "gambits-premades", softFail: true})
            .effect()
                .attachTo(token, {offset:{x: 0, y: -30}, local: true})
                .file("animated-spell-effects-cartoon.fire.30")
                .scaleToObject(2)
                .name(`${token.id}_ashardalonsStride`)
                .belowTokens()
                .persist()
            .play()
    }
    else if(type === "damage") {
        return new Sequence({moduleName: "gambits-premades", softFail: true})
            .effect()
                .atLocation(token)
                .file("animated-spell-effects-cartoon.fire.16")
                .scaleToObject(1.3)
            .play()
    }
}