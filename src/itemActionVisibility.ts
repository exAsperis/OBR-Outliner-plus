export interface ItemActionVisibilityInput {
  selected: boolean;
  hovering: boolean;
  focusWithin: boolean;
  layerMenuOpen: boolean;
  inheritanceActive?: boolean;
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
  disableHit = false,
  locked,
  visible,
  hasUpdatePermission,
  isGm,
}: ItemActionVisibilityInput): ItemActionVisibility {
  const interacting = selected || hovering || focusWithin;
  const showGeneralActions = interacting || layerMenuOpen;
  const showInheritance = hasUpdatePermission && (interacting || inheritanceActive);
  const showDisableHit = hasUpdatePermission && (interacting || inheritanceActive || disableHit);
  const showLock = hasUpdatePermission && (interacting || inheritanceActive || locked);
  const showVisibility = isGm && (interacting || inheritanceActive || !visible);

  return {
    showActionRow: showGeneralActions || showInheritance || showDisableHit || showLock || showVisibility,
    showGeneralActions,
    showInheritance,
    showDisableHit,
    showLock,
    showVisibility,
    dimmed: !interacting,
  };
}
