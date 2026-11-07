// sl-settings from this repository's dist/, on test/fixtures/settings.html, through its public
// seam alone: the Settings dialog that holds it, the foundation's preferences and keys modules,
// and the page's other components that follow the reader's settings. Each theme row, color,
// scheme, space, and type, lists the registry's names, or SCHEMES, checked at what applies; its
// arrows, spans hidden from assistive technology and taking no focus, as the foundation menu's,
// step it, wrapping, and each step applies to the root and is stored at once. On a row, H and L
// step it and J and K move between the rows, stopping at the ends, and none of them reaches the
// page: the section tree's H and L never move it while the dialog is open. The preview card shows
// its heading, link, code, kbd, buttons, field, and striped table, drawn by the foundation's sheets
// in the shadow root. Another tab's change, at its storage event, updates the root and the rows,
// and the keyboard settings. The switch and the wait are stored at once and drive the keys module:
// with character keys off, P, ?, S, H, and L fire nothing and Control+K still does. Flipping the
// switch in the element updates, in the same tab, the page's aria-keyshortcuts, the section tree's
// in its shadow root, and an open shortcuts list's rows. The foundation's theme-menu.js is never
// requested.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch, SETTLED, until } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { served } from "./support/served.ts";

const FIXTURE = "/test/fixtures/settings.html";

/** The element's shadow root, in a page expression. */
const SHADOW = `document.querySelector("sl-settings").shadowRoot`;

/** The dialogs, in page expressions. */
const SETTINGS = `document.querySelector("#settings")`;
const HELP = `document.querySelector("#help")`;

/** The preferences' and the keys settings' storage keys. */
const PREFERENCES = "spike-html-apps-foundation.preferences";
const KEYS_STORAGE = "spike-html-apps-foundation.keys";

/** The switch's label, the foundation's keys help label word for word. */
const SWITCH_LABEL = "Character-key shortcuts (combinations with Control, Alt, or Meta stay on)";

/** The keys pressed, as the protocol's key events give them. */
const KEYS = {
  h: { key: "h", code: "KeyH", windowsVirtualKeyCode: 72, text: "h" },
  j: { key: "j", code: "KeyJ", windowsVirtualKeyCode: 74, text: "j" },
  k: { key: "k", code: "KeyK", windowsVirtualKeyCode: 75, text: "k" },
  l: { key: "l", code: "KeyL", windowsVirtualKeyCode: 76, text: "l" },
  p: { key: "p", code: "KeyP", windowsVirtualKeyCode: 80, text: "p" },
  s: { key: "s", code: "KeyS", windowsVirtualKeyCode: 83, text: "s" },
  "?": { key: "?", code: "Slash", windowsVirtualKeyCode: 191, modifiers: 8, text: "?" },
  Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
  "Control+k": { key: "k", code: "KeyK", windowsVirtualKeyCode: 75, modifiers: 2 },
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

/** A row as the element shows it. */
interface Row {
  key: string;
  legend: string;
  options: string[];
  checked: string | null;
}

/** The rows: each one's key, legend, radios' values, and checked value. */
const rows = (page: Page): Promise<Row[]> =>
  page.evaluate(`[...${SHADOW}.querySelectorAll(".theme-menu-row")].map((row) => ({
    key: row.dataset.section,
    legend: row.querySelector("legend").textContent.trim(),
    options: [...row.querySelectorAll("input")].map((radio) => radio.value),
    checked: row.querySelector(":checked")?.value ?? null,
  }))`);

/** The rows' checked values, by key. */
const checked = async (page: Page): Promise<Record<string, string | null>> =>
  Object.fromEntries((await rows(page)).map((row) => [row.key, row.checked]));

/** The root's theme attributes, by key, null where absent. */
const root = (page: Page): Promise<Record<string, string | null>> =>
  page.evaluate(`(() => {
    const el = document.documentElement;
    return {
      color: el.getAttribute("data-palette"),
      scheme: el.getAttribute("data-scheme"),
      space: el.getAttribute("data-space"),
      type: el.getAttribute("data-type"),
    };
  })()`);

/** The stored theme choice, or null. */
const stored = (page: Page): Promise<Record<string, string> | null> =>
  page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(PREFERENCES)}) ?? "null")`);

/** The stored keys settings, or null. */
const storedKeys = (page: Page): Promise<Record<string, unknown> | null> =>
  page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEYS_STORAGE)}) ?? "null")`);

/** Waits for the element's render. */
const rendered = (page: Page): Promise<unknown> =>
  page.evaluate(`document.querySelector("sl-settings").updateComplete`);

