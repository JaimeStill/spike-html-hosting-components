// sl-shortcuts from this repository's dist/, on test/fixtures/shortcuts.html, through its public
// seam alone: the help dialog that holds it and the foundation's keys module. Opened, the dialog
// lists exactly the bindings bindings() gives with it closed, in its order: the Help button's ?,
// the Search button's Control+K, the link's G then E, the section tree's H and L, which its
// register() binds, and the page's own Alt+N, each key in a kbd, each action a button named by the
// binding, and no Escape row; the dialog's own Close, bound to ? inside it, is left out. A row's
// button closes the dialog and runs its binding, a registered one's handler and an element's
// click. With character keys off, the rows of character keys alone show "off", shown and in the
// text read, and the combinations don't; the list follows a change of the setting from another
// tab while open, and the page's state at each open. The foundation's screen-reader note follows
// the table, and the element holds no setting. No request for the foundation's keys-help module
// is ever made, and no [data-keys-list] is in the page.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch, SETTLED, until } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { served } from "./support/served.ts";

const FIXTURE = "/test/fixtures/shortcuts.html";

/** The element's shadow root, in a page expression. */
const SHADOW = `document.querySelector("sl-shortcuts").shadowRoot`;

/** The help dialog, in a page expression. */
const HELP = `document.querySelector("#help")`;

/** The foundation's screen-reader note, word for word. */
const NOTE =
  "Screen readers: a screen reader may take a key before the page does. To pass the next key " +
  "through, press NVDA+F2 in NVDA, JAWS+3 in JAWS, Narrator+3 in Narrator, or VO+Tab in VoiceOver.";

/** The fixture's bindings as the list shows them, in bindings()'s order, character keys on. */
const ROWS = [
  { keys: "?", action: "Help", off: false },
  { keys: "Control+K", action: "Search", off: false },
  { keys: "G then E", action: "End", off: false },
  { keys: "H", action: "Previous section", off: false },
  { keys: "L", action: "Next section", off: false },
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
 * The list's rows: each row's keys, its kbd texts joined as shown and "off" dropped, its button's
 * name, and whether it is marked off, by the word shown and read in its keys cell and its class.
 */
const rows = (page: Page): Promise<Row[]> =>
  page.evaluate(`[...${SHADOW}.querySelectorAll("tbody tr")].map((tr) => {
    const small = tr.cells[0].querySelector("small");
    const marked = small !== null && small.textContent.trim() === "off" && small.checkVisibility();
    return {
      keys: tr.cells[0].textContent.replace(/\\s+/g, " ").trim().replace(/ off$/, ""),
      action: tr.cells[1].querySelector("button").textContent.trim(),
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

  test("a row's button closes the dialog and runs its binding", async () => {
    await open(page);
    await page.evaluate(`[...${SHADOW}.querySelectorAll("button")]
      .find((button) => button.textContent.trim() === "New note").click()`);
    assert.equal(await page.evaluate(`${HELP}.open`), false, "the dialog closed");
    assert.equal(await page.evaluate(`window.ran`), 1, "the registered handler ran once");
    await open(page);
    await page.evaluate(`[...${SHADOW}.querySelectorAll("button")]
      .find((button) => button.textContent.trim() === "End").click()`);
    assert.equal(await page.evaluate(`${HELP}.open`), false, "the dialog closed");
    await until(page, `location.hash === "#end"`);
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
