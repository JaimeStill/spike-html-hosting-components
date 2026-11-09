// sl-shortcuts from this repository's dist/, on test/fixtures/shortcuts.html, through its public
// seam alone: the help dialog that holds it and the foundation's keys module. Opened, the dialog
// lists exactly the bindings bindings() gives with it closed, in its order: the Help button's ?,
// the Search button's Control+K, the link's G then E, the section tree's J and K, which its
// register() binds, and the page's own Alt+N, each key in a kbd, each action the binding's name as
// plain text, and no Escape row; the dialog's own Close, bound to ? inside it, is left out. Nothing
// in the shadow root takes focus, so the dialog opened puts focus on its Close. With character
// keys off, the rows of character keys alone show "off", shown and in the text read, and the
// combinations don't; the list follows a change of the setting from another tab while open, and
// the page's state at each open. The foundation's screen-reader note follows the table, and the
// element holds no setting. In a container sized to fit, the element is its table's width, or the
// note's minimum under a narrow table, and the note wraps at the element's. No request for the
// foundation's keys-help module is ever made, and no [data-keys-list] is in the page.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch, SETTLED, until } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { noteIn, SHORTCUTS } from "../unit/note.ts";
import { served } from "./support/served.ts";

const FIXTURE = "/test/fixtures/shortcuts.html";

/** The element's shadow root, in a page expression. */
const SHADOW = `document.querySelector("sl-shortcuts").shadowRoot`;

/** The help dialog, in a page expression. */
const HELP = `document.querySelector("#help")`;

/** The element's screen-reader note, read from src/; the unit tier holds it to the foundation's. */
const NOTE = noteIn(SHORTCUTS);

/** The fixture's bindings as the list shows them, in bindings()'s order, character keys on. */
const ROWS = [
  { keys: "?", action: "Help", off: false },
  { keys: "Control+K", action: "Search", off: false },
  { keys: "G then E", action: "End", off: false },
  { keys: "J", action: "Next section", off: false },
  { keys: "K", action: "Previous section", off: false },
  { keys: "Alt+N", action: "New note", off: false },
];

/** The rows with character keys off: those of character keys alone marked. */
const OFF_ROWS = ROWS.map((row) => ({ ...row, off: !/^(Control|Alt)\+/.test(row.keys) }));

/** A row as the list shows it. */
interface Row {
  keys: string;
  action: string;
  off: boolean;
}

/** The "?" key, as the protocol's key events give it. */
const QUESTION = { key: "?", code: "Slash", windowsVirtualKeyCode: 191, modifiers: 8, text: "?" };

/** Presses ? on the focused element. */
async function pressQuestion(page: Page): Promise<void> {
  const { text, ...key } = QUESTION;
  await page.cdp("Input.dispatchKeyEvent", {
    type: "keyDown",
    ...key,
    text,
    unmodifiedText: text,
  });
  await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...key });
}

/**
 * The list's rows: each row's keys, its kbd texts joined as shown and "off" dropped, its action's
 * text, and whether it is marked off, by the word shown and read in its keys cell and its class.
 */
const rows = (page: Page): Promise<Row[]> =>
  page.evaluate(`[...${SHADOW}.querySelectorAll("tbody tr")].map((tr) => {
    const small = tr.cells[0].querySelector("small");
    const marked = small !== null && small.textContent.trim() === "off" && small.checkVisibility();
    return {
      keys: tr.cells[0].textContent.replace(/\\s+/g, " ").trim().replace(/ off$/, ""),
      action: tr.cells[1].textContent.trim(),
      off: marked && tr.cells[0].textContent.trim().endsWith(" off") && tr.classList.contains("off"),
    };
  })`);

/**
 * Opens the help dialog, by ? or, with `byKey` false, by its button, as with character keys off,
 * and resolves once the list has rendered.
 */
async function open(page: Page, byKey = true): Promise<void> {
  if (byKey) await pressQuestion(page);
  else
    await page.evaluate(
      `document.querySelector('[commandfor="help"][command="show-modal"]').click()`,
    );
  await until(page, `${HELP}.open`);
  await page.evaluate(`document.querySelector("sl-shortcuts").updateComplete`);
}

/** Closes the help dialog. */
async function close(page: Page): Promise<void> {
  await page.evaluate(`${HELP}.close()`);
  await until(page, `!${HELP}.open`);
}

