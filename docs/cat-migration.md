# CAT integration

GPS 3.1.0 requires Coven's Automation Toolkit 0.1.1, Foundry 14.368 or later, D&D 6.0.x, Midi-QOL 14.6.0, and DAE 14.6.0. GPS can use CAT independently of CPR.

CAT lists the existing GPS compendiums. Animation configuration and supported custom dice or damage-type options appear on the item. GPS's module settings menus and callback-based dialogs use CAT's renderer. The existing automation functions, socket ownership, reaction timers, mirrored dialogs, and form selections remain in use.

The active GM migrates world and actor items, embedded documents, and unlinked NPC tokens on all scenes. The first migration also visits unlocked world Item and Actor compendiums. Locked packs remain read-only; imported items are migrated when created. Run `await game.gps.cat.migrate()` to retry or include compendiums again. The returned report lists failures and locked packs.

Existing item configuration from CPR or GPS is copied to `flags.cat.config`. Existing CAT choices take precedence, including disabled options, zeroes, empty strings, null, and nested data. GPS keeps an initial configuration snapshot in `flags.gambits-premades.catMigration.config`. World settings retain their existing GPS keys and values; changing the renderer does not reset them. Re-running migration does not overwrite CAT choices.

Dimension Door offers a compact traveler selection prompt and then destination placement. A contrasting ring marks the destination without requiring animation assets. Scatter uses the same picker. Invalid destinations stay open with a red ring; Escape cancels and removes the markers. The picker uses the clicked position even when no mouse-move event preceded the click.

Local verification used Foundry 14.369, D&D 6.0.6, CAT 0.1.1, Midi-QOL 14.6.0, DAE 14.6.0, and Sequencer 4.2.2. It covered migration, configuration edits, reaction form data and pause handling, traveler selection, valid and invalid destination clicks, cancellation, and Dimension Door moving the caster and companion with animations disabled. It does not constitute a playthrough of every automation.
