import OBR from "@owlbear-rodeo/sdk";
import { EXTENSION_ID } from "./constants";
import { stackItems } from "./stackItems";
import type { StackOperation } from "./stacking";

const commands: Array<{
  operation: StackOperation;
  label: string;
  icon: string;
}> = [
  { operation: "front", label: "Send to Front", icon: "/send-to-front.svg" },
  { operation: "forward", label: "Send Forward", icon: "/send-forward.svg" },
  {
    operation: "backward",
    label: "Send Backward",
    icon: "/send-backward.svg",
  },
  { operation: "back", label: "Send to Back", icon: "/send-to-back.svg" },
];

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
});
