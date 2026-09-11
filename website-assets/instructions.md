# Outliner+ for Owlbear Rodeo

Browse, search, and organize Scene items by layer. Create virtual layers to keep foreground and background elements in a predictable stacking order, inherit interaction, locking, and visibility rules, and tailor the Outliner+ view to the current Scene.

## Overview

Outliner+ builds on the original [Outliner extension](https://extensions.owlbear.rodeo/outliner) with virtual layers, state inheritance, configurable layer visibility, quick controls, and a Locate action.

The Outliner+ panel mirrors the layers and items in the current Scene. Select an item in the panel to select it on the map, double-click an item to center the viewport on it, or use Search to filter the list by name and other item details.

The fixed Total row counts every Scene item. When some native layers are disabled in Settings, it also reports how many items are in those layers so a filtered view is never mistaken for the whole Scene.

## Settings and layer display

Select the Settings gear beside Search and Help to open the control surface. The highlighted gear indicates that Settings is open.

- Manage inheritance enables the shared inheritance system.
- Interaction, Locked/Unlocked, and Visible/Hidden choose which property controls and inheritance rules are active. Interaction starts disabled; Locked/Unlocked and Visible/Hidden start enabled.
- Show layers chooses which role-available native Owlbear layers appear in the hierarchy, Search results, virtual layers, and drag destinations. The count beside each layer is its current number of items.

Layer-display and feature preferences are stored in this browser and do not alter Scene contents. Select Hide empty layers to disable every enabled, role-available layer with no items. Select Show all populated layers to enable every disabled, role-available layer that contains items. A bulk button is disabled when there is nothing for it to change.

## Virtual layers

Virtual layers are containers inside an Owlbear Rodeo layer. They keep groups of items in a consistent stacking order without changing the Owlbear layer those items belong to.

For example:

- In the Maps layer, create Ground and Buildings virtual layers so building images remain above ground images.
- In the Props layer, create Interior and Roof virtual layers so roof props remain above interior props.

Ordinary virtual-layer headings use a dotted-rectangle glyph. Hover a heading to see the layer name without its item count and the range from its lowest to highest z-index.

Drag a virtual-layer heading to change its position, or use its Send menu. Drag items into a virtual layer to assign them to it. Once a native Owlbear layer contains a virtual layer, Outliner+ also displays an italicized Unassigned group for items that have not been assigned to one.

### Limitation

Virtual layers do not override Owlbear Rodeo's layer order. For example, an item in the Props layer cannot be placed above an item in the Characters layer by using a virtual layer.

## State inheritance

Inheritance controls only Interaction, Locked/Unlocked, and Visible/Hidden. It does not change opacity or other item properties.

- Native Owlbear layers supply the root rules for their items.
- Virtual layers and Unassigned groups pass inherited rules through by default. A group can be made independent and enforce any enabled subset of the three properties.
- Individual items inherit eligible rules by default. Use the item inheritance control, whose tooltip reads Block inheritance, to opt an item out; use Allow inheritance to opt it back in.

Inheritance menus and status indicators appear only while Manage inheritance and the corresponding feature are enabled. An inherited item is reconciled after item changes, metadata changes, assignment moves, and rule edits. Shared rules survive virtual-layer rename and reorder, and are removed when their virtual layer is deleted.

## Navigation and layout

Hover an item label to see the complete displayed label and “Z-index: value”. Text items use their displayed text, with the item name as a fallback.

The Total row and layer headers float while their content scrolls, keeping the current context and controls within reach.

Resize the iframe by dragging its right edge, bottom edge, or bottom-right corner. Focus a resize separator and press an arrow key to adjust that axis by 10 pixels, or hold Shift for a 1-pixel adjustment. Width is limited to 300–800 pixels and height to 129–800 pixels. The last full-size dimensions are stored in this browser; once a size is chosen, Settings and layer changes scroll inside it instead of resizing it automatically.

## Quick actions

Game Masters can use the controls in the Outliner+ panel to manage Scene items. Item controls appear when an item is selected or hovered. Actions that update an item are available only when the current player has permission to update it.

### Create virtual layer

Creates a virtual layer inside the selected Owlbear layer. Creating the first virtual layer also displays the Unassigned group, which can be reordered like a virtual layer.

### Disable / Enable clicks

Disabling clicks makes an item click-through on the map, allowing you to select and interact with items behind it. The item remains available in Outliner+, where you can enable clicks again.

On an Owlbear-layer heading, the control sets the layer's Interaction rule when inheritance is enabled. On a virtual-layer or Unassigned heading, it sets that group's rule when the group is independent. On an item row, it affects that item when no inherited rule applies. The control appears immediately to the left of Lock at every level when Interaction is enabled in Settings.

A heading's glyph summarizes its contents: disabled clicks means every item is click-through, enabled clicks means every item can be clicked, and a gold glyph indicates a mixture of the two states. The control is disabled when the layer is empty.

### Lock / Unlock

On an Owlbear-layer heading, the control sets the layer's Locked/Unlocked rule when inheritance is enabled. On a virtual-layer or Unassigned heading, it sets that group's rule when the group is independent. On an item row, it affects that item when no inherited rule applies.

A heading's glyph summarizes its contents: locked means every item is locked, unlocked means every item is unlocked, and a gold glyph indicates a mixture of locked and unlocked items. The control is disabled when the layer is empty.

### Show / Hide

On an Owlbear-layer heading, the control sets the layer's Visible/Hidden rule when inheritance is enabled. On a virtual-layer or Unassigned heading, it sets that group's rule when the group is independent. On an item row, it affects that item when no inherited rule applies. Fog uses Cut and Uncut glyphs for the equivalent visibility actions.

A heading's glyph summarizes its contents: visible means every item is visible, hidden means every item is hidden, and a gold glyph indicates a mixture of visible and hidden items. The control is disabled when the layer is empty.

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
