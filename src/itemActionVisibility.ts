export interface ItemActionVisibilityInput {
  selected: boolean;
  hovering: boolean;
  focusWithin: boolean;
  layerMenuOpen: boolean;
  locked: boolean;
  visible: boolean;
  hasUpdatePermission: boolean;
  isGm: boolean;
}

export interface ItemActionVisibility {
  showActionRow: boolean;
  showGeneralActions: boolean;
  showLock: boolean;
  showVisibility: boolean;
  dimmed: boolean;
}

export function getItemActionVisibility({
  selected,
  hovering,
  focusWithin,
  layerMenuOpen,
  locked,
  visible,
  hasUpdatePermission,
  isGm,
}: ItemActionVisibilityInput): ItemActionVisibility {
  const interacting = selected || hovering || focusWithin;
  const showGeneralActions = interacting || layerMenuOpen;
  const showLock = hasUpdatePermission && (interacting || locked);
  const showVisibility = isGm && (interacting || !visible);

  return {
    showActionRow: showGeneralActions || showLock || showVisibility,
    showGeneralActions,
    showLock,
    showVisibility,
    dimmed: !interacting,
  };
}
