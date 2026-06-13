export async function freedomOfMovement({ speaker, actor, token, character, item, args, scope, workflow, options }) {
    let gmUser = game.gps.getPrimaryGM();
    let targets = workflow.targets;
    let effectData = 
    [
        {
            "name": item.name,
            "img": item.img,
            "origin": item.uuid,
            "type": "base",
            "system": {
                "changes": [
                {
                "key": "system.attributes.movement.ignoredDifficultTerrain",
                "type": "override",
                "value": "all",
                "priority": 99
                },
                {
                "key": "system.attributes.movement.burrow",
                "type": "override",
                "value": actor._source.system.attributes.movement.burrow ? actor._source.system.attributes.movement.burrow : 0,
                "priority": 99
                },
                {
                "key": "system.attributes.movement.climb",
                "type": "override",
                "value": actor._source.system.attributes.movement.climb ? actor._source.system.attributes.movement.climb : 0,
                "priority": 99
                },
                {
                "key": "system.attributes.movement.fly",
                "type": "override",
                "value": actor._source.system.attributes.movement.fly ? actor._source.system.attributes.movement.fly : 0,
                "priority": 99
                },
                {
                "key": "system.attributes.movement.swim",
                "type": "override",
                "value": actor._source.system.attributes.movement.swim ? actor._source.system.attributes.movement.swim : actor._source.system.attributes.movement.walk ? actor._source.system.attributes.movement.walk : 30,
                "priority": 99
                },
                {
                "key": "system.attributes.movement.walk",
                "type": "override",
                "value": actor._source.system.attributes.movement.walk ? actor._source.system.attributes.movement.walk : 30,
                "priority": 99
                },
                {
                "key": "system.traits.ci.value",
                "type": "custom",
                "value": "paralyzed",
                "priority": 99
                },
                {
                "key": "system.traits.ci.value",
                "type": "custom",
                "value": "restrained",
                "priority": 99
                }
                ]
            },
            "disabled": false,
            "duration": {
                "value": 3600,
                "units": "seconds"
            },
            "start": {
                "time": game.time?.worldTime ?? 0
            },
            "transfer": false,
        }
    ];

    for (let target of targets) {
        await MidiQOL.socket().executeAsUser("createEffects", gmUser, { actorUuid: target.actor.uuid, effects: effectData });
    }
}