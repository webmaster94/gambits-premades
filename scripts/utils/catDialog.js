// Adapt GPS's existing callback and timer contracts to CAT's dialog renderer.
// Reaction decisions still use GPS sockets, preserving mirrored prompts and their timers.
export const catDialog = {
    async wait(options) {
        const Base = globalThis.cat?.applications?.DialogApp;
        if (!Base) throw new Error('GPS requires Coven\'s Automation Toolkit 0.1.1 or newer.');
        const buttons = options.buttons ?? [];
        return new Promise((resolve, reject) => {
            let decided = false, value;
            class GPSDialog extends Base {
                _onRender(context, renderOptions) {
                    super._onRender(context, renderOptions);
                    options.render?.({target: this}, this);
                }
            }
            const dialog = new GPSDialog([
                options.window?.title ?? '', options.content ?? '',
                [['button', buttons.map(button => ({label: button.label, name: button.action, options: {}})), {displayAsRows: false}]],
                undefined, {id: options.id, width: options.position?.width ?? 450}
            ]);
            dialog.submit = async result => {
                if (decided) return;
                decided = true;
                const action = result?.buttons;
                const button = buttons.find(button => button.action === action);
                try {
                    value = button?.callback ? await button.callback(undefined, {form: dialog.element}, dialog) : action;
                    await dialog.close();
                } catch (error) {
                    await dialog.close();
                    reject(error);
                }
            };
            dialog.addEventListener('close', async event => {
                try {
                    const closed = await options.close?.(event, dialog);
                    resolve(decided ? value : closed ?? null);
                } catch (error) { reject(error); }
            }, {once: true});
            Promise.resolve(dialog.render(true)).catch(reject);
        });
    },
    async confirm(options) {
        const buttons = [
            {action: 'yes', label: game.i18n.localize('Yes'), callback: async (...args) => {await options.yes?.callback?.(...args); return true;}},
            {action: 'no', label: game.i18n.localize('No'), callback: async (...args) => {await options.no?.callback?.(...args); return false;}}
        ];
        return await this.wait({...options, buttons}) === true;
    }
};
