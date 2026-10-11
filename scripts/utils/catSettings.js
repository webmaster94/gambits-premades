export function catSettingsMenu(model) {
    const Base = cat.applications.DialogApp;
    return new class GPSSettings extends Base {
        constructor() {
            super([model.title, '', [], 'okCancel', {id: 'cat-gps-' + model.id, width: 600}]);
            this.settingKeys = new Set();
        }
        async _prepareContext(options) {
            if (!this.initialized) {
                const context = await model._prepareContext(options);
                this.inputs = [];
                const add = feature => {
                    const setting = game.settings.settings.get('gambits-premades.' + feature.boolKey);
                    if (setting) {
                        this.settingKeys.add(feature.boolKey);
                        const checkbox = setting.type === Boolean;
                        this.inputs.push([checkbox ? 'checkbox' : setting.type === Number ? 'number' : 'text', [{
                            label: feature.name, name: feature.boolKey,
                            options: checkbox ? {isChecked: game.settings.get('gambits-premades', feature.boolKey)} : {currentValue: game.settings.get('gambits-premades', feature.boolKey)}
                        }]]);
                    }
                    if (feature.timeoutKey) {
                        this.settingKeys.add(feature.timeoutKey);
                        this.inputs.push(['number', [{label: feature.timeoutKey, name: feature.timeoutKey, options: {currentValue: Number(game.settings.get('gambits-premades', feature.timeoutKey))}}]]);
                    }
                    for (const child of feature.children ?? []) add(child);
                };
                for (const feature of context.features ?? []) add(feature);
                this.initialized = true;
            }
            return await super._prepareContext(options);
        }
        async submit(result) {
            if (result?.buttons) for (const key of this.settingKeys) {
                if (!(key in result)) continue;
                const setting = game.settings.settings.get('gambits-premades.' + key);
                const value = setting.type === String ? String(result[key]) : result[key];
                if (game.settings.get('gambits-premades', key) !== value) await game.settings.set('gambits-premades', key, value);
            }
            await this.close();
            await model.close();
        }
    }();
}