/** The focused element in the shadow root: its row's key and its value, or null. */
const focusedRow = (page: Page): Promise<{ key: string; value: string } | null> =>
  page.evaluate(`(() => {
    const el = ${SHADOW}.activeElement;
    const row = el?.closest(".theme-menu-row");
    return row ? { key: row.dataset.section, value: el.value } : null;
  })()`);

/** Opens the Settings dialog by its button and resolves once the first row holds focus. */
async function openSettings(page: Page): Promise<void> {
  await page.evaluate(
    `document.querySelector('[commandfor="settings"][command="show-modal"]').click()`,
  );
  await until(page, `${SETTINGS}.open`);
  await until(
    page,
    `${SHADOW}.activeElement?.closest(".theme-menu-row")?.dataset.section === "color"`,
  );
}

/** Clicks the row's arrow, -1 or 1, and waits for the render. */
async function arrow(page: Page, key: string, delta: number): Promise<void> {
  await page.evaluate(
    `${SHADOW}.querySelector('[data-section="${key}"] [data-step="${delta}"]').click()`,
  );
  await rendered(page);
}

describe("sl-settings", { timeout: 60_000 }, () => {
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

  /** Loads the fixture, its storage cleared, rendered. */
  beforeEach(async () => {
    await page.goto(`${server.origin}${FIXTURE}`);
    await page.evaluate(`localStorage.clear()`);
    await page.goto(`${server.origin}${FIXTURE}`);
    await page.evaluate(`window.ready.then(() => ${SETTLED})`);
  });

  test("the rows list the registry's names and SCHEMES, checked at what applies", async () => {
    const profiles: Record<string, string[]> = await page.evaluate(`(async () => {
      const registry = await import("@jaimestill/spike-html-apps-foundation/registry.js");
      return Object.fromEntries(registry.FACETS.map((facet) => [facet, registry.profiles(facet)]));
    })()`);
    assert.deepEqual(await rows(page), [
      { key: "color", legend: "Color", options: profiles.color, checked: "flexoki" },
      { key: "scheme", legend: "Scheme", options: ["system", "light", "dark"], checked: "system" },
      { key: "space", legend: "Space", options: profiles.space, checked: "regular" },
      { key: "type", legend: "Type", options: profiles.type, checked: "mono" },
    ]);
    assert.ok(profiles.color.length > 2, "the full entry registers several palettes");
    assert.deepEqual(await page.evaluate(`window.errors`), []);
  });

  test("each row's arrows step it, wrapping, applied and stored at once", async () => {
    const all = await rows(page);
    const attribute: Record<string, string> = {
      color: "color",
      scheme: "scheme",
      space: "space",
      type: "type",
    };
    for (const row of all) {
      const at = row.options.indexOf(row.checked!);
      await arrow(page, row.key, 1);
      const next = row.options[(at + 1) % row.options.length];
      assert.equal((await checked(page))[row.key], next, `${row.key}: ▶ checks the next`);
      // The scheme's system leaves data-scheme off; every other name is the attribute.
      assert.equal((await root(page))[attribute[row.key]], next, `${row.key}: applied to the root`);
      assert.equal((await stored(page))?.[row.key], next, `${row.key}: stored at once`);
      await arrow(page, row.key, -1);
      await arrow(page, row.key, -1);
      const previous = row.options[(at - 1 + row.options.length) % row.options.length];
      assert.equal((await checked(page))[row.key], previous, `${row.key}: ◀ wraps to the last`);
      assert.equal((await stored(page))?.[row.key], previous, `${row.key}: stored at once`);
      await arrow(page, row.key, 1);
    }
    assert.deepEqual(await stored(page), {
      color: "flexoki",
      scheme: "system",
      space: "regular",
      type: "mono",
    });
    assert.deepEqual(await root(page), {
      color: "flexoki",
      scheme: null,
      space: "regular",
      type: "mono",
    });
  });

  test("the arrows are the foundation's: hidden from assistive technology, taking no focus, no buttons", async () => {
    const arrows: { glyph: string; hidden: string | null; tag: string; tabIndex: number }[] =
      await page.evaluate(`[...${SHADOW}.querySelectorAll("[data-step]")].map((el) => ({
        glyph: el.textContent, hidden: el.getAttribute("aria-hidden"), tag: el.localName,
        tabIndex: el.tabIndex,
      }))`);
    assert.equal(arrows.length, 8, "two arrows a row");
    for (const [i, el] of arrows.entries()) {
      assert.deepEqual(el, { glyph: i % 2 ? "▶" : "◀", hidden: "true", tag: "span", tabIndex: -1 });
    }
    const buttons: number = await page.evaluate(
      `${SHADOW}.querySelectorAll(".glyph-button, .theme-menu-rows button").length`,
    );
    assert.equal(buttons, 0, "no glyph button and no button among the rows");
  });

  test("H and L step a row and J and K move between rows, none reaching the page", async () => {
    await openSettings(page);
    const colors = (await rows(page))[0].options;
    await press(page, "l");
    await rendered(page);
    assert.deepEqual(await focusedRow(page), { key: "color", value: colors[1] });
    assert.equal((await stored(page))?.color, colors[1], "stored at once");
    assert.equal((await root(page)).color, colors[1], "applied at once");
    await press(page, "k");
    assert.equal((await focusedRow(page))?.key, "color", "K stops at the first row");
    await press(page, "j");
    assert.deepEqual(await focusedRow(page), { key: "scheme", value: "system" });
    await press(page, "l");
    await rendered(page);
    assert.deepEqual(await focusedRow(page), { key: "scheme", value: "light" });
    assert.equal((await root(page)).scheme, "light");
    await press(page, "j");
    await press(page, "j");
    await press(page, "j");
    assert.equal((await focusedRow(page))?.key, "type", "J stops at the last row");
    await press(page, "k");
    await press(page, "k");
    await press(page, "k");
    await press(page, "h");
    await rendered(page);
    assert.deepEqual(await focusedRow(page), { key: "color", value: colors[0] });
    assert.equal((await stored(page))?.color, colors[0]);
    // Not one of the presses reached the section tree's H and L.
    const page_: { y: number; marked: number; hash: string } = await page.evaluate(`({
      y: scrollY,
      marked: document.querySelectorAll("sl-section-tree a[aria-current]").length,
      hash: location.hash,
    })`);
    assert.deepEqual(page_, { y: 0, marked: 0, hash: "" }, "the section tree never moved");
    // Off the rows, on the dialog's Close, L is no page binding while the dialog is open.
    await page.evaluate(`document.querySelector("#settings-close").focus()`);
    await press(page, "l");
    await page.evaluate(SETTLED);
    assert.equal(await page.evaluate(`scrollY`), 0, "L on the Close moved nothing");
    assert.equal(await page.evaluate(`${SETTINGS}.open`), true);
    assert.deepEqual(await page.evaluate(`window.errors`), []);
  });

  test("Escape closes the dialog natively and keeps every change: no Cancel, no revert", async () => {
    await openSettings(page);
    const colors = (await rows(page))[0].options;
    await press(page, "l");
    await rendered(page);
    await press(page, "Escape");
    await until(page, `!${SETTINGS}.open`);
    assert.equal((await root(page)).color, colors[1], "the root keeps the change");
    assert.equal((await stored(page))?.color, colors[1], "the store keeps the change");
    const controls: number = await page.evaluate(
      `${SHADOW}.querySelectorAll("button:not(.theme-menu-preview button)").length`,
    );
    assert.equal(controls, 0, "no Save and no Cancel");
  });

  test("the preview card renders, drawn by the foundation's sheets", async () => {
    await openSettings(page);
    const preview: Record<string, unknown> = await page.evaluate(`(() => {
      const card = ${SHADOW}.querySelector(".theme-menu-preview");
      const deploy = card.querySelector("button.button-blue");
      const style = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
      const probe = document.createElement("span");
      probe.style.color = "var(--blue)";
      card.append(probe);
      const blue = getComputedStyle(probe).color;
      probe.remove();
      return {
        inert: card.inert,
        heading: card.querySelector("h3").textContent,
        link: card.querySelector("a").textContent,
        code: card.querySelector("code").textContent,
        kbd: [...card.querySelectorAll("kbd")].map((kbd) => kbd.textContent),
        buttons: [...card.querySelectorAll("button")].map((button) => button.textContent),
        field: card.querySelector(".field input").value,
        label: card.querySelector(".field input").labels[0].textContent,
        rows: card.querySelectorAll("table.table-striped tbody tr").length,
        display: style(card, "display"),
        border: style(card, "border-top-style"),
        rowsDisplay: style(${SHADOW}.querySelector(".theme-menu-row"), "display"),
        fieldDisplay: style(card.querySelector(".field"), "display"),
        deployBlue: style(deploy, "border-top-color") === blue,
        striped: style(card.querySelector("tbody tr:nth-child(2)"), "background-color")
          !== style(card.querySelector("tbody tr:nth-child(1)"), "background-color"),
        valueFont: style(${SHADOW}.querySelector(".theme-menu-row > label:has(:checked)"),
          "font-family") === style(card.querySelector("code"), "font-family"),
      };
    })()`);
    assert.deepEqual(preview, {
      inert: true,
      heading: "Nightly build",
      link: "release notes",
      code: "mise run check",
      kbd: ["Ctrl", "K"],
      buttons: ["Retry", "Deploy"],
      field: "main",
      label: "Branch",
      rows: 3,
      display: "grid",
      border: "solid",
      rowsDisplay: "flex",
      fieldDisplay: "grid",
      deployBlue: true,
      striped: true,
      valueFont: true,
    });
  });

  test("another tab's change updates the root, the rows, and the keyboard settings", async () => {
    const choice = { color: "primer", scheme: "dark", space: "compact", type: "sans" };
    await page.evaluate(`(() => {
      localStorage.setItem(${JSON.stringify(PREFERENCES)}, ${JSON.stringify(JSON.stringify(choice))});
      dispatchEvent(new StorageEvent("storage", { key: ${JSON.stringify(PREFERENCES)} }));
      localStorage.setItem(${JSON.stringify(KEYS_STORAGE)}, JSON.stringify({ enabled: false, wait: 3000 }));
      dispatchEvent(new StorageEvent("storage", { key: ${JSON.stringify(KEYS_STORAGE)} }));
    })()`);
    await rendered(page);
    assert.deepEqual(await root(page), choice, "the root follows");
    assert.deepEqual(await checked(page), choice, "the rows follow");
    const keys: { enabled: boolean; wait: string } = await page.evaluate(`({
      enabled: ${SHADOW}.querySelector("input[type=checkbox]").checked,
      wait: ${SHADOW}.querySelector("select").value,
    })`);
    assert.deepEqual(keys, { enabled: false, wait: "3000" }, "the keyboard settings follow");
  });

  test("the switch and the wait are stored at once and drive the keys module", async () => {
    const labels: { switch: string; wait: string; options: string[] } = await page.evaluate(`({
      switch: ${SHADOW}.querySelector("input[type=checkbox]").labels[0].textContent
        .replace(/\\s+/g, " ").trim(),
      wait: [...${SHADOW}.querySelector("select").labels[0].childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent).join("").trim(),
      options: [...${SHADOW}.querySelectorAll("select option")].map((o) => o.textContent.trim()),
    })`);
    assert.deepEqual(labels, {
      switch: SWITCH_LABEL,
      wait: "Wait between presses",
      options: ["1 s", "1.5 s", "3 s", "5 s"],
    });
    assert.equal(await page.evaluate(`${SHADOW}.querySelector("select").value`), "1500");

    await openSettings(page);
    await page.evaluate(`${SHADOW}.querySelector("input[type=checkbox]").click()`);
    assert.deepEqual(await storedKeys(page), { enabled: false }, "the switch stored at once");
    assert.equal(await page.evaluate(`window.keys.settings().enabled`), false);
    await page.evaluate(`(() => {
      const select = ${SHADOW}.querySelector("select");
      select.value = "3000";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    assert.deepEqual(await storedKeys(page), { enabled: false, wait: 3000 }, "the wait stored");
    assert.equal(await page.evaluate(`window.keys.settings().wait`), 3000);
    await page.evaluate(`${SETTINGS}.close()`);
    await until(page, `!${SETTINGS}.open`);

    // Character keys off: P, ?, S, H, and L fire nothing; Control+K, a combination, stays on.
    await page.evaluate(`document.activeElement?.blur()`);
    await press(page, "p");
    await press(page, "?");
    await press(page, "s");
    await press(page, "l");
    await press(page, "h");
    await page.evaluate(SETTLED);
    const off: Record<string, unknown> = await page.evaluate(`({
      pages: window.pages, help: ${HELP}.open, settings: ${SETTINGS}.open, y: scrollY,
      hash: location.hash,
    })`);
    assert.deepEqual(off, { pages: 0, help: false, settings: false, y: 0, hash: "" });
    await page.evaluate(`document.querySelector("#search").addEventListener("click",
      () => (window.searched = true))`);
    await press(page, "Control+k");
    assert.equal(await page.evaluate(`window.searched`), true, "Control+K still fires");

    // Back on, and the default wait, from the element: the stored settings cleared, S fires.
    await openSettings(page);
    await page.evaluate(`${SHADOW}.querySelector("input[type=checkbox]").click()`);
    await page.evaluate(`(() => {
      const select = ${SHADOW}.querySelector("select");
      select.value = "1500";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    assert.equal(await storedKeys(page), null, "the defaults store nothing");
    await page.evaluate(`${SETTINGS}.close()`);
    await until(page, `!${SETTINGS}.open`);
    await page.evaluate(`document.activeElement?.blur()`);
    await press(page, "s");
    await until(page, `${SETTINGS}.open`);
  });

  test("the switch updates, in the same tab, aria-keyshortcuts and an open shortcuts list", async () => {
    const declared = (): Promise<Record<string, string | null>> =>
      page.evaluate(`(() => {
        const tree = document.querySelector("sl-section-tree").shadowRoot;
        const of = (el) => el.getAttribute("aria-keyshortcuts");
        return {
          pages: of(document.querySelector("#pages")),
          help: of(document.querySelector('[commandfor="help"][command="show-modal"]')),
          settings: of(document.querySelector('[commandfor="settings"][command="show-modal"]')),
          search: of(document.querySelector("#search")),
          previous: of(tree.querySelector(".previous")),
          next: of(tree.querySelector(".next")),
        };
      })()`);
    const listed = (): Promise<{ keys: string; off: boolean }[]> =>
      page.evaluate(`[...document.querySelector("sl-shortcuts").shadowRoot
        .querySelectorAll("tbody tr")].map((tr) => ({
          keys: tr.cells[0].querySelector("kbd").textContent,
          off: tr.classList.contains("off"),
        }))`);
    assert.deepEqual(await declared(), {
      pages: "P",
      help: "Shift+/",
      settings: "S",
      search: "Control+K",
      previous: "H",
      next: "L",
    });

    // The help dialog open and the switch flipped in the element, its own dialog closed: a modal
    // help dialog leaves no key or click to reach the Settings dialog, and a second modal over it
    // would be the topmost, whose bindings the list would read instead.
    await page.evaluate(
      `document.querySelector('[commandfor="help"][command="show-modal"]').click()`,
    );
    await until(page, `${HELP}.open`);
    assert.ok(
      (await listed()).every((row) => !row.off),
      "every row on",
    );
    // The change events the document sees, by their target: a control's own stops at the
    // element's shadow root, so the document sees the host's alone.
    await page.evaluate(`document.addEventListener("change",
      (event) => (window.changes ??= []).push(event.target.localName))`);
    await page.evaluate(`${SHADOW}.querySelector("input[type=checkbox]").click()`);
    await page.evaluate(`Promise.all(["sl-section-tree", "sl-shortcuts"].map((tag) =>
      document.querySelector(tag).updateComplete))`);
    assert.deepEqual(await page.evaluate(`window.changes`), ["sl-settings"]);
    assert.deepEqual(await declared(), {
      pages: null,
      help: null,
      settings: null,
      search: "Control+K",
      previous: null,
      next: null,
    });
    assert.deepEqual(await listed(), [
      { keys: "P", off: true },
      { keys: "?", off: true },
      { keys: "S", off: true },
      { keys: "Control", off: false },
      { keys: "H", off: true },
      { keys: "L", off: true },
    ]);

    // And back on.
    await page.evaluate(`${SHADOW}.querySelector("input[type=checkbox]").click()`);
    await page.evaluate(`Promise.all(["sl-section-tree", "sl-shortcuts"].map((tag) =>
      document.querySelector(tag).updateComplete))`);
    assert.equal((await declared()).previous, "H");
    assert.ok(
      (await listed()).every((row) => !row.off),
      "every row on again",
    );
  });

  test("the foundation's theme-menu module is never requested", async () => {
    await openSettings(page);
    await arrow(page, "color", 1);
    await press(page, "j");
    await press(page, "l");
    await page.evaluate(`${SETTINGS}.close()`);
    await openSettings(page);
    await page.evaluate(`new Promise((resolve) => setTimeout(resolve, 200))`);
    const loaded: { menu: string[]; sheet: string[]; preferences: string[]; elements: number } =
      await page.evaluate(`(() => {
        const names = performance.getEntriesByType("resource").map((entry) => entry.name);
        return {
          menu: names.filter((name) => name.includes("theme-menu.js")),
          sheet: names.filter((name) => name.includes("theme-menu.css")),
          preferences: names.filter((name) => name.includes("/preferences.js")),
          elements: document.querySelectorAll("sl-theme-menu").length,
        };
      })()`);
    assert.deepEqual(loaded.menu, [], "no request for theme-menu.js");
    assert.equal(loaded.elements, 0, "no sl-theme-menu in the page");
    assert.ok(loaded.sheet.length > 0, "the element adopts the foundation's theme-menu.css");
    assert.ok(loaded.preferences.length > 0, "the timeline records the preferences module's load");
  });
});
