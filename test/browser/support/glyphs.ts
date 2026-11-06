// The icons layer's glyphs as a button shows them, which the section tree's and the drawer's cases
// share: whether the button holds the very glyph the icons module exports, hidden from the
// accessibility tree and drawn in the button's text color, so a case fails when a glyph is missing
// or another; and the accessible names the page's accessibility tree exposes for a role.

import assert from "node:assert/strict";

import type { Page } from "@jaimestill/spike-html-apps-tooling/browser.js";

/** A button's glyph as the page renders it. */
export interface Glyph {
  /** How many svg elements the button holds. */
  count: number;
  /** Whether its svg is the icons module's markup, node for node. */
  matches: boolean;
  /** Its svg's aria-hidden and focusable. */
  hidden: string | null;
  focusable: string | null;
  /** Its svg's rendered box, in CSS px. */
  width: number;
  height: number;
  /** Whether its svg renders, by checkVisibility(). */
  visible: boolean;
  /** Its path's computed fill and the button's computed color, which the fill follows. */
  fill: string;
  color: string;
}

/**
 * The glyph in the button the page expression `button` names, against `markup`, the default
 * export of the icon's module, parsed in the page as the components parse it.
 */
export const glyph = (page: Page, button: string, markup: string): Promise<Glyph> =>
  page.evaluate(`(() => {
    const button = ${button};
    const svgs = button.querySelectorAll("svg");
    const svg = svgs[0];
    const template = document.createElement("template");
    template.innerHTML = ${JSON.stringify(markup)};
    const box = svg?.getBoundingClientRect();
    const path = svg?.querySelector("path");
    return {
      count: svgs.length,
      matches: svg ? template.content.firstElementChild.isEqualNode(svg) : false,
      hidden: svg?.getAttribute("aria-hidden") ?? null,
      focusable: svg?.getAttribute("focusable") ?? null,
      width: box?.width ?? 0,
      height: box?.height ?? 0,
      visible: svg?.checkVisibility() ?? false,
      fill: path ? getComputedStyle(path).fill : "",
      color: getComputedStyle(button).color,
    };
  })()`);

/**
 * Asserts the button shows its glyph, as glyph() read it: one svg, the module's markup, hidden from
 * the accessibility tree and from focus, rendered with a box, and drawn in the button's text color.
 */
export function assertGlyph(shown: Glyph, what: string): void {
  assert.equal(shown.count, 1, `${what}: one glyph`);
  assert.ok(shown.matches, `${what}: the glyph is the icon module's markup`);
  assert.deepEqual(
    [shown.hidden, shown.focusable],
    ["true", "false"],
    `${what}: hidden, unfocusable`,
  );
  assert.ok(shown.visible && shown.width > 0 && shown.height > 0, `${what}: the glyph renders`);
  assert.equal(shown.fill, shown.color, `${what}: the glyph is drawn in the button's color`);
}

/** A node of the page's accessibility tree, as Accessibility.getFullAXTree gives it. */
interface AXNode {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
}

/** The names of the nodes of `role` the page's accessibility tree exposes, shadow roots included. */
export async function exposed(page: Page, role: string): Promise<string[]> {
  const { nodes }: { nodes: AXNode[] } = await page.cdp("Accessibility.getFullAXTree", {});
  return nodes
    .filter((node) => !node.ignored && node.role?.value === role)
    .map((node) => node.name?.value ?? "");
}
