# CAT integration

GPS 3.2.0 requires Coven's Automation Toolkit 0.1.3, Foundry 14.369 or later, D&D 6.0.x, Midi-QOL 14.6.4, and DAE 14.6.3. GPS can use CAT independently of CPR.

CAT lists the existing GPS compendiums. Animation configuration and supported custom dice or damage-type options appear on the item. GPS's module settings menus use CAT's renderer. Upstream 3.0.2 supplies the automation dialogs with token focus, reaction timers, mirrored decisions, and form selections. Native Foundry user queries replace the former socketlib transport.

The active GM migrates world and actor items, embedded documents, and unlinked NPC tokens on all scenes. The first migration also visits unlocked world Item and Actor compendiums. Locked packs remain read-only; imported items are migrated when created. Run `await game.gps.cat.migrate()` to retry or include compendiums again. The returned report lists failures and locked packs.

Existing item configuration from CPR or GPS is copied to `flags.cat.config`. Existing CAT choices take precedence, including disabled options, zeroes, empty strings, null, and nested data. GPS keeps an initial configuration snapshot in `flags.gambits-premades.catMigration.config`. World settings retain their existing GPS keys and values; changing the renderer does not reset them. Re-running migration does not overwrite CAT choices.

Dimension Door offers a compact traveler selection prompt and then destination placement. A contrasting ring marks the destination without requiring animation assets. Scatter uses the same picker. Invalid destinations stay open with a red ring; Escape cancels and removes the markers. The picker uses the clicked position even when no mouse-move event preceded the click.

Current verification used Foundry 14.369, D&D 6.0.6, CAT 0.1.3, Midi-QOL 14.6.4, DAE 14.6.3, Sequencer 4.3.0, and Aura Effects 2.4.1. CAT updates retained item configuration and reported the current GPS version. The new upstream dialog returned form selections, native queries registered, and teleport confirmation removed its prompt and destination marker. Earlier 3.1.0 checks covered two-token Dimension Door movement, cancellation, and invalid destinations; those regression tests remain. Individual automations have not all been played through.
