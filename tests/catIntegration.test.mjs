import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

async function subject(filename, context = {}) {
    const module = new vm.SourceTextModule(readFileSync(new URL('../scripts/utils/' + filename, import.meta.url), 'utf8'), {context: vm.createContext({structuredClone, ...context})});
    await module.link(() => {throw new Error('CAT adapters must not eagerly import Foundry');});
    await module.evaluate();
    return module.namespace;
}

test('published GPS UUID aliases remain usable without duplicate CAT catalog entries', async () => {
    const entries = [];
    for (const [name, ids] of [['Interception', ['qwN919OhLSsMzKML', 'aziVWzS0jSSzLJvq']], ['Protection', ['HN65dwh9JzRZTlpk', '2s6EFimlyDlcddn9']]]) {
        for (const id of ids) {
            const item = JSON.parse(readFileSync(new URL('../packData/gps-class-features/Fighting_Style__' + name + '_' + id + '.json', import.meta.url), 'utf8'));
            assert.equal(item._id, id);
            item.uuid = 'Compendium.gambits-premades.gps-class-features.Item.' + id;
            entries.push(item);
        }
    }
    let registered;
    const {registerCatConfig} = await subject('catUtils.js', {
        game: {
            modules: new Map([['cat', {active: true}], ['gambits-premades', {title: 'GPS'}]]),
            settings: {get: () => ({})}, i18n: {localize: key => key, format: key => key},
            packs: [{metadata: {packageName: 'gambits-premades', type: 'Item'}, getIndex: async () => entries}]
        },
        foundry: {utils: {deepClone: structuredClone}},
        cat: {api: {registerSourceName() {}, registerAutomations: data => {registered = data;}}}
    });
    await registerCatConfig();
    assert.equal(registered.length, 2);
    assert.equal(registered.every(entry => !entries.find(item => item.uuid === entry.uuid).flags['gambits-premades'].catalogAlias), true);
});

test('GPS migrates explicit animation and homebrew settings without losing false or zero', async () => {
    const {buildGPSMigration} = await subject('catIntegration.js');
    const item = {flags: {'midi-qol': {onUseMacroName: '[preActiveEffects]function.game.gps.dimensionDoor'}, 'chris-premades': {config: {playAnimation: false, color: '', customDiceNum: 0, enableCustomDice: true}}}, system: {source: {custom: '2.1.24'}}};
    const updates = buildGPSMigration(item);
    assert.equal(updates['flags.cat.config.playAnimation'], false);
    assert.equal(updates['flags.cat.config.customDiceNum'], 0);
    assert.equal(updates['flags.cat.config.color'], '');
    assert.equal(updates['flags.cat.automation.source'], 'gambits-premades');
    assert.equal(updates['flags.gambits-premades.catMigration'].config.enableCustomDice, true);
});

test('GPS respects existing CAT values and does not claim another source', async () => {
    const {buildGPSMigration, gpsItemConfig} = await subject('catIntegration.js');
    const item = {flags: {'gambits-premades': {config: {playAnimation: true}}, cat: {config: {playAnimation: false, color: null}, automation: {source: 'gambits-premades'}}, 'chris-premades': {config: {playAnimation: true, color: 'red'}}}};
    const updates = buildGPSMigration(item);
    assert.equal(Object.hasOwn(updates, 'flags.cat.config.playAnimation'), false);
    assert.equal(Object.hasOwn(updates, 'flags.cat.config.color'), false);
    assert.equal(gpsItemConfig(item).playAnimation, false);
    assert.equal(gpsItemConfig(item).color, null);
    item.flags.cat.automation.source = 'other';
    assert.equal(Object.keys(buildGPSMigration(item)).length, 0);
});

test('GPS migration identifies compendium imports even without a gpsUuid flag', async () => {
    const {buildGPSMigration} = await subject('catIntegration.js');
    const item = {_stats: {compendiumSource: 'Compendium.gambits-premades.gps-spells.Item.scatter'}, flags: {}};
    assert.equal(buildGPSMigration(item)['flags.cat.automation.source'], 'gambits-premades');
});

