import { Item } from "@owlbear-rodeo/sdk";
import { MapIcon } from "./icons/layers/MapIcon";
import { AttachmentIcon } from "./icons/layers/AttachmentIcon";
import { CharacterIcon } from "./icons/layers/CharacterIcon";
import { FogIcon } from "./icons/layers/FogIcon";
import { MountIcon } from "./icons/layers/MountIcon";
import { NoteIcon } from "./icons/layers/NoteIcon";
import { PropIcon } from "./icons/layers/PropIcon";
import { RulerIcon } from "./icons/layers/RulerIcon";
import { TextIcon } from "./icons/layers/TextIcon";
import { DrawingIcon } from "./icons/layers/DrawingIcon";
import { PointerIcon } from "./icons/layers/PointerIcon";

const ICONS: Record<string, React.ReactNode> = {
  MAP: <MapIcon />,
  ATTACHMENT: <AttachmentIcon />,
  CHARACTER: <CharacterIcon />,
  CONTROL: null,
  DRAWING: <DrawingIcon />,
  FOG: <FogIcon />,
  GRID: null,
  MOUNT: <MountIcon />,
  NOTE: <NoteIcon />,
  POINTER: <PointerIcon />,
  POST_PROCESS: null,
  POPOVER: null,
  PROP: <PropIcon />,
  RULER: <RulerIcon />,
  TEXT: <TextIcon />,
};

export function LayerIcon({ layer }: { layer: Item["layer"] }) {
  return ICONS[layer];
}
