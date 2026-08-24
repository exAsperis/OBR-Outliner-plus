export interface ItemActionVisibilityInput {
  selected: boolean;
  hovering: boolean;
  focusWithin: boolean;
  layerMenuOpen: boolean;
  inheritanceActive?: boolean;
  transparent?: boolean;
  disableHit?: boolean;
  locked: boolean;
  visible: boolean;
  hasUpdatePermission: boolean;
  isGm: boolean;
  manageInheritance?: boolean;
  transparencyEnabled?: boolean;
  interactionEnabled?: boolean;
  lockedEnabled?: boolean;
  visibleEnabled?: boolean;
}

export interface ItemActionVisibility {
  showActionRow: boolean;
  showGeneralActions: boolean;
  showInheritance: boolean;
  showTransparent: boolean;
  showDisableHit: boolean;
  showLock: boolean;
  showVisibility: boolean;
  dimmed: boolean;
}

export function getItemActionVisibility({
  selected,
  hovering,
  focusWithin,
  layerMenuOpen,
  inheritanceActive = false,
  transparent = false,
  disableHit = false,
  locked,
  visible,
  hasUpdatePermission,
  isGm,
  manageInheritance = true,
  transparencyEnabled = true,
  interactionEnabled = true,
  lockedEnabled = true,
  visibleEnabled = true,
}: ItemActionVisibilityInput): ItemActionVisibility {
  const interacting = selected || hovering || focusWithin;
  const showGeneralActions = interacting || layerMenuOpen;
  const showInheritance = manageInheritance && hasUpdatePermission && (interacting || inheritanceActive);
  const showTransparent = transparencyEnabled && isGm && hasUpdatePermission && (interacting || inheritanceActive || transparent);
  const showDisableHit = interactionEnabled && hasUpdatePermission && (interacting || inheritanceActive || disableHit);
  const showLock = lockedEnabled && hasUpdatePermission && (interacting || inheritanceActive || locked);
  const showVisibility = visibleEnabled && isGm && (interacting || inheritanceActive || !visible);

  return {
    showActionRow: showGeneralActions || showInheritance || showTransparent || showDisableHit || showLock || showVisibility,
    showGeneralActions,
    showInheritance,
    showTransparent,
    showDisableHit,
    showLock,
    showVisibility,
    dimmed: !interacting,
  };
}

export function getItemActionReservedSlots(visibility: ItemActionVisibility, hasUpdatePermission: boolean, enabled = {
  manageInheritance: true,
  transparency: true,
  interaction: true,
  locked: true,
  visible: true,
}) {
  const visibleSlots = [
    visibility.showGeneralActions,
    visibility.showGeneralActions && hasUpdatePermission,
    ...(enabled.manageInheritance ? [visibility.showInheritance] : []),
    ...(enabled.transparency ? [visibility.showTransparent] : []),
    ...(enabled.interaction ? [visibility.showDisableHit] : []),
    ...(enabled.locked ? [visibility.showLock] : []),
    ...(enabled.visible ? [visibility.showVisibility] : []),
  ];
  const firstVisible = visibleSlots.indexOf(true);
  return firstVisible < 0 ? 0 : visibleSlots.length - firstVisible;
}
