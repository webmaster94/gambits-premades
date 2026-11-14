import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

async function load(file, globals) {
    const subject = new vm.SourceTextModule(readFileSync(new URL('../scripts/' + file, import.meta.url), 'utf8'), {context: vm.createContext(globals)});
    await subject.link(() => {throw new Error('Unexpected dependency');});
    await subject.evaluate();
    return subject.namespace;
}

test('region movement keeps action, geometry and terrain without reading derived elevation', async () => {
    let movement;
    const subject = await load('utils/hookUtils.js', {
        libWrapper: {register: (_source, path, fn) => {if(path.endsWith('segmentizeRegionMovementPath')) movement = fn;}},
        game: {gps: {}, settings: {get: () => true}}, CONFIG: {Token: {movement: {actions: {walk: {teleport: false}, teleport: {teleport: true}}}}}
    });
    subject.registerWrapping();
    const source = {x: 0, y: 0, elevation: 5, width: 1, height: 1, depth: 1, shape: 0, level: 'ground'};
    const token = {_source: source, parent: {grid: {size: 100}}, movementAction: 'walk', get elevation() {throw new Error('Derived elevation must not prepare the actor');}};
    let fallback = 0;
    const region = {flags: {}, behaviors: new Map(), includedInLevel: () => true, segmentizeMovementPath: ([from, to]) => [{from: {...from}, to: {...to}, teleport: to.teleport}]};
    const terrain = {clone: () => ({id: 'rough'})};
    const result = movement.call(token, () => {fallback++; return [];}, region, [{x: 0, y: 0}, {x: 100, y: 0, action: 'teleport', terrain, snapped: true}]);
    assert.equal(result[0].action, 'teleport');
    assert.equal(result[0].to.width, 1);
    assert.equal(result[0].terrain.id, 'rough');
    assert.equal(result[0].snapped, true);
    assert.equal('teleport' in result[0], false);
    movement.call(token, () => {fallback++; return [];}, region, [{x: 0, y: 0}]);
    assert.equal(fallback, 1);
});

test('forced misses preserve document collections and off-canvas targets', async () => {
    const {forceAttackMiss} = await load('utils/attackOutcomeUtils.js', {});
    const drawn = {uuid: 'Scene.s.Token.a'};
    const offCanvas = {uuid: 'Scene.s.Token.b'};
    function collection(documents) {
        return {documents, get count() {return this.documents.length;}, tokens: [],
            delete(target) {this.documents = this.documents.filter(entry => entry !== target);},
            [Symbol.iterator]() {throw new Error('Document-mode code must select a view');}};
    }
    const workflow = {id: 'attack', attackRollCount: 1, targets: collection([drawn, offCanvas]), hitTargets: collection([drawn, offCanvas]), isCritical: true};
    const hits = workflow.hitTargets;
    forceAttackMiss(workflow, drawn);
    assert.equal(workflow.hitTargets, hits);
    assert.deepEqual(hits.documents, [offCanvas]);
    assert.equal(workflow.isCritical, true);
    forceAttackMiss(workflow, offCanvas);
    assert.equal(hits.count, 0);
    assert.equal(workflow.isCritical, false);
});

test('Freedom of Movement reads synthetic item sources without preparing the token actor', async () => {
    const baseItem = {type: 'spell'};
    const token = {_source: {actorId: 'base', actorLink: false, delta: {items: []}}, get actor() {throw new Error('Recursive actor preparation');}};
    const {isMagicalEffect} = await load('automations/spells/freedomOfMovement.js', {
        game: {scenes: new Map([['scene', {tokens: new Map([['token', token]])}]]), actors: new Map([['base', {items: new Map([['spell', baseItem]])}]])},
        fromUuidSync() {throw new Error('Scene item resolution can prepare the actor');}
    });
    assert.equal(isMagicalEffect({origin: 'Scene.scene.Token.token.Item.spell'}, {uuid: 'Actor.other'}), true);
    token._source.delta.items.push({_id: 'spell', _deleted: true});
    assert.equal(isMagicalEffect({origin: 'Scene.scene.Token.token.Item.spell'}, {uuid: 'Actor.other'}), false);
});

test('save reactions replace a document-mode result without leaving duplicate display rows', async () => {
    const target = {documentName: 'Token', uuid: 'Scene.s.Token.target', actor: {}};
    Object.defineProperty(target, 'document', {get() {throw new Error('Document mode must not read .document');}});
    const roll = {total: 17, options: {}};
    class Roll {}
    Object.setPrototypeOf(roll, Roll.prototype);
    const collection = members => ({
        documents: members, has: member => members.includes(member),
        add: member => {if(!members.includes(member)) members.push(member);},
        delete: member => {const index = members.indexOf(member); if(index >= 0) members.splice(index, 1);}
    });
    const workflow = {targets: collection([target]), saves: collection([]), failedSaves: collection([target]),
        saveDC: 15, tokenSaves: {[target.uuid]: {total: 4}}, saveDisplayData: [{target}],
        buildSaveDisplayEntry: async function(token) {this.saveDisplayData.push({target: token});}};
    const {updateSaveResult} = await load('utils/saveUtils.js', {Roll, MidiQOL: {}});
    await updateSaveResult({workflow, token: target, roll, saved: true});
    assert.equal(workflow.saves.has(target), true);
    assert.equal(workflow.failedSaves.has(target), false);
    assert.equal(workflow.saveDisplayData.length, 1);
    assert.equal(workflow.targetSaveDetails[target.uuid].saveRoll, roll);
});
