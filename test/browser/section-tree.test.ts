// sl-section-tree from this repository's dist/, on test/fixtures/section-tree.html, through its
// public seam alone: the slotted list, the aria-current mark, the keys, the buttons, and the
// progress bar. With no script the list renders and its links jump; aria-current follows the
// scroll; L and H move between sections, which the keys help dialog lists, and do nothing with
// the keys turned off, while every arrow stays the browser's scrolling, in the page and in a
// region that scrolls sideways; a move is smooth unless the reader asks for reduced motion; the
// progress bar runs on the root's scroll timeline, guarded by @supports; and the tree renders in
// every profile the foundation's full entry registers, light and dark, at 1280 and 390 px, with
// no sideways scroll and its focus drawn.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch, SETTLED, until } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { registry as read, resize, runs, type Registry } from "./support/profiles.ts";
import { served } from "./support/served.ts";

const FIXTURE = "/test/fixtures/section-tree.html";

/** The tree's shadow root, in a page expression. */
const SHADOW = `document.querySelector("sl-section-tree").shadowRoot`;

/** The tree's links, in a page expression. */
const LINKS = `[...document.querySelectorAll("sl-section-tree a")]`;

/** The headings the links name, in tree order, in a page expression. */
const HEADINGS = `${LINKS}.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))`;

/** The keys the cases press, as the protocol's key events give them. */
const KEYS = {
  h: { key: "h", code: "KeyH", windowsVirtualKeyCode: 72, text: "h" },
  l: { key: "l", code: "KeyL", windowsVirtualKeyCode: 76, text: "l" },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 },
  Tab: { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 },
  "?": { key: "?", code: "Slash", windowsVirtualKeyCode: 191, modifiers: 8, text: "?" },
};

/** A key pressed and released on the focused element. */
async function press(page: Page, name: keyof typeof KEYS): Promise<void> {
  const { text, ...key } = { text: undefined, ...KEYS[name] };
  await page.cdp("Input.dispatchKeyEvent", {
    type: text === undefined ? "rawKeyDown" : "keyDown",
    ...key,
    ...(text === undefined ? {} : { text, unmodifiedText: text }),
  });
  await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...key });
}

/** The reader's motion preference. */
const motion = (page: Page, value: "reduce" | "no-preference") =>
  page.cdp("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value }],
  });

/** The index of the link carrying aria-current="location", or -1, and how many carry any. */
const current = (page: Page): Promise<{ index: number; marked: number }> =>
  page.evaluate(`(() => {
    const links = ${LINKS};
    return {
      index: links.findIndex((a) => a.getAttribute("aria-current") === "location"),
      marked: links.filter((a) => a.hasAttribute("aria-current")).length,
    };
  })()`);

/** Resolves once the scroll has stopped: two frames with scrollY unchanged. */
const still = (page: Page) =>
  page.evaluate(`new Promise((resolve) => {
    let last = scrollY;
    let same = 0;
    const frame = () => {
      same = scrollY === last ? same + 1 : 0;
      last = scrollY;
      if (same >= 2) resolve(scrollY);
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  })`);

/** The top of heading `index` in the viewport, in CSS px. */
const headingTop = (page: Page, index: number): Promise<number> =>
  page.evaluate(`${HEADINGS}[${index}].getBoundingClientRect().top`);

