import OBR from "@owlbear-rodeo/sdk";
import { EXTENSION_ID, SEND_TO_LAYER_POPOVER_ID } from "./constants";
import { stackItems } from "./stackItems";
import type { StackOperation } from "./stacking";

const commands: Array<{
  operation: StackOperation;
  label: string;
  icon: string;
}> = [
  {
    operation: "front",
    label: "Send to Front",
    icon: "/send-to-front.svg?v=0.3.0",
  },
  {
    operation: "forward",
    label: "Send Forward",
    icon: "/send-forward.svg?v=0.3.0",
  },
  {
    operation: "backward",
    label: "Send Backward",
    icon: "/send-backward.svg?v=0.3.0",
  },
  {
    operation: "back",
    label: "Send to Back",
    icon: "/send-to-back.svg?v=0.3.0",
  },
];

const SEND_TO_LAYER_CONTEXT_MENU_ID = `${EXTENSION_ID}/send-to-layer`;

let ready = false;

OBR.onReady(async () => {
  ready = true;
  for (const command of commands) {
    await OBR.contextMenu.create({
      id: `${EXTENSION_ID}/stack/${command.operation}`,
      icons: [
        {
          icon: command.icon,
          label: command.label,
          filter: { permissions: ["UPDATE"] },
        },
      ],
      async onClick(context) {
        if (!context.items.length) {
          return;
        }
        const sceneItems = await OBR.scene.items.getItems();
        await stackItems(
          sceneItems,
          context.items.map((item) => item.id),
          command.operation
        );
      },
    });
  }

  await OBR.contextMenu.create({
    id: SEND_TO_LAYER_CONTEXT_MENU_ID,
    icons: [
      {
        icon: "/send-to-layer.svg?v=0.3.0",
        label: "Send to Layer",
        filter: { permissions: ["UPDATE"] },
      },
    ],
    onClick(_context, elementId) {
      return OBR.popover.open({
        id: SEND_TO_LAYER_POPOVER_ID,
        url: "https://outliner-plus.ex-asperis.com/send-to-layer.html?v=0.3.0",
        width: 220,
        height: 420,
        anchorElementId: elementId,
      });
    },
  });
});

window.addEventListener("beforeunload", () => {
  if (!ready) {
    return;
  }
  for (const command of commands) {
    void OBR.contextMenu.remove(
      `${EXTENSION_ID}/stack/${command.operation}`
    );
  }
  void OBR.contextMenu.remove(SEND_TO_LAYER_CONTEXT_MENU_ID);
  void OBR.popover.close(SEND_TO_LAYER_POPOVER_ID);
});
