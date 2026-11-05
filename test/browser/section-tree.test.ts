// sl-section-tree from this repository's dist/, on test/fixtures/section-tree.html, through its
// public seam alone: the slotted list, the aria-current mark, the keys, the buttons, the sticky
// bar, and the progress bar. With no script the list renders and its links jump, wide and narrow;
// no link is marked at the page's top, and aria-current follows the scroll; L and H cycle through
// the top and the sections, wrapping either way, which the keys help dialog lists, and do nothing
// with the keys turned off, while every arrow stays the browser's scrolling, in the page and in a
// region that scrolls sideways; a move is smooth unless the reader asks for reduced motion; below
// dock, exactly, for the default and a px dock, and never for a length the query can't read, the
// tree is a bar stuck to the viewport's top, its links hidden, the root's scroll padding keeping
// a heading a move or a link scrolls to below it and put back as it leaves; no link text breaks
// inside a word, whatever the page inherits; the progress bar runs on the root's scroll timeline,
// guarded by @supports; and the tree renders in every profile the foundation's full entry
// registers, light and dark, at 1280 and 390 px, with no sideways scroll and its focus drawn. On
// test/fixtures/section-tree-short.html, whose sections are shorter than the reading line's
// distance from the top, L and H visit every stop in order, each move counting from the stop the
// last one reached, at 1280 and 390 px, instant and smooth, and with a smooth move's scroll cut
// short by the next; the mark follows a reader's scroll as it happens, and after it the next move
// counts from the section in view; and a link followed to a listed section holds it as a move
// would, a tree link clicked or entered at 1280 px, the fragment already in the URL included, and
// a fragment changed by a script or a link elsewhere on the page at 1280 and 390 px, where the
// tree's links are hidden in the bar.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch, SETTLED, until } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { registry as read, resize, runs, type Registry } from "./support/profiles.ts";
import { served } from "./support/served.ts";

const FIXTURE = "/test/fixtures/section-tree.html";

/** The page of short sections, whose next heading is past the line when a move lands. */
const SHORT = "/test/fixtures/section-tree-short.html";

/** The tree's default dock, 70rem, at the initial font size, in px. */
const DOCK = 1120;

/** The tree, in a page expression. */
const TREE = `document.querySelector("sl-section-tree")`;

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
  Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" },
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

