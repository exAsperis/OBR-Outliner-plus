import { TextContent } from "@owlbear-rodeo/sdk";

export interface Textable {
  id: string;
  text: TextContent;
  name: string;
}

export function isTextable(item: unknown): item is Textable {
  return (
    isPlainObject(item) &&
    typeof item.id === "string" &&
    typeof item.text === "object" &&
    item.text !== null
  );
}

export function isPlainObject(
  item: unknown
): item is Record<PropertyKey, unknown> {
  return (
    item !== null &&
    typeof item === "object" &&
    Object.getPrototypeOf(item) === Object.prototype
  );
}

interface TextNode {
  text: string;
}

function isTextNode(node: unknown): node is TextNode {
  return isPlainObject(node) && typeof node.text === "string";
}

interface Descendent {
  children: unknown[];
}

function isDescendent(node: unknown): node is Descendent {
  return isPlainObject(node) && Array.isArray(node.children);
}

export function toPlainText(node: unknown): string {
  if (isTextNode(node)) {
    return node.text;
  } else if (isDescendent(node)) {
    return node.children.map((n) => toPlainText(n)).join(" ");
  } else if (Array.isArray(node)) {
    return node.map((n) => toPlainText(n)).join(" ");
  } else {
    return "";
  }
}

export function capitalize(text: string): string {
  return text[0] + text.slice(1).toLowerCase();
}

export function lerp(from: number, to: number, alpha: number): number {
  return from * (1 - alpha) + to * alpha;
}
