// The glyph button as a component's shadow root shows it, which the section tree's, the drawer's,
// and the site's cases share: the class's row and padding, against the foundation's own tokens
// and a plain native button in the same root, so a case fails when a length is literal or the
// native border and surface are lost; the button's box, held to WCAG 2.5.8's 24 CSS px; the
// interest hint its interestfor names, resolved in the button's own tree, a hint popover holding
// the button's name; the name the page's accessibility tree exposes for it, with no description,
// so the name is announced once; and the mouse moved onto the button, or off it, as a user points
// at it to show the hint.

import assert from "node:assert/strict";

import { until } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Page } from "@jaimestill/spike-html-apps-tooling/browser.js";

/** The smallest target WCAG 2.5.8 allows, in CSS px a side. */
export const TARGET = 24;

/** A glyph button as the page renders it. */
export interface GlyphButton {
  /** Whether it is a native button of the class glyph-button. */
  classed: boolean;
  /** Its computed display, align-items, gap, and padding, block then inline. */
  display: string;
  align: string;
  gap: string;
  padding: string[];
  /** The same lengths the foundation's tokens give in the button's root: --space-3xs and
   * --space-2xs. */
  tokens: { "3xs": string; "2xs": string };
  /** Its border, radius, and background, and a plain native button's in the same root. */
  surface: string;
  native: string;
  /** Its rendered box, in CSS px. */
  width: number;
  height: number;
  /** Its name: its aria-label, or its text as the accessible name takes it. */
  label: string;
  /** The interest target's id, whether interestForElement resolves to it in the button's own
   * tree, its popover state, its text, and whether it is hidden from the accessibility tree. */
  interestfor: string | null;
  resolves: boolean;
  popover: string | null;
  hint: string;
  hidden: string | null;
}

/**
 * sl-drawer's Close button's name, a page expression on `button` for glyphButton()'s label: the
 * close slot's text, its assigned nodes' or its default, then the label, as the accessible name
 * takes them.
 */
export const CLOSE_NAME = `(() => {
  const slot = button.querySelector("slot[name=close]");
  const assigned = slot.assignedNodes({ flatten: true });
  const text = assigned.map((node) => node.textContent).join("");
  return (text + " " + button.getRootNode().host.label).replace(/\\s+/g, " ").trim();
})()`;

/**
 * The glyph button the page expression `button` names, read in the page. `label` is a page
 * expression for the button's name, its aria-label by default.
 */
export const glyphButton = (
  page: Page,
  button: string,
  label = "button.getAttribute('aria-label')",
): Promise<GlyphButton> =>
  page.evaluate(`(() => {
    const button = ${button};
    const root = button.getRootNode();
    const style = getComputedStyle(button);
    // A probe in the button's root, its padding the two space steps, and a plain native button.
    const probe = document.createElement("div");
    probe.style.padding = "var(--space-3xs) var(--space-2xs)";
    const plain = document.createElement("button");
    plain.type = "button";
    const parent = button.parentNode;
    parent.append(probe, plain);
    const steps = getComputedStyle(probe);
    const surface = (it) => {
      const s = getComputedStyle(it);
      return [s.borderTopStyle, s.borderTopWidth, s.borderTopColor, s.borderRadius,
        s.backgroundColor, s.color].join(" ");
    };
    const native = surface(plain);
    const tokens = { "3xs": steps.paddingTop, "2xs": steps.paddingLeft };
    probe.remove();
    plain.remove();
    const box = button.getBoundingClientRect();
    const id = button.getAttribute("interestfor");
    const target = id === null ? null : root.getElementById(id);
    return {
      classed: button.localName === "button" && button.classList.contains("glyph-button"),
      display: style.display,
      align: style.alignItems,
      gap: style.columnGap,
      padding: [style.paddingBlockStart, style.paddingBlockEnd, style.paddingInlineStart,
        style.paddingInlineEnd],
      tokens,
      surface: surface(button),
      native,
      width: box.width,
      height: box.height,
      label: ${label},
      interestfor: id,
      resolves: target !== null && button.interestForElement === target,
      popover: target?.getAttribute("popover") ?? null,
      hint: (target?.textContent ?? "").replace(/\\s+/g, " ").trim(),
      hidden: target?.getAttribute("aria-hidden") ?? null,
    };
  })()`);

