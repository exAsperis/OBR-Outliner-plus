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
}: ItemActionVisibilityInput): ItemActionVisibility {
  const interacting = selected || hovering || focusWithin;
  const showGeneralActions = interacting || layerMenuOpen;
  const showInheritance = hasUpdatePermission && (interacting || inheritanceActive);
  const showTransparent = isGm && hasUpdatePermission && (interacting || inheritanceActive || transparent);
  const showDisableHit = hasUpdatePermission && (interacting || inheritanceActive || disableHit);
  const showLock = hasUpdatePermission && (interacting || inheritanceActive || locked);
  const showVisibility = isGm && (interacting || inheritanceActive || !visible);

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

export function getItemActionReservedSlots(visibility: ItemActionVisibility, hasUpdatePermission: boolean) {
  const visibleSlots = [
    visibility.showGeneralActions,
    visibility.showGeneralActions && hasUpdatePermission,
    visibility.showInheritance,
    visibility.showTransparent,
    visibility.showDisableHit,
    visibility.showLock,
    visibility.showVisibility,
  ];
  const firstVisible = visibleSlots.indexOf(true);
  return firstVisible < 0 ? 0 : visibleSlots.length - firstVisible;
}
