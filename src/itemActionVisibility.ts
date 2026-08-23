export interface ItemActionVisibilityInput {
  selected: boolean;
  hovering: boolean;
  focusWithin: boolean;
  layerMenuOpen: boolean;
  disableHit?: boolean;
  locked: boolean;
  visible: boolean;
  hasUpdatePermission: boolean;
  isGm: boolean;
}

export interface ItemActionVisibility {
  showActionRow: boolean;
  showGeneralActions: boolean;
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
  disableHit = false,
  locked,
  visible,
  hasUpdatePermission,
  isGm,
}: ItemActionVisibilityInput): ItemActionVisibility {
  const interacting = selected || hovering || focusWithin;
  const showGeneralActions = interacting || layerMenuOpen;
  const showDisableHit = hasUpdatePermission && (interacting || disableHit);
  const showLock = hasUpdatePermission && (interacting || locked);
  const showVisibility = isGm && (interacting || !visible);

  return {
    showActionRow: showGeneralActions || showDisableHit || showLock || showVisibility,
    showGeneralActions,
    showDisableHit,
    showLock,
    showVisibility,
    dimmed: !interacting,
  };
}