describe("sl-shortcuts", { timeout: 60_000 }, () => {
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

  /** Loads the fixture, its keys settings cleared, rendered. */
  beforeEach(async () => {
    await page.goto(`${server.origin}${FIXTURE}`);
    await page.evaluate(`localStorage.clear()`);
    await page.goto(`${server.origin}${FIXTURE}`);
    await page.evaluate(`window.ready.then(() => ${SETTLED})`);
  });

  test("the rows are exactly bindings() with the dialog closed, each key in a kbd", async () => {
    await open(page);
    assert.deepEqual(await rows(page), ROWS);
    const listed: { keys: string; count: number; kbds: number[] } = await page.evaluate(`({
      count: window.keys.bindings(${HELP}).length,
      kbds: [...${SHADOW}.querySelectorAll("tbody tr")].map((tr) =>
        tr.cells[0].querySelectorAll("kbd").length),
    })`);
    assert.equal(listed.count, ROWS.length, "as many rows as bindings() gives");
    assert.deepEqual(listed.kbds, [1, 2, 2, 1, 1, 2], "each key in its own kbd");
    const header: string[] = await page.evaluate(
      `[...${SHADOW}.querySelectorAll("thead th")].map((th) => th.textContent.trim())`,
    );
    assert.deepEqual(header, ["Keys", "Action"]);
    assert.deepEqual(await page.evaluate(`window.errors`), []);
  });

  test("the rows are plain text, and the dialog opened puts focus on its Close", async () => {
    await page.evaluate(`${HELP}.showModal()`);
    await page.evaluate(`document.querySelector("sl-shortcuts").updateComplete`);
    const shown: { focusable: number; tabbable: number; focused: string | null } =
      await page.evaluate(`({
        focusable: ${SHADOW}.querySelectorAll(
          "button, a[href], input, select, textarea, summary, [tabindex], [contenteditable]",
        ).length,
        tabbable: [...${SHADOW}.querySelectorAll("*")].filter((el) => el.tabIndex >= 0).length,
        focused: document.activeElement === ${HELP}.querySelector('[command="close"]')
          ? "close"
          : document.activeElement?.localName ?? null,
      })`);
    assert.deepEqual(shown, { focusable: 0, tabbable: 0, focused: "close" });
    assert.equal(await page.evaluate(`window.ran`), 0, "no binding ran");
    await close(page);
  });

  test("with character keys off, their rows are marked off and the combinations' aren't", async () => {
    await page.evaluate(`window.keys.changeSettings({ enabled: false })`);
    await open(page, false);
    assert.deepEqual(await rows(page), OFF_ROWS);
    await close(page);
  });

  test("an open list follows a change of the setting in another tab", async () => {
    await open(page);
    assert.deepEqual(await rows(page), ROWS);
    // Another tab's change: the stored setting, and the storage event the browser sends this tab.
    await page.evaluate(`(() => {
      const key = "spike-html-apps-foundation.keys";
      localStorage.setItem(key, JSON.stringify({ enabled: false }));
      dispatchEvent(new StorageEvent("storage", { key }));
      return document.querySelector("sl-shortcuts").updateComplete;
    })()`);
    assert.deepEqual(await rows(page), OFF_ROWS);
    await close(page);
  });

  test("the list follows the page's state at each open", async () => {
    await page.evaluate(`document.querySelector("#search").hidden = true`);
    await open(page);
    assert.deepEqual(
      await rows(page),
      ROWS.filter((row) => row.action !== "Search"),
    );
    await close(page);
    await page.evaluate(`document.querySelector("#search").hidden = false`);
    await open(page);
    assert.deepEqual(await rows(page), ROWS);
    await close(page);
  });

  test("the screen-reader note follows the table, and the element holds no setting", async () => {
    await open(page);
    const shown: { last: string; note: string; after: boolean; fields: number } =
      await page.evaluate(`(() => {
        const note = ${SHADOW}.querySelector("p");
        const table = ${SHADOW}.querySelector("table");
        return {
          last: ${SHADOW}.lastElementChild.localName,
          note: note.textContent.trim(),
          after: Boolean(table.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING),
          fields: ${SHADOW}.querySelectorAll("input, select, textarea, fieldset").length,
        };
      })()`);
    assert.deepEqual(shown, { last: "p", note: NOTE, after: true, fields: 0 });
    await close(page);
  });

  test("in a container sized to fit, the element is its table's width, the note wrapped in it", async () => {
    // The SDK's Help: as wide as its content, here the element alone, its heading and Close out of
    // the flow. Each case reads the element's, its table's, and its note's widths, and the note's
    // intrinsic minimum resolved to pixels.
    await page.evaluate(`(() => {
      Object.assign(${HELP}.style, { inlineSize: "fit-content", maxInlineSize: "none" });
      for (const el of ${HELP}.querySelectorAll("h2, button")) el.style.display = "none";
    })()`);
    const measure = async (): Promise<{
      host: number;
      table: number;
      note: number;
      minimum: number;
      rows: number;
      lines: number;
    }> => {
      await open(page, false);
      const sizes = await page.evaluate(`(() => {
        const note = ${SHADOW}.querySelector(".note");
        const style = getComputedStyle(note);
        return {
          host: document.querySelector("sl-shortcuts").getBoundingClientRect().width,
          table: ${SHADOW}.querySelector("table").getBoundingClientRect().width,
          note: note.getBoundingClientRect().width,
          minimum: parseFloat(style.containIntrinsicInlineSize),
          rows: ${SHADOW}.querySelectorAll("tbody tr").length,
          lines: Math.round(note.getBoundingClientRect().height / parseFloat(style.lineHeight)),
        };
      })()`);
      await close(page);
      return sizes;
    };

    // Two short rows, the Help button's ? and the page's Alt+N: the Search button and the link
    // hidden and the section tree removed, which unregisters its J and K. A table this short is
    // under the note's minimum whatever the fonts, where the fixture's six rows come near it.
    await page.evaluate(`(() => {
      for (const el of document.querySelectorAll('#search, a[data-keys]')) el.hidden = true;
      document.querySelector("sl-section-tree").remove();
    })()`);
    const short = await measure();
    assert.equal(short.rows, 2, "the short table's two rows");
    assert.ok(short.table < short.minimum, `table ${short.table} under ${short.minimum}`);
    assert.ok(Math.abs(short.host - short.minimum) <= 1, `element ${short.host}, ${short.minimum}`);
    assert.equal(short.note, short.host, "the note is the element's width");
    assert.ok(short.lines > 1, "the note wraps");

    // A row of a long action: the element is the table's width, the note wrapped within it. The
    // action is the note's first sentence, in the same glyphs as the note at a size a ninth
    // larger: some two and a half times the minimum's sixteen spacing steps, and under half the
    // note's own line, so the table falls between the two in any font's metrics.
    const action = NOTE.slice(0, NOTE.indexOf(".") + 1);
    await page.evaluate(`window.keys.register("Alt+l", ${JSON.stringify(action)}, () => {})`);
    const long = await measure();
    assert.equal(long.rows, 3, "the long action's row added to the short table's");
    assert.ok(long.table > long.minimum * 1.5, `table ${long.table} well over ${long.minimum}`);
    assert.ok(Math.abs(long.host - long.table) <= 1, `element ${long.host}, table ${long.table}`);
    assert.equal(long.note, long.host, "the note is the element's width");
    assert.ok(long.lines > 1, "the note wraps");
  });

  test("the foundation's keys-help module is never requested", async () => {
    await open(page);
    await close(page);
    await open(page);
    // The keys module loads keys-help.js as a dialog holding [data-keys-list] opens; give a load
    // started by the opens time to show among the page's resources.
    await page.evaluate(`new Promise((resolve) => setTimeout(resolve, 200))`);
    const loaded: { requested: string[]; lists: number; modules: string[] } =
      await page.evaluate(`({
      requested: performance.getEntriesByType("resource")
        .map((entry) => entry.name).filter((name) => name.includes("keys-help")),
      lists: document.querySelectorAll("[data-keys-list]").length
        + ${SHADOW}.querySelectorAll("[data-keys-list]").length,
      modules: performance.getEntriesByType("resource")
        .map((entry) => entry.name).filter((name) => name.includes("/keys.js")),
    })`);
    assert.deepEqual(loaded.requested, [], "no request for keys-help");
    assert.equal(loaded.lists, 0, "no [data-keys-list] in the page");
    assert.ok(loaded.modules.length > 0, "the resource timeline records the keys module's load");
    await close(page);
  });
});
