function prompt(title, step, cancel, alone) {
    const panel = document.createElement('aside');
    panel.className = 'gps-teleport-prompt';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    const name = document.createElement('strong');
    name.textContent = title;
    const label = document.createElement('span');
    label.textContent = step;
    panel.append(name, label);
    if (alone) {
        const button = document.createElement('button');
        button.textContent = game.i18n.localize('GAMBITSPREMADES.Teleport.Alone');
        button.addEventListener('click', alone);
        panel.append(button);
    }
    const close = document.createElement('button');
    close.className = 'gps-teleport-cancel';
    close.textContent = '×';
    close.setAttribute('aria-label', game.i18n.localize('Cancel'));
    close.addEventListener('click', cancel);
    panel.append(close);
    document.body.append(panel);
    const hotbar = document.getElementById('hotbar')?.getBoundingClientRect();
    if (hotbar?.width > hotbar?.height) panel.style.bottom = Math.max(20, window.innerHeight - hotbar.top + 12) + 'px';
    return {close: () => panel.remove()};
}

export function chooseTeleportTraveler({token, item, target}) {
    if (target) return Promise.resolve({token: target, cancelled: false});
    const candidates = canvas.tokens.placeables.filter(candidate => candidate !== token && candidate.actor && candidate.visible && !candidate.document.hidden &&
        MidiQOL.computeDistance(candidate, token, {wallsBlock: true}) <= game.gps.convertFromFeet({range: 6}));
    if (!candidates.length) return Promise.resolve({token: undefined, cancelled: false});
    return new Promise(resolve => {
        const abort = new AbortController();
        let panel;
        const finish = (selected, cancelled = false) => {abort.abort(); panel.close(); resolve({token: selected, cancelled});};
        panel = prompt(item.name, game.i18n.localize('GAMBITSPREMADES.Teleport.Traveler'), () => finish(undefined, true), () => finish());
        const options = {capture: true, signal: abort.signal};
        window.addEventListener('keydown', event => {if (event.key === 'Escape') {event.preventDefault(); event.stopImmediatePropagation(); finish(undefined, true);}}, options);
        window.addEventListener('pointerdown', event => {
            if (event.target?.id !== 'board') return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.button === 2) {finish(undefined, true); return;}
            if (event.button !== 0) return;
            const rect = canvas.app.view.getBoundingClientRect();
            const point = canvas.stage.worldTransform.applyInverse(new PIXI.Point(
                (event.clientX - rect.left) * canvas.app.screen.width / rect.width,
                (event.clientY - rect.top) * canvas.app.screen.height / rect.height
            ));
            const selected = candidates.find(candidate => point.x >= candidate.document.x && point.x <= candidate.document.x + candidate.w && point.y >= candidate.document.y && point.y <= candidate.document.y + candidate.h);
            if (selected) finish(selected);
        }, options);
    });
}

export async function chooseTeleportDestination({token, target = token, item, range = 30, checkWalls = false}) {
    let crosshair, cancelled = false;
    const maxRange = game.gps.convertFromFeet({range: Number(range)});
    const panel = prompt(item.name, game.i18n.format('GAMBITSPREMADES.Teleport.Destination', {name: target.name}), cancel);
    const marker = new PIXI.Graphics();
    marker.eventMode = 'none';
    marker.name = 'gps-teleport-destination';
    const boundary = new PIXI.Graphics();
    boundary.eventMode = 'none';
    boundary.lineStyle(2, 0x6ccbd9, 0.4).drawCircle(token.center.x, token.center.y, maxRange / canvas.grid.distance * canvas.grid.size);
    canvas.controls.addChild(boundary, marker);
    const radius = target.w / 2;
    let distance = 0;
    const valid = (position = crosshair) => {
        if (!position) return false;
        distance = canvas.grid.measurePath([token.center, position]).distance;
        return distance <= maxRange && (!checkWalls || !token.checkCollision(position, {origin: token.center, type: 'move', mode: 'any'}));
    };
    function cancel() {
        cancelled = true;
        if (crosshair) {crosshair.cancelled = true; crosshair.inFlight = false; crosshair.clearHandlers();}
    }
    const keydown = event => {if (event.key === 'Escape') {event.preventDefault(); event.stopImmediatePropagation(); cancel();}};
    const guard = event => {
        if (event.target?.id !== 'board' || event.button !== 0 || !crosshair?.inFlight) return;
        const rect = canvas.app.view.getBoundingClientRect();
        const screen = new PIXI.Point((event.clientX - rect.left) * canvas.app.screen.width / rect.width, (event.clientY - rect.top) * canvas.app.screen.height / rect.height);
        const point = cat.lib.Crosshairs.getSnappedPosition(canvas.stage.worldTransform.applyInverse(screen), crosshair.resolution);
        const shapes = foundry.utils.deepClone(crosshair.document.shapes);
        shapes[0].x = point.x;
        shapes[0].y = point.y;
        crosshair.document.updateSource({shapes});
        crosshair.refresh();
        if (valid(point)) return;
        draw();
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    const draw = () => {
        if (!crosshair?.inFlight) return;
        const allowed = valid();
        marker.clear().lineStyle(6, 0x101820, 0.9).drawCircle(0, 0, radius)
            .lineStyle(3, allowed ? 0x6ccbd9 : 0xe65e64, 1).drawCircle(0, 0, radius);
        marker.position.set(crosshair.x, crosshair.y);
        crosshair.label = Math.round(distance * 10) / 10 + ' / ' + maxRange + ' ' + canvas.scene.grid.units;
        crosshair._setRulerText();
    };
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('pointerdown', guard, true);
    canvas.app.ticker.add(draw);
    try {
        const result = await cat.lib.Crosshairs.showCrosshairs({
            size: target.document.width * canvas.grid.distance / 2,
            icon: target.document.texture.src, anchorTopLeft: false,
            resolution: target.document.width % 2 ? 1 : -1,
            x: token.center.x, y: token.center.y, tag: 'gps-teleport'
        }, {show: preview => {crosshair = preview; if (cancelled) cancel(); draw();}});
        if (cancelled || result.cancelled || !valid(result)) return undefined;
        return result;
    } finally {
        canvas.app.ticker.remove(draw);
        window.removeEventListener('keydown', keydown, true);
        window.removeEventListener('pointerdown', guard, true);
        marker.destroy();
        boundary.destroy();
        panel.close();
    }
}
