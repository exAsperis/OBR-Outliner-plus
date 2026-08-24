# Outliner+ for Owlbear Rodeo

Browse, search, and organize Scene items by layer. Create virtual layers to keep foreground and background elements in a predictable stacking order, and use quick controls for inherited click-through behavior, visibility, locking, and item order.

## Overview

Outliner+ builds on the original [Outliner extension](https://extensions.owlbear.rodeo/outliner) with virtual layers, quick controls, and a Locate action.

The Outliner+ panel mirrors the layers and items in the current Scene. Select an item in the panel to select it on the map, double-click an item to center the viewport on it, or use Search to filter the list by name and other item details. Truncated native-layer, virtual-layer, and item names display their full text when hovered.

Game Masters can select **Settings** beside Search to open the *Use layers* panel above the Outliner. Its switches choose which of Owlbear Rodeo's native layers appear in the list and in Send to Layer menus. The eleven layers previously supported by Outliner+ start enabled; Grid, Post Process, Control, and Popover start disabled. These per-device display preferences do not move, modify, or delete items or virtual layers, and do not change state inheritance. Select Settings again to close the panel.

## Virtual layers

Virtual layers are containers inside an Owlbear Rodeo layer. They keep groups of items in a consistent stacking order without changing the Owlbear layer those items belong to.

For example:

- In the Maps layer, create Ground and Buildings virtual layers so building images remain above ground images.
- In the Props layer, create Interior and Roof virtual layers so roof props remain above interior props.

Drag a virtual-layer heading to change its position, or use its Send menu. Drag items into a virtual layer to assign them to it. Once a native Owlbear layer contains a virtual layer, Outliner+ also displays an italicized Unassigned group for items that have not been assigned to one. Unlinked virtual layers and Unassigned use a rounded outline glyph; linked virtual layers use a chain glyph. Edit, Delete, and Send controls on these headings appear on hover or keyboard focus, while state controls remain visible.

### Limitation

Virtual layers do not override Owlbear Rodeo's layer order. For example, an item in the Props layer cannot be placed above an item in the Characters layer by using a virtual layer.

Virtual layers with the same name are linked across the Scene, even when they belong to different Owlbear layers. A chain glyph appears beside each linked name. Creating or renaming a layer to a matching name copies the existing linked state, and later click-through, locked, or visibility changes apply to every layer in that link. Rename a linked layer to a different name to unlink it while preserving its current state.

## Quick actions

Game Masters can use the controls in the Outliner+ panel to manage Scene items. Item controls appear when an item is selected or hovered. Actions that update an item are available only when the current player has permission to update it.

### Create virtual layer

Creates a virtual layer inside the selected Owlbear layer. Creating the first virtual layer also displays the Unassigned group, which can be reordered like a virtual layer.

### State inheritance and overrides

The inheritance control appears immediately to the left of Click-through on Owlbear layers, virtual layers, Unassigned groups, and individual items. Enabling inheritance stores that level's click-through, locked, and visibility values and applies them continuously to its contents, including items added or moved there later. On an item with no parent rule, the same control uses *Block inheritance* and *Allow inheritance* to describe creating or removing its explicit item-level block.

Inheritance cascades from an Owlbear layer to its virtual or Unassigned groups and then to individual items. The inheritance glyph shows the entire path: gray with a slash means no inheritance rule applies, gold means inheritance flows normally, red with a break at the virtual-layer step means that virtual or Unassigned group blocks its parent, and red with a break at the item step means that item blocks its parent. Inherited state buttons are disabled; select *Override inherited state* to create an editable local rule. Removing an override returns that level to its nearest parent rule.

Linked virtual layers always enforce their shared state, blocking inheritance from their parent Owlbear layers. Their inheritance controls are disabled until they are unlinked. Individual child items can still override the linked state normally.

When no parent rule exists, inheritance captures the states shown by the heading. Empty layers start clickable, unlocked, and visible. Mixed ordinary states use blue rather than gold. Bulk state actions skip children that have more-specific overrides.

### Disable / Enable clicks

Disabling clicks makes an item click-through on the map, allowing you to select and interact with items behind it. The item remains available in Outliner+, where you can enable clicks again.

On an Owlbear-layer heading, the control affects every item in that Owlbear layer, including items assigned to virtual layers. On a virtual-layer heading, it affects every item assigned to that virtual layer. On an item row, it affects that item. The control appears immediately to the left of Lock at every level.

A heading's glyph summarizes its eligible contents: disabled clicks means every item is click-through, enabled clicks means every item can be clicked, and a blue glyph indicates a mixture of the two states. The control is disabled when the layer is empty unless a local inheritance rule is being edited.

### Lock / Unlock

On an Owlbear-layer heading, locks or unlocks every item in that Owlbear layer, including items assigned to virtual layers. On a virtual-layer heading, it affects every item assigned to that virtual layer. On an item row, it affects that item.

A heading's glyph summarizes its eligible contents: locked means every item is locked, unlocked means every item is unlocked, and a blue glyph indicates a mixture of locked and unlocked items. The control is disabled when the layer is empty unless a local inheritance rule is being edited.

### Show / Hide

On an Owlbear-layer heading, shows or hides every item in that Owlbear layer, including items assigned to virtual layers. On a virtual-layer heading, it affects every item assigned to that virtual layer. On an item row, it affects that item. Fog uses Cut and Uncut glyphs for the equivalent visibility actions.

A heading's glyph summarizes its eligible contents: visible means every item is visible, hidden means every item is hidden, and a blue glyph indicates a mixture of visible and hidden items. The control is disabled when the layer is empty unless a local inheritance rule is being edited.

### Send

Send is available on individual items, virtual-layer headings, and the Unassigned heading.

#### to Front / Forward / Backward / to Back

For items, these commands move the current selection within each selected item's virtual layer, or within its Owlbear layer when that layer has no virtual layers. Virtual-layer boundaries are preserved.

For virtual layers and Unassigned, these commands move the entire group relative to the other groups in the same Owlbear layer.

#### to Layer

For items, moves the current selection to another Owlbear or virtual layer.

For a virtual layer or Unassigned, moves every contained item to the chosen destination. This action requires confirmation because virtual layers cannot be nested and the container itself is not moved.

### Delete

Deletes the selected virtual layer without deleting its items. Its items become Unassigned, or return directly to their Owlbear layer when no virtual layers remain there.

### Edit

Renames the selected virtual layer.

### Locate

Centers the viewport on the selected item and briefly highlights the item's bounds on the map.

## Owlbear context menu

Outliner+ adds a Send entry to Owlbear Rodeo's item context menu. It provides the same stacking and layer destinations as the Send control in the Outliner+ panel and operates on the current selection.
