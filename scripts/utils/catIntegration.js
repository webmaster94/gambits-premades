const SOURCE = 'gambits-premades';
let migrationPromise;

export function buildGPSMigration(item) {
    const flags = item.flags ?? {};
    const legacy = flags['chris-premades'];
    const gps = flags[SOURCE];
    const catFlags = flags.cat ?? {};
    const gpsMacro = String(flags['midi-qol']?.onUseMacroName ?? '').includes('function.game.gps.');
    const gpsOrigin = item._stats?.compendiumSource?.startsWith('Compendium.' + SOURCE + '.');
    if (!gps && legacy?.info?.source !== SOURCE && !gpsMacro && !gpsOrigin) return {};
    if (catFlags.automation?.source && catFlags.automation.source !== SOURCE) return {};
    const updates = {};
    const settings = {...(legacy?.config ?? {}), ...(gps?.config ?? {})};
    for (const [key, value] of Object.entries(settings)) {
        if (key === 'generic' || Object.hasOwn(catFlags.config ?? {}, key)) continue;
        updates['flags.cat.config.' + key] = structuredClone(value);
    }
    if (!catFlags.automation?.source) {
        updates['flags.cat.automation.source'] = SOURCE;
        updates['flags.cat.automation.version'] = legacy?.info?.version ?? item.system?.source?.custom ?? '0';
    }
    if (!gps?.catMigration && Object.keys(updates).length) updates['flags.gambits-premades.catMigration'] = {version: 1, config: structuredClone(settings)};
    return updates;
}

export function gpsItemConfig(item) {
    return {...item?.flags?.['chris-premades']?.config, ...item?.flags?.[SOURCE]?.config, ...item?.flags?.cat?.config};
}

export async function migrateGPSDocument(document) {
    const updates = buildGPSMigration(document);
    if (!Object.keys(updates).length) return false;
    await document.update(updates, {gpsCatMigration: true});
    return true;
}

export async function migrateGPS({compendiums = true} = {}) {
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return {skipped: true};
    if (migrationPromise) return migrationPromise;
    migrationPromise = (async () => {
        const report = {updated: 0, failed: [], lockedPacks: []};
        const seen = new Set();
        const visit = async document => {
            if (!document?.uuid || seen.has(document.uuid)) return;
            seen.add(document.uuid);
            try { if (await migrateGPSDocument(document)) report.updated++; }
            catch (error) { report.failed.push(document.uuid); console.error('GPS CAT migration failed for ' + document.uuid, error); }
            for (const child of document.items ?? []) await visit(child);
            for (const child of document.effects ?? []) await visit(child);
            for (const child of document.system?.activities ?? []) await visit(child);
        };
        for (const item of game.items) await visit(item);
        for (const actor of game.actors) await visit(actor);
        for (const scene of game.scenes) for (const token of scene.tokens) if (!token.actorLink) await visit(token.actor);
        if (compendiums) for (const pack of game.packs) {
            if (pack.metadata.packageType !== 'world' || !['Actor', 'Item'].includes(pack.documentName)) continue;
            if (pack.locked) {report.lockedPacks.push(pack.collection); continue;}
            try { for (const document of await pack.getDocuments()) await visit(document); }
            catch (error) {report.failed.push(pack.collection); console.error('GPS CAT compendium migration failed for ' + pack.collection, error);}
        }
        if (!report.failed.length) await game.settings.set(SOURCE, 'catMigrationVersion', 1);
        console.info('GPS CAT migration', report);
        return report;
    })();
    try {return await migrationPromise;} finally {migrationPromise = undefined;}
}

export function initCAT() {
    const indexGuard = Symbol.for('cpr.gps.catIndexGuard');
    if (!globalThis[indexGuard]) {
        libWrapper.register(SOURCE, 'foundry.documents.collections.CompendiumCollection.prototype.getIndex', function(wrapped, options = {}) {
            const requested = options.fields ?? [];
            const all = [...new Set([...this.indexFields, ...requested])];
            return wrapped({...options, fields: requested.filter(field => !all.some(parent => parent !== field && field.startsWith(parent + '.')))});
        }, 'WRAPPER');
        globalThis[indexGuard] = true;
    }
    game.settings.register(SOURCE, 'catMigrationVersion', {scope: 'world', config: false, type: Number, default: 0});
    Hooks.on('preCreateItem', document => document.updateSource(buildGPSMigration(document)));
    Hooks.once('catReady', () => readyCAT().catch(error => console.error('GPS CAT integration failed', error)));
}

export async function readyCAT() {
    if (game.users.activeGM?.id === game.user.id) {
        const queueKey = Symbol.for('cpr.gps.catSourceSettings');
        const task = (globalThis[queueKey] ?? Promise.resolve()).then(async () => {
            const sources = game.settings.get('cat', 'automationSources');
            if (!Object.hasOwn(sources, SOURCE)) await game.settings.set('cat', 'automationSources', {...sources, [SOURCE]: {enabled: true, priority: 15, pack: false}});
        });
        globalThis[queueKey] = task.catch(() => {});
        await task;
    }
    const report = await migrateGPS({compendiums: game.settings.get(SOURCE, 'catMigrationVersion') < 1});
    game.gps.cat = {migrate: migrateGPS, migrateDocument: migrateGPSDocument};
    Hooks.callAll('gpsCatReady', report);
    return report;
}