describe("sl-section-tree", { timeout: 120_000 }, () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  before(async () => {
    server = await serve(served);
    browser = await launch();
    page = await browser.open("about:blank");
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  /** Loads the fixture at the viewport's size and motion, its keys settings cleared, rendered. */
  async function load(
    { width = 1280, reduce = true }: { width?: number; reduce?: boolean } = {},
    query = "",
  ) {
    await resize(page, width);
    await motion(page, reduce ? "reduce" : "no-preference");
    await page.goto(`${server.origin}${FIXTURE}${query}`);
    await page.evaluate(`localStorage.clear()`);
    await page.goto(`${server.origin}${FIXTURE}${query}`);
    await page.evaluate(`window.ready.then(() => ${SETTLED})`);
  }

  describe("with no script", () => {
    before(async () => {
      await page.cdp("Emulation.setScriptExecutionDisabled", { value: true });
      await resize(page, 1280);
      await page.goto(`${server.origin}${FIXTURE}`);
    });
    after(() => page.cdp("Emulation.setScriptExecutionDisabled", { value: false }));

    test("the list renders, every link shown and naming a heading on the page", async () => {
      const shown: { defined: boolean; links: { text: string; seen: boolean; named: boolean }[] } =
        await page.evaluate(`({
          defined: customElements.get("sl-section-tree") !== undefined,
          links: ${LINKS}.map((a, i) => {
            const box = a.getBoundingClientRect();
            const heading = ${HEADINGS}[i];
            return {
              text: a.textContent.trim(),
              seen: box.width > 0 && box.height > 0,
              named: heading !== null && /^H[23]$/.test(heading.tagName),
            };
          }),
        })`);
      assert.equal(shown.defined, false, "no script defined the element");
      assert.ok(shown.links.length >= 10, `the fixture's tree holds ${shown.links.length} links`);
      for (const link of shown.links) {
        assert.ok(link.seen, `${link.text} is shown`);
        assert.ok(link.named, `${link.text} names an h2 or h3`);
      }
    });

    test("a link jumps to its heading", async () => {
      const box: { x: number; y: number } = await page.evaluate(`(() => {
        const box = ${LINKS}[3].getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      })()`);
      for (const type of ["mousePressed", "mouseReleased"]) {
        await page.cdp("Input.dispatchMouseEvent", { type, ...box, button: "left", clickCount: 1 });
      }
      // until() and still() poll inside the page, which runs no script here: poll from the test,
      // the jump smooth or not.
      const deadline = Date.now() + 5_000;
      let jumped = false;
      while (!jumped && Date.now() < deadline) {
        jumped = await page.evaluate(
          `(() => {
            // The target lands its scroll-margin below the viewport's top, as the reset sets it.
            const heading = ${HEADINGS}[3];
            const margin = parseFloat(getComputedStyle(heading).scrollMarginTop);
            return location.hash === ${LINKS}[3].hash &&
              Math.abs(heading.getBoundingClientRect().top - margin) <= 1;
          })()`,
        );
        if (!jumped) await new Promise((resolve) => setTimeout(resolve, 25));
      }
      const where = await page.evaluate(
        `({ hash: location.hash, want: ${LINKS}[3].hash, top: ${HEADINGS}[3].getBoundingClientRect().top })`,
      );
      assert.ok(jumped, JSON.stringify({ ...where, box }));
    });
  });

  describe("with script", () => {
    beforeEach(() => load());

    test("the shadow root holds the nav landmark, named by label, around the slot", async () => {
      const nav: { label: string; slotted: string[]; errors: string[] } = await page.evaluate(`({
        label: ${SHADOW}.querySelector("nav").getAttribute("aria-label"),
        slotted: ${SHADOW}.querySelector("nav slot").assignedElements().map((el) => el.localName),
        errors: window.errors,
      })`);
      assert.deepEqual(nav, { label: "On this page", slotted: ["ul"], errors: [] });
    });

    test("aria-current marks the first section at the top, then follows the scroll", async () => {
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
      const count: number = await page.evaluate(`${LINKS}.length`);
      let reached = 0;
      for (let i = 0; i < count; i++) {
        await page.evaluate(
          `${HEADINGS}[${i}].scrollIntoView({ block: "start", behavior: "instant" })`,
        );
        await still(page);
        // A heading near the page's end can't reach the line; the cases check those it reaches.
        if ((await headingTop(page, i)) > 1) continue;
        reached++;
        await until(page, `${LINKS}[${i}].getAttribute("aria-current") === "location"`);
        assert.deepEqual(await current(page), { index: i, marked: 1 }, `section ${i}`);
      }
      assert.ok(reached >= count - 2, `${reached} of ${count} headings reached the line`);
      await page.evaluate(`scrollTo({ top: 0, behavior: "instant" })`);
      await until(page, `${LINKS}[0].getAttribute("aria-current") === "location"`);
    });

    test("L and H move to the next and the previous section", async () => {
      await press(page, "l");
      await still(page);
      assert.deepEqual(await current(page), { index: 1, marked: 1 });
      assert.ok(Math.abs(await headingTop(page, 1)) <= 1, "the next heading is at the top");
      await press(page, "l");
      await still(page);
      assert.deepEqual(await current(page), { index: 2, marked: 1 });
      await press(page, "h");
      await still(page);
      assert.deepEqual(await current(page), { index: 1, marked: 1 });
      assert.ok(Math.abs(await headingTop(page, 1)) <= 1, "the previous heading is at the top");
    });

    test("L reaches the last section where the page can't scroll it to the line", async () => {
      const count: number = await page.evaluate(`${LINKS}.length`);
      for (let i = 1; i < count; i++) {
        await press(page, "l");
        await still(page);
        assert.deepEqual(await current(page), { index: i, marked: 1 }, `move ${i}`);
      }
      await press(page, "l");
      await still(page);
      assert.deepEqual(await current(page), { index: count - 1, marked: 1 }, "past the last");
      const next: boolean = await page.evaluate(`${SHADOW}.querySelector(".next").disabled`);
      assert.equal(next, true, "Next is disabled at the last section");
    });

    /** Records each keys-fire binding, and each keydown's key and whether it was cancelled. */
    const record = () =>
      page.evaluate(`window.fired = [];
        window.pressed = [];
        document.addEventListener("keys-fire", (event) => window.fired.push(event.detail.binding));
        // On the window, so it runs after the keys module's listener on the document.
        addEventListener("keydown", (event) =>
          window.pressed.push({ key: event.key, cancelled: event.defaultPrevented }));`);

    test("the arrows stay the browser's scrolling, firing no binding and never cancelled", async () => {
      await record();
      await press(page, "ArrowRight");
      await press(page, "ArrowLeft");
      await press(page, "ArrowDown");
      await until(page, "scrollY > 0");
      assert.deepEqual(await page.evaluate("window.fired"), []);
      assert.deepEqual(await page.evaluate("window.pressed"), [
        { key: "ArrowRight", cancelled: false },
        { key: "ArrowLeft", cancelled: false },
        { key: "ArrowDown", cancelled: false },
      ]);
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
    });

    test("ArrowRight and ArrowLeft scroll a focused region sideways", async () => {
      await page.evaluate(`(() => {
        const region = document.getElementById("wide");
        region.scrollIntoView({ block: "center", behavior: "instant" });
        region.focus();
      })()`);
      await still(page);
      const before: { index: number; marked: number } = await current(page);
      const wide: { scroll: number; client: number } = await page.evaluate(`(() => {
        const region = document.getElementById("wide");
        return { scroll: region.scrollWidth, client: region.clientWidth };
      })()`);
      assert.ok(wide.scroll > wide.client, `the region scrolls: ${JSON.stringify(wide)}`);
      await record();
      await press(page, "ArrowRight");
      await until(page, `document.getElementById("wide").scrollLeft > 0`);
      const right: number = await page.evaluate(`document.getElementById("wide").scrollLeft`);
      await press(page, "ArrowLeft");
      await until(page, `document.getElementById("wide").scrollLeft < ${right}`);
      assert.deepEqual(await page.evaluate("window.fired"), []);
      assert.deepEqual(await current(page), before, "the section in view is unchanged");
    });

    test("the buttons move between sections, each showing its bracketed key hint", async () => {
      const shown: { text: string; keys: string | null; disabled: boolean }[] =
        await page.evaluate(`[...${SHADOW}.querySelectorAll(".moves button")].map((button) => ({
          text: button.textContent.replace(/\\s+/g, " ").trim(),
          keys: button.getAttribute("aria-keyshortcuts"),
          disabled: button.disabled,
        }))`);
      assert.deepEqual(shown, [
        { text: "Previous [H]", keys: "H", disabled: true },
        { text: "Next [L]", keys: "L", disabled: false },
      ]);
      await page.evaluate(`${SHADOW}.querySelector(".next").click()`);
      await still(page);
      assert.deepEqual(await current(page), { index: 1, marked: 1 });
      await page.evaluate(`${SHADOW}.querySelector(".previous").click()`);
      await still(page);
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
    });

    test("the keys help dialog lists both moves, and its row runs one", async () => {
      await press(page, "?");
      await until(page, `document.querySelector("#help [data-keys-table]")`);
      const rows: string[][] = await page.evaluate(`[...document.querySelectorAll(
        "#help [data-keys-table] tbody tr")].map((tr) => [...tr.cells].map((td) => td.textContent.trim()))`);
      assert.ok(
        rows.some(([keys, action]) => keys === "H" && action === "Previous section"),
        JSON.stringify(rows),
      );
      assert.ok(
        rows.some(([keys, action]) => keys === "L" && action === "Next section"),
        JSON.stringify(rows),
      );
      await page.evaluate(`[...document.querySelectorAll("#help [data-keys-table] button")]
        .find((button) => button.textContent === "Next section").click()`);
      await page.evaluate(`document.querySelector("#help").close()`);
      await still(page);
      assert.deepEqual(await current(page), { index: 1, marked: 1 });
    });

    test("with the keys turned off in the help dialog, it marks H and L off and they do nothing", async () => {
      await press(page, "?");
      await until(page, `document.querySelector("#help [name=enabled]")`);
      await page.evaluate(`document.querySelector("#help [name=enabled]").click()`);
      const rows: { keys: string; action: string; off: boolean }[] = await page.evaluate(`[
        ...document.querySelectorAll("#help [data-keys-table] tbody tr")].map((tr) => ({
          keys: tr.cells[0].textContent.trim(),
          action: tr.cells[1].textContent.trim(),
          off: tr.hasAttribute("data-keys-off"),
        }))`);
      for (const [keys, action] of [
        ["H", "Previous section"],
        ["L", "Next section"],
      ]) {
        assert.ok(
          rows.some((row) => row.keys === `${keys} off` && row.action === action && row.off),
          `${action} is marked off: ${JSON.stringify(rows)}`,
        );
      }
      await page.evaluate(`document.querySelector("#help").close()`);
      await until(page, `!document.querySelector("#help").open`);
      const keys: (string | null)[] = await page.evaluate(
        `[...${SHADOW}.querySelectorAll(".moves button")].map((b) => b.getAttribute("aria-keyshortcuts"))`,
      );
      assert.deepEqual(keys, [null, null], "no aria-keyshortcuts while the keys are off");
      await press(page, "l");
      await still(page);
      assert.equal(await page.evaluate("scrollY"), 0);
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
      // The buttons are no shortcut, and still move.
      await page.evaluate(`${SHADOW}.querySelector(".next").click()`);
      await still(page);
      assert.deepEqual(await current(page), { index: 1, marked: 1 });
      await press(page, "h");
      await still(page);
      assert.deepEqual(await current(page), { index: 1, marked: 1 });
    });

    test("under reduced motion a move jumps, with no smooth scroll", async () => {
      const target: number = await page.evaluate(
        `${HEADINGS}[2].getBoundingClientRect().top + scrollY`,
      );
      await press(page, "l");
      await press(page, "l");
      const at: number = await page.evaluate("scrollY");
      assert.ok(Math.abs(at - target) <= 1, `scrollY ${at} is at ${target} at once`);
    });

    test("with no motion preference a move scrolls smoothly to its section", async () => {
      await load({ reduce: false });
      const target: number = await page.evaluate(
        `${HEADINGS}[1].getBoundingClientRect().top + scrollY`,
      );
      await press(page, "l");
      const at: number = await page.evaluate("scrollY");
      assert.ok(at < target - 1, `scrollY ${at} is short of ${target} as the move begins`);
      await until(page, `Math.abs(scrollY - ${target}) <= 1`);
      await still(page);
      assert.deepEqual(await current(page), { index: 1, marked: 1 });
    });
  });

  describe("the reading progress", () => {
    beforeEach(() => load());

    /** Whether the track shows, and the bar's scale along the inline axis. */
    const bar = (): Promise<{ shown: string; scale: number }> =>
      page.evaluate(`(() => {
        const bar = ${SHADOW}.querySelector(".bar");
        const style = getComputedStyle(bar);
        return {
          shown: getComputedStyle(bar.parentElement).display,
          scale: new DOMMatrix(style.transform === "none" ? undefined : style.transform).a
            * (style.scale === "none" ? 1 : Number(style.scale.split(" ")[0])),
        };
      })()`);

    test("with no motion preference the bar follows the root's scroll", async () => {
      await load({ reduce: false });
      const top = await bar();
      assert.equal(top.shown, "grid");
      assert.ok(top.scale < 0.01, `scale ${top.scale} at the top`);
      await page.evaluate(`scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) / 2,
        behavior: "instant" })`);
      await page.evaluate(SETTLED);
      const middle = await bar();
      assert.ok(Math.abs(middle.scale - 0.5) < 0.05, `scale ${middle.scale} halfway`);
      await page.evaluate(
        `scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" })`,
      );
      await page.evaluate(SETTLED);
      const end = await bar();
      assert.ok(end.scale > 0.99, `scale ${end.scale} at the end`);
    });

    test("under reduced motion the bar still shows and follows the scroll", async () => {
      await page.evaluate(
        `scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" })`,
      );
      await page.evaluate(SETTLED);
      const end = await bar();
      assert.equal(end.shown, "grid");
      assert.ok(end.scale > 0.99, `scale ${end.scale} at the end`);
    });

    test("without scroll timelines the indicator is absent and nothing else changes", async () => {
      // An engine without scroll timelines, emulated: every adopted sheet's rules guarded by
      // animation-timeline support are dropped, as such an engine drops them.
      const boxes = `(() => {
        const size = (el) => {
          const box = el.getBoundingClientRect();
          return { width: box.width, height: box.height };
        };
        return {
          progress: getComputedStyle(${SHADOW}.querySelector(".progress")).display,
          list: size(${SHADOW}.querySelector("slot").assignedElements()[0]),
          moves: size(${SHADOW}.querySelector(".moves")),
          nav: size(${SHADOW}.querySelector("nav")).width,
        };
      })()`;
      const supported: Record<string, unknown> = await page.evaluate(boxes);
      await page.evaluate(`(() => {
        const root = ${SHADOW};
        root.adoptedStyleSheets = root.adoptedStyleSheets.map((sheet) => {
          const rules = [...sheet.cssRules].filter(
            (rule) =>
              !(rule instanceof CSSSupportsRule && rule.conditionText.includes("animation-timeline")),
          );
          if (rules.length === sheet.cssRules.length) return sheet;
          const without = new CSSStyleSheet();
          without.replaceSync(rules.map((rule) => rule.cssText).join("\\n"));
          return without;
        });
      })()`);
      await page.evaluate(SETTLED);
      const unsupported: Record<string, unknown> = await page.evaluate(boxes);
      assert.equal(supported.progress, "grid");
      assert.deepEqual(unsupported, { ...supported, progress: "none" });
    });
  });

  describe("in every profile the full entry registers", () => {
    let registry: Registry;
    before(async () => {
      await load();
      registry = await read(page);
    });

    test("registers every palette, space, and type the cases run", () => {
      assert.ok(registry.color.length >= 4, JSON.stringify(registry));
      assert.ok(registry.space.length >= 2, JSON.stringify(registry));
      assert.ok(registry.type.length >= 2, JSON.stringify(registry));
    });

    test("renders with no sideways scroll and its focus drawn, light and dark, wide and narrow", async () => {
      for (const run of runs(registry)) {
        const name = JSON.stringify(run);
        const { width, ...profile } = run;
        await load({ width }, `?${new URLSearchParams(profile)}`);
        const shown: {
          errors: string[];
          dataset: Record<string, string>;
          tree: { left: number; right: number; height: number };
          scrollWidth: number;
          clientWidth: number;
        } = await page.evaluate(`(() => {
          const box = ${SHADOW}.querySelector("nav").getBoundingClientRect();
          return {
            errors: window.errors,
            dataset: { ...document.documentElement.dataset },
            tree: { left: box.left, right: box.right, height: box.height },
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          };
        })()`);
        assert.deepEqual(shown.errors, [], name);
        assert.deepEqual(shown.dataset, profile, name);
        assert.ok(shown.tree.height > 0 && shown.tree.left >= 0, `${name}: the tree renders`);
        assert.ok(shown.tree.right <= shown.clientWidth, `${name}: the tree fits the viewport`);
        assert.ok(shown.scrollWidth <= shown.clientWidth, `${name}: no sideways scroll`);

        // The keyboard reaches the help button, the first link, then past the links the Next
        // button (Previous is disabled at the top); each draws its focus outline.
        const count: number = await page.evaluate(`${LINKS}.length`);
        const focused: { name: string; visible: boolean; outline: string }[] = [];
        for (let i = 0; i < count + 2; i++) {
          await press(page, "Tab");
          if (i !== 1 && i !== count + 1) continue;
          focused.push(
            await page.evaluate(`(() => {
              let el = document.activeElement;
              while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
              const style = getComputedStyle(el);
              return {
                name: el.textContent.replace(/\\s+/g, " ").trim(),
                visible: el.matches(":focus-visible"),
                outline: style.outlineStyle + " " + parseFloat(style.outlineWidth),
              };
            })()`),
          );
        }
        assert.equal(focused[0].name, "Install", name);
        assert.equal(focused[1].name, "Next [L]", name);
        for (const { name: what, visible, outline } of focused) {
          assert.ok(visible, `${name}: ${what} matches :focus-visible`);
          assert.match(outline, /^solid [1-9]/, `${name}: ${what}'s outline is drawn`);
        }
      }
    });
  });
});