/** The bottom of the tree's host in the viewport, in CSS px: the bar's lower edge, when it is one. */
const treeBottom = (page: Page): Promise<number> =>
  page.evaluate(`${TREE}.getBoundingClientRect().bottom`);

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

  /**
   * Loads a fixture, section-tree.html by default, at the viewport's size and motion, its keys
   * settings cleared, rendered.
   */
  async function load(
    {
      width = 1280,
      reduce = true,
      fixture = FIXTURE,
    }: { width?: number; reduce?: boolean; fixture?: string } = {},
    query = "",
  ) {
    await resize(page, width);
    await motion(page, reduce ? "reduce" : "no-preference");
    await page.goto(`${server.origin}${fixture}${query}`);
    await page.evaluate(`localStorage.clear()`);
    await page.goto(`${server.origin}${fixture}${query}`);
    await page.evaluate(`window.ready.then(() => ${SETTLED})`);
  }

  describe("with no script", () => {
    before(async () => {
      await page.cdp("Emulation.setScriptExecutionDisabled", { value: true });
      await resize(page, 1280);
      await page.goto(`${server.origin}${FIXTURE}`);
    });
    after(() => page.cdp("Emulation.setScriptExecutionDisabled", { value: false }));

    test("the list renders, every link shown and naming a heading on the page, wide and narrow", async () => {
      for (const width of [1280, 390]) {
        await resize(page, width);
        await page.goto(`${server.origin}${FIXTURE}`);
        const shown: {
          defined: boolean;
          links: { text: string; seen: boolean; named: boolean }[];
        } = await page.evaluate(`({
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
          assert.ok(link.seen, `${link.text} is shown at ${width}px`);
          assert.ok(link.named, `${link.text} names an h2 or h3`);
        }
      }
      await resize(page, 1280);
      await page.goto(`${server.origin}${FIXTURE}`);
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

    test("aria-current marks no section at the top, then follows the scroll", async () => {
      assert.deepEqual(await current(page), { index: -1, marked: 0 });
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
      await still(page);
      await until(page, `!${LINKS}.some((a) => a.hasAttribute("aria-current"))`);
    });

    test("L from the top moves to the first section, then L and H to the next and the previous", async () => {
      await press(page, "l");
      await still(page);
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
      assert.ok(Math.abs(await headingTop(page, 0)) <= 1, "the first heading is at the top");
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

    test("L reaches the last section, where the page can't scroll it to the line, then the top", async () => {
      const count: number = await page.evaluate(`${LINKS}.length`);
      for (let i = 0; i < count; i++) {
        await press(page, "l");
        await still(page);
        assert.deepEqual(await current(page), { index: i, marked: 1 }, `move ${i}`);
      }
      await press(page, "l");
      await still(page);
      assert.equal(await page.evaluate("scrollY"), 0, "past the last, the page is at its top");
      assert.deepEqual(await current(page), { index: -1, marked: 0 }, "past the last");
      await press(page, "l");
      await still(page);
      assert.deepEqual(await current(page), { index: 0, marked: 1 }, "and round to the first");
    });

    test("H from the top moves to the last section, then back to the first, then the top", async () => {
      const count: number = await page.evaluate(`${LINKS}.length`);
      for (let i = count - 1; i >= 0; i--) {
        await press(page, "h");
        await still(page);
        assert.deepEqual(await current(page), { index: i, marked: 1 }, `move to ${i}`);
      }
      assert.ok(Math.abs(await headingTop(page, 0)) <= 1, "the first heading is at the top");
      await press(page, "h");
      await still(page);
      assert.equal(await page.evaluate("scrollY"), 0, "before the first, the page is at its top");
      assert.deepEqual(await current(page), { index: -1, marked: 0 });
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
      await still(page);
      assert.deepEqual(await page.evaluate("window.fired"), []);
      assert.deepEqual(await page.evaluate("window.pressed"), [
        { key: "ArrowRight", cancelled: false },
        { key: "ArrowLeft", cancelled: false },
        { key: "ArrowDown", cancelled: false },
      ]);
      // Scrolled off the top, the first heading is at the reading line: the scroll's mark, no move.
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

    test("the buttons move between the top and the sections, each showing its bracketed key hint", async () => {
      const shown: { text: string; keys: string | null; disabled: boolean }[] =
        await page.evaluate(`[...${SHADOW}.querySelectorAll(".moves button")].map((button) => ({
          text: button.textContent.replace(/\\s+/g, " ").trim(),
          keys: button.getAttribute("aria-keyshortcuts"),
          disabled: button.disabled,
        }))`);
      assert.deepEqual(shown, [
        { text: "Previous [H]", keys: "H", disabled: false },
        { text: "Next [L]", keys: "L", disabled: false },
      ]);
      await page.evaluate(`${SHADOW}.querySelector(".next").click()`);
      await still(page);
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
      await page.evaluate(`${SHADOW}.querySelector(".next").click()`);
      await still(page);
      assert.deepEqual(await current(page), { index: 1, marked: 1 });
      await page.evaluate(`${SHADOW}.querySelector(".previous").click()`);
      await still(page);
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
      await page.evaluate(`${SHADOW}.querySelector(".previous").click()`);
      await still(page);
      assert.deepEqual(await current(page), { index: -1, marked: 0 });
      assert.equal(await page.evaluate("scrollY"), 0);
      const count: number = await page.evaluate(`${LINKS}.length`);
      await page.evaluate(`${SHADOW}.querySelector(".previous").click()`);
      await still(page);
      assert.deepEqual(await current(page), { index: count - 1, marked: 1 }, "round to the last");
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
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
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
      assert.deepEqual(await current(page), { index: -1, marked: 0 });
      // The buttons are no shortcut, and still move.
      await page.evaluate(`${SHADOW}.querySelector(".next").click()`);
      await still(page);
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
      await press(page, "h");
      await still(page);
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
    });

    test("under reduced motion a move jumps, with no smooth scroll", async () => {
      const target: number = await page.evaluate(
        `${HEADINGS}[1].getBoundingClientRect().top + scrollY`,
      );
      await press(page, "l");
      await press(page, "l");
      const at: number = await page.evaluate("scrollY");
      assert.ok(Math.abs(at - target) <= 1, `scrollY ${at} is at ${target} at once`);
    });

    test("with no motion preference a move scrolls smoothly to its section", async () => {
      await load({ reduce: false });
      const target: number = await page.evaluate(
        `${HEADINGS}[0].getBoundingClientRect().top + scrollY`,
      );
      await press(page, "l");
      const at: number = await page.evaluate("scrollY");
      assert.ok(at < target - 1, `scrollY ${at} is short of ${target} as the move begins`);
      await until(page, `Math.abs(scrollY - ${target}) <= 1`);
      await still(page);
      assert.deepEqual(await current(page), { index: 0, marked: 1 });
    });
  });

  describe("below dock, the sticky bar", () => {
    beforeEach(() => load({ width: 390 }));

    /** The tree's mode, what of it renders, where it sits, and the root's scroll padding. */
    const bar = (): Promise<{
      mode: string | null;
      links: boolean[];
      progress: boolean;
      buttons: boolean[];
      top: number;
      padding: string;
      height: number;
    }> =>
      page.evaluate(`(() => {
        const tree = ${TREE};
        return {
          mode: tree.matches(":state(bar)") ? "bar" : tree.matches(":state(docked)") ? "docked" : null,
          links: ${LINKS}.map((a) => a.checkVisibility()),
          progress: ${SHADOW}.querySelector(".progress").checkVisibility(),
          buttons: [...${SHADOW}.querySelectorAll(".moves button")].map((b) => b.checkVisibility()),
          top: tree.getBoundingClientRect().top,
          padding: document.documentElement.style.scrollPaddingBlockStart,
          height: Math.ceil(tree.getBoundingClientRect().height),
        };
      })()`);

    test("holds the progress and the buttons alone, its links hidden, and sticks to the viewport's top", async () => {
      const shown = await bar();
      assert.equal(shown.mode, "bar");
      assert.ok(shown.links.length >= 10 && shown.links.every((seen) => !seen), "no link shows");
      assert.equal(shown.progress, true, "the progress shows");
      assert.deepEqual(shown.buttons, [true, true], "both buttons show");
      await page.evaluate(`scrollTo({ top: document.documentElement.scrollHeight / 2,
        behavior: "instant" })`);
      await still(page);
      assert.equal((await bar()).top, 0, "the bar is at the viewport's top, scrolled halfway");
      // A move from the bar's own Next button.
      await page.evaluate(`${SHADOW}.querySelector(".next").click()`);
      await still(page);
      assert.equal((await bar()).top, 0, "and after a move");
    });

    test("the root's scroll padding is the bar's height, so a move lands its heading below the bar", async () => {
      const shown = await bar();
      assert.ok(shown.height > 0);
      assert.equal(shown.padding, `${shown.height}px`);
      for (const [key, index] of [
        ["l", 0],
        ["l", 1],
        ["h", 0],
      ] as const) {
        await press(page, key);
        await still(page);
        assert.deepEqual(await current(page), { index, marked: 1 });
        const top = await headingTop(page, index);
        const bottom = await treeBottom(page);
        assert.ok(
          top >= bottom - 1 && top <= bottom + 2,
          `heading ${index} at ${top}, the bar's foot ${bottom}`,
        );
      }
    });

    test("a link to a heading lands it below the bar", async () => {
      const hash: string = await page.evaluate(`${LINKS}[5].hash`);
      await page.evaluate(`location.hash = ${JSON.stringify(hash)}`);
      await still(page);
      const top = await headingTop(page, 5);
      const bottom = await treeBottom(page);
      assert.ok(await page.evaluate("scrollY > 0"), "the page scrolled to the heading");
      assert.ok(top >= bottom - 1 && top < 800, `heading at ${top}, the bar's foot ${bottom}`);
    });

    test("leaving the bar puts back the root's own scroll padding, and entering it takes it again", async () => {
      await page.evaluate(`(() => {
        ${TREE}.remove();
        document.documentElement.style.scrollPaddingBlockStart = "7px";
        document.querySelector("aside").append(window.tree = document.createElement("sl-section-tree"));
      })()`);
      await page.evaluate(`window.tree.updateComplete`);
      const empty: { mode: string | null; padding: string } = await bar();
      assert.equal(empty.mode, "bar");
      assert.notEqual(empty.padding, "7px", "the bar's padding replaces the page's");
      await resize(page, 1280);
      await until(page, `window.tree.matches(":state(docked)")`);
      assert.equal((await bar()).padding, "7px", "docked, the page's own padding is back");
      await resize(page, 390);
      await until(page, `window.tree.matches(":state(bar)")`);
      assert.notEqual((await bar()).padding, "7px");
      await page.evaluate(`window.tree.remove()`);
      assert.equal(
        await page.evaluate(`document.documentElement.style.scrollPaddingBlockStart`),
        "7px",
        "removed, the page's own padding is back",
      );
    });

    for (const [dock, px] of [
      [undefined, DOCK],
      ["600px", 600],
    ] as const) {
      test(`with dock ${dock ?? "at its default, 70rem"}, at exactly ${px}px it is a column, and at ${px - 1}px the bar`, async () => {
        for (const [width, mode] of [
          [px, "docked"],
          [px - 1, "bar"],
        ] as const) {
          await load({ width });
          if (dock !== undefined) await page.evaluate(`${TREE}.dock = ${JSON.stringify(dock)}`);
          await until(page, `${TREE}.matches(":state(${mode})")`);
          const shown = await bar();
          assert.equal(shown.mode, mode, `at ${width}px`);
          assert.equal(shown.links.every(Boolean), mode === "docked", `links at ${width}px`);
        }
      });
    }

    test("a dock the media query can't read leaves it a column at any width", async () => {
      await page.evaluate(`${TREE}.dock = "wide"`);
      await until(page, `${TREE}.matches(":state(docked)")`);
      const shown = await bar();
      assert.equal(shown.links.every(Boolean), true);
      assert.equal(shown.padding, "");
    });
  });

  describe("on a page of short sections", () => {
    /** Loads the short sections' fixture at the viewport's width and motion, as load() does. */
    const short = ({ width, reduce }: { width: number; reduce: boolean }) =>
      load({ width, reduce, fixture: SHORT });

    /**
     * Where a move to stop `index` rests the root's scroll, -1 the top: the heading at the
     * viewport's top, less its scroll margin and the root's scroll padding, within the root's
     * scroll range.
     */
    const rest = (index: number): Promise<number> =>
      page.evaluate(`(() => {
        if (${index} === -1) return 0;
        const root = document.documentElement;
        const heading = ${HEADINGS}[${index}];
        const margin = parseFloat(getComputedStyle(heading).scrollMarginBlockStart) || 0;
        const padding = parseFloat(getComputedStyle(root).scrollPaddingBlockStart) || 0;
        const top = heading.getBoundingClientRect().top + scrollY - margin - padding;
        return Math.min(Math.max(top, 0), root.scrollHeight - root.clientHeight);
      })()`);

    /** The section the reading line marks, a third of the way down: -1 at the top or above it. */
    const atLine = (): Promise<number> =>
      page.evaluate(`scrollY < 1 ? -1 : ${HEADINGS}.findLastIndex(
        (heading) => heading.getBoundingClientRect().top <= innerHeight * 0.34 + 1)`);

    /** Presses `key`, then waits for the page to rest at stop `index`, and a frame past it. */
    async function move(key: "h" | "l", index: number): Promise<void> {
      const want = await rest(index);
      await press(page, key);
      await until(page, `Math.abs(scrollY - ${want}) <= 1`);
      await still(page);
      await page.evaluate(SETTLED);
    }

    for (const width of [1280, 390]) {
      test(`the fixture's sections are short and its last can't reach the top, at ${width}px`, async () => {
        await short({ width, reduce: true });
        const count: number = await page.evaluate(`${LINKS}.length`);
        // From the first heading at the top, the second is already past the reading line.
        await page.evaluate(
          `${HEADINGS}[0].scrollIntoView({ block: "start", behavior: "instant" })`,
        );
        await still(page);
        assert.ok(
          (await headingTop(page, 1)) < (await page.evaluate("innerHeight * 0.34")),
          "the second heading is above the line",
        );
        await page.evaluate(
          `${HEADINGS}[${count - 1}].scrollIntoView({ block: "start", behavior: "instant" })`,
        );
        await still(page);
        assert.ok((await headingTop(page, count - 1)) > 50, "the last heading stays below the top");
      });

      for (const reduce of [true, false]) {
        const named = `at ${width}px${reduce ? "" : ", scrolling smoothly"}`;

        test(`L from the top visits every stop in order, then wraps to the top, ${named}`, async () => {
          await short({ width, reduce });
          const count: number = await page.evaluate(`${LINKS}.length`);
          for (let i = 0; i < count; i++) {
            await move("l", i);
            assert.deepEqual(await current(page), { index: i, marked: 1 }, `L to ${i}`);
            if (i < count - 1) {
              const top = await headingTop(page, i);
              const bottom = width < DOCK ? await treeBottom(page) : 0;
              assert.ok(
                Math.abs(top - bottom) <= 2,
                `heading ${i} at ${top}, the top at ${bottom}`,
              );
            }
          }
          await move("l", -1);
          assert.equal(await page.evaluate("scrollY"), 0, "past the last, the page is at its top");
          assert.deepEqual(await current(page), { index: -1, marked: 0 }, "past the last");
          await move("l", 0);
          assert.deepEqual(await current(page), { index: 0, marked: 1 }, "and round to the first");
        });

        test(`H from the top visits every stop in reverse, then wraps to the top, ${named}`, async () => {
          await short({ width, reduce });
          const count: number = await page.evaluate(`${LINKS}.length`);
          for (let i = count - 1; i >= 0; i--) {
            await move("h", i);
            assert.deepEqual(await current(page), { index: i, marked: 1 }, `H to ${i}`);
          }
          await move("h", -1);
          assert.equal(
            await page.evaluate("scrollY"),
            0,
            "before the first, the page is at its top",
          );
          assert.deepEqual(await current(page), { index: -1, marked: 0 });
          await move("h", count - 1);
          assert.deepEqual(
            await current(page),
            { index: count - 1, marked: 1 },
            "round to the last",
          );
        });
      }

      test(`L pressed again before a smooth move ends counts from that move's stop, at ${width}px`, async () => {
        await short({ width, reduce: false });
        const want = await rest(3);
        // Four presses, each before the last one's smooth scroll has ended.
        for (let i = 0; i < 4; i++) await press(page, "l");
        await until(page, `Math.abs(scrollY - ${want}) <= 1`);
        await still(page);
        await page.evaluate(SETTLED);
        assert.deepEqual(await current(page), { index: 3, marked: 1 }, "four Ls from the top");
      });

      test(`the mark follows a reader's scroll as it happens, before the scroll ends, at ${width}px`, async () => {
        await short({ width, reduce: true });
        for (let i = 0; i < 3; i++) await move("l", i);
        // Read at the scroll's own event, which reaches the window after the document's listeners
        // and before scrollend or any observer's call.
        const seen: { scrolled: number; line: number } =
          await page.evaluate(`new Promise((resolve) => {
          addEventListener("scroll", () => resolve({
            scrolled: ${LINKS}.findIndex((a) => a.getAttribute("aria-current") === "location"),
            line: ${HEADINGS}.findLastIndex(
              (heading) => heading.getBoundingClientRect().top <= innerHeight * 0.34 + 1),
          }), { once: true });
          scrollBy({ top: 1200, behavior: "instant" });
        })`);
        assert.ok(
          seen.line > 2,
          `the scroll took the line past the move's target, to ${seen.line}`,
        );
        assert.equal(seen.scrolled, seen.line, "the mark is the line's at the scroll's event");
      });

      test(`after a reader's scroll, the next move counts from the section in view, at ${width}px`, async () => {
        await short({ width, reduce: true });
        for (let i = 0; i < 3; i++) await move("l", i);
        // The wheel, over the article.
        await page.cdp("Input.dispatchMouseEvent", {
          type: "mouseWheel",
          x: width / 2,
          y: 400,
          deltaX: 0,
          deltaY: 1200,
        });
        await until(page, `scrollY > ${await rest(2)} + 100`);
        await still(page);
        await page.evaluate(SETTLED);
        const wheeled = await atLine();
        assert.ok(wheeled > 2, `the wheel took the line past the move's target, to ${wheeled}`);
        assert.deepEqual(await current(page), { index: wheeled, marked: 1 }, "the mark follows");
        await move("l", wheeled + 1);
        assert.deepEqual(
          await current(page),
          { index: wheeled + 1, marked: 1 },
          "L counts from it",
        );
        // A scrollbar's drag, as a script's scroll, back up the page into the first section.
        await page.evaluate(`scrollTo({ top: ${await rest(0)} + 10, behavior: "instant" })`);
        await still(page);
        await page.evaluate(SETTLED);
        const dragged = await atLine();
        assert.ok(dragged >= 1 && dragged < wheeled, `the scroll took the line to ${dragged}`);
        assert.deepEqual(await current(page), { index: dragged, marked: 1 }, "the mark follows");
        await move("h", dragged - 1);
        assert.deepEqual(
          await current(page),
          { index: dragged - 1, marked: 1 },
          "H counts from it",
        );
      });

      for (const reduce of [true, false]) {
        const named = `at ${width}px${reduce ? "" : ", scrolling smoothly"}`;

        test(`a fragment changed to a listed section holds it, as a move to it would, ${named}`, async () => {
          await short({ width, reduce });
          const count: number = await page.evaluate(`${LINKS}.length`);
          // A short section, whose next heading is past the line once it is at the top.
          await follow(`location.hash = ${LINKS}[2].hash`, 2);
          assert.ok((await atLine()) > 2, "the reading line marks a later section");
          assert.deepEqual(await current(page), { index: 2, marked: 1 }, "the fragment's section");
          await move("l", 3);
          assert.deepEqual(await current(page), { index: 3, marked: 1 }, "L counts from it");
          // The last section, which the page can't scroll to the line.
          await follow(`location.hash = ${LINKS}[${count - 1}].hash`, count - 1);
          assert.ok((await atLine()) < count - 1, "the reading line marks an earlier section");
          assert.deepEqual(
            await current(page),
            { index: count - 1, marked: 1 },
            "the fragment's section",
          );
          await move("l", -1);
          assert.deepEqual(await current(page), { index: -1, marked: 0 }, "L counts from it");
          // A link elsewhere on the page, as the history's step back would take it.
          await follow(
            `(() => {
              const a = document.createElement("a");
              a.href = ${LINKS}[1].hash;
              document.querySelector("main").append(a);
              a.click();
            })()`,
            1,
          );
          assert.deepEqual(await current(page), { index: 1, marked: 1 }, "the link's section");
          await move("h", 0);
          assert.deepEqual(await current(page), { index: 0, marked: 1 }, "H counts from it");
        });
      }
    }

    for (const reduce of [true, false]) {
      const named = `at 1280px${reduce ? "" : ", scrolling smoothly"}`;

      test(`a tree link clicked or entered holds its section, as a move to it would, ${named}`, async () => {
        await short({ width: 1280, reduce });
        const count: number = await page.evaluate(`${LINKS}.length`);
        // A short section, whose next heading is past the line once it is at the top.
        await follow(click(2), 2);
        assert.ok((await atLine()) > 2, "the reading line marks a later section");
        assert.deepEqual(await current(page), { index: 2, marked: 1 }, "the link's section");
        await move("l", 3);
        assert.deepEqual(await current(page), { index: 3, marked: 1 }, "L counts from it");
        // The last section, which the page can't scroll to the line.
        await follow(click(count - 1), count - 1);
        assert.ok((await atLine()) < count - 1, "the reading line marks an earlier section");
        assert.deepEqual(
          await current(page),
          { index: count - 1, marked: 1 },
          "the link's section",
        );
        await move("h", count - 2);
        assert.deepEqual(await current(page), { index: count - 2, marked: 1 }, "H counts from it");
        // Enter on a focused link.
        await follow(async () => {
          await page.evaluate(`${LINKS}[1].focus()`);
          await press(page, "Enter");
        }, 1);
        assert.deepEqual(await current(page), { index: 1, marked: 1 }, "the entered section");
        await move("l", 2);
        // The link to the fragment the URL already holds, which changes no fragment, after a
        // scroll away from it.
        await page.evaluate(`scrollBy({ top: 300, behavior: "instant" })`);
        await still(page);
        await page.evaluate(SETTLED);
        assert.notEqual((await current(page)).index, 1, "the scroll released the hold");
        await follow(click(1), 1);
        assert.deepEqual(await current(page), { index: 1, marked: 1 }, "the link's section again");
        await move("h", 0);
        assert.deepEqual(await current(page), { index: 0, marked: 1 }, "H counts from it");
      });
    }

    /** A primary click, by the mouse, at the middle of tree link `index`. */
    const click = (index: number) => async () => {
      const { x, y }: { x: number; y: number } = await page.evaluate(`(() => {
        const box = ${LINKS}[${index}].getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      })()`);
      for (const type of ["mousePressed", "mouseReleased"]) {
        await page.cdp("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
      }
    };

    /**
     * Follows a link to stop `index` by `action`, a page expression or a step of the test's own,
     * then waits for the fragment to name its heading and the page to rest where the browser's
     * fragment scroll, to the :target's scroll margin, lands it, and a frame past it.
     */
    async function follow(action: string | (() => Promise<void>), index: number): Promise<void> {
      if (typeof action === "string") await page.evaluate(action);
      else await action();
      await until(page, `location.hash === ${LINKS}[${index}].hash`);
      await until(page, `Math.abs(scrollY - ${await rest(index)}) <= 1`);
      await still(page);
      await page.evaluate(SETTLED);
    }
  });

  describe("the link text", () => {
    test("never breaks inside a word, whatever the page's breaking that it would inherit", async () => {
      for (const width of [1280, 390]) {
        await load({ width });
        await page.evaluate(`(() => {
          const style = document.createElement("style");
          style.textContent = "body, aside { overflow-wrap: anywhere; word-break: break-all; }";
          document.head.append(style);
        })()`);
        const wrapping: string[] = await page.evaluate(
          `[...new Set(${LINKS}.map((a) => {
            const style = getComputedStyle(a);
            return style.overflowWrap + " " + style.wordBreak;
          }))]`,
        );
        assert.deepEqual(wrapping, ["normal normal"], `at ${width}px`);
      }
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

        // The keyboard reaches the help button, then, in the column, the first link and past the
        // links the Previous and Next buttons; as the bar, whose links are hidden, the buttons
        // straight after the help button. Each draws its focus outline.
        const count: number = await page.evaluate(
          `${LINKS}.filter((a) => a.checkVisibility()).length`,
        );
        assert.equal(count === 0, width < DOCK, `${name}: the links show only in the column`);
        const focused: { name: string; visible: boolean; outline: string }[] = [];
        for (let i = 0; i < count + 3; i++) {
          await press(page, "Tab");
          if (count > 0 && i > 1 && i <= count) continue;
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
        assert.deepEqual(
          focused.map(({ name: what }) => what),
          ["Keyboard shortcuts ?", ...(count > 0 ? ["Install"] : []), "Previous [H]", "Next [L]"],
          name,
        );
        for (const { name: what, visible, outline } of focused) {
          assert.ok(visible, `${name}: ${what} matches :focus-visible`);
          assert.match(outline, /^solid [1-9]/, `${name}: ${what}'s outline is drawn`);
        }
      }
    });
  });
});