test('a completed GPS migration is idempotent', async () => {
    const {buildGPSMigration} = await subject('catIntegration.js');
    const item = {flags: {'gambits-premades': {catMigration: {version: 1}}, cat: {automation: {source: 'gambits-premades'}}}};
    assert.equal(Object.keys(buildGPSMigration(item)).length, 0);
});

test('Midi-QOL parsed macro objects on unrelated items do not break migration', async () => {
    const {buildGPSMigration} = await subject('catIntegration.js');
    assert.equal(Object.keys(buildGPSMigration({flags: {'midi-qol': {onUseMacroName: {}}}})).length, 0);
});

function dialogFixture() {
    const apps = [];
    class Dialog {
        constructor(data) {this.data = data;this.events = {};this.element = {elements: {'enemy-token': {value: 'chosen-target'}}}; apps.push(this);}
        addEventListener(name, callback) {this.events[name] = callback;}
        async render() {this._onRender({}, {});return this;}
        _onRender() {}
        async _prepareContext() {return {};}
        async close() {await this.events.close?.({target: this});}
    }
    return {apps, context: {cat: {applications: {DialogApp: Dialog}}, game: {i18n: {localize: key => key}}}};
}

test('CAT reaction adapter returns callback values after reading the original form', async () => {
    const {apps, context} = dialogFixture();
    const {catDialog} = await subject('catDialog.js', context);
    const result = catDialog.wait({window: {title: 'Reaction'}, buttons: [{action: 'yes', label: 'Yes', callback: (_, button) => button.form.elements['enemy-token'].value}]});
    await apps[0].submit({buttons: 'yes'});
    assert.equal(await result, 'chosen-target');
    assert.equal(apps[0].data[0], 'Reaction');
});

test('CAT reaction adapter preserves pause state and programmatic-close handling', async () => {
    const {apps, context} = dialogFixture();
    const {catDialog} = await subject('catDialog.js', context);
    const result = catDialog.wait({render: (_, dialog) => {dialog.isPaused = true; dialog.dialogState = {programmaticallyClosed: true};}, close: (_, dialog) => ({cancelled: dialog.dialogState.programmaticallyClosed})});
    assert.equal(apps[0].isPaused, true);
    await apps[0].close();
    assert.equal((await result).cancelled, true);
});

test('closing a CAT confirm dialog declines rather than accepting', async () => {
    const {apps, context} = dialogFixture();
    const {catDialog} = await subject('catDialog.js', context);
    const result = catDialog.confirm({window: {title: 'Confirm'}});
    await apps[0].close();
    assert.equal(await result, false);
});

test('CAT world settings retain numeric timeout defaults and store their original string type', async () => {
    const {apps, context} = dialogFixture();
    let stored = '15';
    context.Boolean = Boolean;
    context.String = String;
    context.Number = Number;
    context.game.settings = {
        settings: new Map([['gambits-premades.Counterspell Timeout', {type: String}], ['gambits-premades.Enable Counterspell', {type: Boolean}]]),
        get: (_, key) => key === 'Counterspell Timeout' ? stored : false,
        set: async (_, key, value) => {if (key === 'Counterspell Timeout') stored = value;}
    };
    const {catSettingsMenu} = await subject('catSettings.js', context);
    const menu = catSettingsMenu({id: 'spells', title: 'Spells', close: async () => {}, _prepareContext: async () => ({features: [{name: 'Counterspell', boolKey: 'Enable Counterspell', timeoutKey: 'Counterspell Timeout'}]})});
    await menu._prepareContext({});
    assert.equal(menu.inputs[1][1][0].options.currentValue, 15);
    await menu.submit({buttons: true, 'Counterspell Timeout': 20, 'Enable Counterspell': false});
    assert.equal(stored, '20');
    assert.equal(apps.length, 1);
});
