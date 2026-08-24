import ListItemText from "@mui/material/ListItemText";
import { Item, isShape } from "@owlbear-rodeo/sdk";
import { useMemo } from "react";
import { useOwlbearStore } from "./useOwlbearStore";
import { Textable, capitalize, isTextable, toPlainText } from "./helpers";
import { OverflowTooltipText } from "./OverflowTooltipText";

export function ItemText({ item }: { item: Item }) {
  const role = useOwlbearStore((state) => state.role);
  const name = useMemo(() => {
    if (role === "PLAYER") {
      let name = "Item";
      if (isShape(item)) {
        name = capitalize(item.shapeType);
      } else {
        name = capitalize(item.type);
      }
      return name;
    } else {
      return item.name;
    }
  }, [item, role]);

  if (isTextable(item)) {
    return <TextableText item={item} name={name} />;
  } else {
    return (
      <ListItemText sx={{ minWidth: 0 }} primary={<OverflowTooltipText text={name} />} />
    );
  }
}

function TextableText({ item, name }: { item: Textable; name: string }) {
  const plainText = useMemo(() => {
    if (item.text.type === "PLAIN") {
      return item.text.plainText;
    } else {
      return toPlainText(item.text.richText);
    }
  }, [item.text]);

  return (
    <ListItemText
      sx={{ minWidth: 0 }}
      primary={<OverflowTooltipText text={plainText || name} />}
    />
  );
}