/**
 * Asserts the button is a glyph button, as glyphButton() read it: the class on a native button, its
 * glyph and hint in a centered row, padding --space-3xs block and --space-2xs inline, --space-3xs
 * between, the native button's border and surface, and an interestfor resolving to a hint popover
 * hidden from the accessibility tree whose text is the button's name.
 */
export function assertGlyphButton(shown: GlyphButton, what: string): void {
  assert.ok(shown.classed, `${what}: a native button of the class glyph-button`);
  // inline-flex, blockified to flex where the button is itself a flex item.
  assert.match(shown.display, /^(inline-)?flex$/, `${what}: a row`);
  assert.equal(shown.align, "center", `${what}: centered`);
  const { "3xs": block, "2xs": inline } = shown.tokens;
  assert.deepEqual(
    shown.padding,
    [block, block, inline, inline],
    `${what}: padding --space-3xs block and --space-2xs inline`,
  );
  assert.equal(shown.gap, block, `${what}: --space-3xs between the glyph and its hint`);
  assert.equal(shown.surface, shown.native, `${what}: the native button's border and surface`);
  assert.ok(shown.interestfor !== null && shown.resolves, `${what}: interestfor resolves`);
  assert.equal(shown.popover, "hint", `${what}: its interest target is a hint popover`);
  assert.equal(shown.hint, shown.label, `${what}: the hint's text is the button's name`);
  assert.ok(shown.label.length > 0, `${what}: the button has a name`);
  assert.equal(shown.hidden, "true", `${what}: the hint is hidden from the accessibility tree`);
}

/** Asserts the button's box is at least TARGET CSS px a side. */
export function assertTarget(shown: GlyphButton, what: string): void {
  assert.ok(
    shown.width >= TARGET && shown.height >= TARGET,
    `${what}: ${shown.width}x${shown.height} is at least ${TARGET}x${TARGET}`,
  );
}

/** A node of the page's accessibility tree, with its name and description. */
interface Described {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
}

/** The descriptions the page's accessibility tree exposes for the buttons named `name`. */
export async function descriptions(page: Page, name: string): Promise<string[]> {
  const { nodes }: { nodes: Described[] } = await page.cdp("Accessibility.getFullAXTree", {});
  return nodes
    .filter((node) => !node.ignored && node.role?.value === "button" && node.name?.value === name)
    .map((node) => node.description?.value ?? "");
}

/**
 * Whether the button's hint shows, as a popover open, and where, against the button's box: the
 * page expression `button` names the button, its interest target the hint.
 */
export const hintShown = (
  page: Page,
  button: string,
): Promise<{ open: boolean; below: boolean; above: boolean; overlaps: boolean }> =>
  page.evaluate(`(() => {
    const button = ${button};
    const hint = button.interestForElement;
    const b = button.getBoundingClientRect();
    const h = hint.getBoundingClientRect();
    return {
      open: hint.matches(":popover-open"),
      below: h.top >= b.bottom,
      above: h.bottom <= b.top,
      overlaps: h.left < b.right && h.right > b.left,
    };
  })()`);

/** Waits until the button's hint is open, or closed. */
export const untilHint = (page: Page, button: string, open: boolean): Promise<void> =>
  until(page, `(${button}).interestForElement?.matches(":popover-open") === ${open}`);

/**
 * Moves the mouse onto the center of the button the page expression `button` names, as a user
 * points at it; the hint shows once the browser's interest delay has passed.
 */
export async function hover(page: Page, button: string): Promise<void> {
  const { x, y }: { x: number; y: number } = await page.evaluate(`(() => {
    const { left, top, width, height } = (${button}).getBoundingClientRect();
    return { x: left + width / 2, y: top + height / 2 };
  })()`);
  await page.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
}

/** Moves the mouse to the viewport's top-left corner, off any button. */
export const pointAway = (page: Page): Promise<unknown> =>
  page.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
