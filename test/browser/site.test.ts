// sl-page-header, sl-site-index, sl-site-nav, and sl-drawer from this repository's dist/, on the
// fixture sites under test/fixtures/sites/, each served at its own base on one origin, through
// their public seams alone. With no script the front matter and the site index render, wide and
// narrow, the Pages button hidden, and the page reads without the site nav; the site index sits in
// the Pages drawer, docked beside the article wide, and narrow a modal dialog the Pages button or
// P opens, which Escape or its Close button closes, focus back on the button; no navigation text
// breaks inside a word, whatever the page inherits; the header slots the front matter as a grid
// of terms beside their values, in source order and as text, and an empty or absent dl renders
// nothing; the index marks the page on screen, a directory labeled by its index page or its name;
// the nav lists the components' sites and marks the current one by the path's first segment;
// with one site deployed ahead, on a release that lists a fourth site, the ahead site's nav lists
// four and the one behind three, neither requesting a list, until each nav's src names the org's
// list and both list its four: the built list painted first, the fetched one replacing it, a
// failed or malformed list leaving the built one, and a response for an older src dropped;
// every component renders in every profile the foundation's full entry registers, light and dark,
// at 1280 and 390 px, with no sideways scroll and its focus drawn, and at 390 px the drawer open
// as a modal dialog the same; and the theme saved through the
// menu on one site applies before first paint on the other, a palette the other doesn't register
// falling back to its default and staying stored.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch, SETTLED, until } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { registry as read, resize, runs, type Registry } from "./support/profiles.ts";
import { FOURTH, hold, requested, served } from "./support/served.ts";

/** The fixture sites' bases, as GitHub Pages serves each project site. */
const ARCHITECTURE = "/spike-html-hosting-architecture/";
const SQLATE = "/spike-html-hosting-sqlate/";
const AHEAD = `/${FOURTH.repository}/`;

/** The architecture site's pages the cases load. */
const PAGES = {
  index: ARCHITECTURE,
  plain: `${ARCHITECTURE}principles/plain-web.html`,
  empty: `${ARCHITECTURE}notes/empty.html`,
};

/** The front matter the index page's header holds, in source order, as its text reads. */
const FRONT_MATTER = [
  ["title", "The architecture stand-in"],
  ["status", "draft"],
  ["summary", `<script>alert("front matter")</script> is text, never markup`],
  ["owner", "Research & Standards"],
  [
    "a-front-matter-key-long-enough-to-wrap",
    "https://jaimestill.github.io/spike-html-hosting-architecture/a/path/long/enough/that/it/must/wrap/at/narrow/widths.html",
  ],
];

/** The sites the nav lists, in order: the link's text and its href as written. */
const SITES = [
  ["Org", "/spike-html-hosting/"],
  ["Architecture", "/spike-html-hosting-architecture/"],
  ["sqlate", "/spike-html-hosting-sqlate/"],
];

/** The sites the org's list names, the release ahead's too: the built sites and the fourth. */
const FOUR = [...SITES, [FOURTH.label, AHEAD]];

/** The org fixture site's lists of sites. */
const LISTS = {
  org: "/spike-html-hosting/sites.json",
  older: "/spike-html-hosting/older.json",
  malformed: "/spike-html-hosting/malformed.json",
  empty: "/spike-html-hosting/empty.json",
  invalid: "/spike-html-hosting/invalid.json",
};

/** A fixture site page's query that sets its site nav's src. */
const src = (list: string) => `?src=${encodeURIComponent(list)}`;

/** The drawer's default dock, 48rem, at the initial font size, in px: the fixture sites' too. */
const DOCK = 768;

/** The localStorage key the foundation's preferences keep the theme under. */
const KEY = "spike-html-apps-foundation.preferences";

/** A component's shadow root, in a page expression. */
const shadow = (tag: string) => `document.querySelector("${tag}").shadowRoot`;

/** The header's terms and values, in source order, in a page expression. */
const PAIRS = `[...document.querySelectorAll("sl-page-header dl > :is(dt, dd)")]`;

/** The site index's links, in a page expression. */
const INDEX_LINKS = `[...document.querySelectorAll("sl-site-index a")]`;

/** The site nav's links, in a page expression. */
const NAV_LINKS = `[...${shadow("sl-site-nav")}.querySelectorAll("a")]`;

/** The Tab key, as the protocol's key events give it. */
const TAB = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };

/** Tab pressed and released on the focused element. */
async function tab(page: Page): Promise<void> {
  await page.cdp("Input.dispatchKeyEvent", { type: "rawKeyDown", ...TAB });
  await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...TAB });
}

/**
 * The first frame's record, which a script ahead of every document takes in its first
 * requestAnimationFrame callback, run in the rendering update that paints the first frame, after
 * the render-blocking modules: the root's data attributes, the body's computed background,
 * whether any paint has come before it, and its time since the navigation began.
 */
const RECORDER = `window.frame = null;
  requestAnimationFrame(() => {
    window.frame = {
      dataset: { ...document.documentElement.dataset },
      background: document.body ? getComputedStyle(document.body).backgroundColor : null,
      painted: performance.getEntriesByType("paint").length > 0,
      time: performance.now(),
    };
  });`;

/** The background a palette and scheme give a probe on the loaded page, its --bg resolved. */
const background = (page: Page, palette: string, scheme: string): Promise<string> =>
  page.evaluate(`(() => {
    const probe = document.createElement("div");
    probe.dataset.palette = ${JSON.stringify(palette)};
    probe.dataset.scheme = ${JSON.stringify(scheme)};
    probe.style.backgroundColor = "var(--bg)";
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  })()`);

describe("the site components", { timeout: 180_000 }, () => {
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

  /** Loads the page at the viewport's width, its storage cleared, rendered. */
  async function load(path: string, { width = 1280 }: { width?: number } = {}, query = "") {
    await resize(page, width);
    await page.goto(`${server.origin}${path}${query}`);
    await page.evaluate(`localStorage.clear()`);
    await page.goto(`${server.origin}${path}${query}`);
    await page.evaluate(`window.ready.then(() => ${SETTLED})`);
  }

  /** Clicks the element the expression names and resolves once the page it opens has loaded and
   * rendered. */
  async function follow(expression: string): Promise<void> {
    const loaded = new Promise((resolve) => page.on("Page.loadEventFired", resolve));
    await page.evaluate(`${expression}.click()`);
    await loaded;
    await page.evaluate(`window.ready.then(() => ${SETTLED})`);
  }

  describe("with no script", () => {
    before(async () => {
      await page.cdp("Emulation.setScriptExecutionDisabled", { value: true });
      await resize(page, 1280);
      await page.goto(`${server.origin}${PAGES.index}`);
    });
    after(() => page.cdp("Emulation.setScriptExecutionDisabled", { value: false }));

    test("the front matter renders as the page's dl, in source order and as text", async () => {
      const shown: { defined: boolean; pairs: string[][]; seen: boolean[]; markup: number } =
        await page.evaluate(`(() => {
          const items = ${PAIRS};
          const pairs = [];
          for (let i = 0; i < items.length; i += 2) {
            pairs.push([items[i].textContent, items[i + 1].textContent]);
          }
          return {
            defined: customElements.get("sl-page-header") !== undefined,
            pairs,
            seen: items.map((el) => el.getBoundingClientRect().height > 0),
            markup: document.querySelectorAll("sl-page-header dl *:not(dt, dd)").length,
          };
        })()`);
      assert.equal(shown.defined, false, "no script defined the element");
      assert.deepEqual(shown.pairs, FRONT_MATTER);
      assert.ok(shown.seen.every(Boolean), "every term and value is shown");
      assert.equal(shown.markup, 0, "no value parsed as markup");
    });

    test("the site index renders, every link and directory label shown, and no Pages button, wide and narrow", async () => {
      for (const width of [1280, 390]) {
        await resize(page, width);
        await page.goto(`${server.origin}${PAGES.index}`);
        const shown: { text: string; seen: boolean }[] = await page.evaluate(
          `[...document.querySelectorAll("sl-site-index li > :is(a, span)")].map((el) => {
            const box = el.getBoundingClientRect();
            return { text: el.textContent.trim(), seen: box.width > 0 && box.height > 0 };
          })`,
        );
        assert.ok(shown.length >= 10, `the index holds ${shown.length} entries`);
        for (const { text, seen } of shown) assert.ok(seen, `${text} is shown at ${width}px`);
        assert.equal(
          await page.evaluate(`document.querySelector(".pages-opener").checkVisibility()`),
          false,
          `no Pages button at ${width}px, with no drawer to open`,
        );
      }
      await resize(page, 1280);
      await page.goto(`${server.origin}${PAGES.index}`);
    });

    test("the site nav renders nothing, and the page reads without it", async () => {
      const shown: { nav: number; main: boolean } = await page.evaluate(`({
        nav: document.querySelector("sl-site-nav").getBoundingClientRect().height,
        main: document.querySelector("main p").getBoundingClientRect().height > 0,
      })`);
      assert.deepEqual(shown, { nav: 0, main: true });
    });
  });

  describe("sl-page-header", () => {
    test("slots the dl as a grid, each term beside its value, in source order and as text", async () => {
      await load(PAGES.index);
      const shown: {
        errors: string[];
        slotted: string[];
        display: string;
        pairs: string[][];
        rows: { level: boolean; beside: boolean }[];
      } = await page.evaluate(`(() => {
        const items = ${PAIRS};
        const pairs = [];
        const rows = [];
        for (let i = 0; i < items.length; i += 2) {
          pairs.push([items[i].textContent, items[i + 1].textContent]);
          const term = items[i].getBoundingClientRect();
          const value = items[i + 1].getBoundingClientRect();
          // The items align on their baselines, so a term's box, its margin aside, is level with
          // its value's.
          rows.push({
            level: Math.abs(term.top - value.top) <= 1,
            beside: value.left >= term.right,
          });
        }
        return {
          errors: window.errors,
          slotted: ${shadow("sl-page-header")}.querySelector("slot").assignedElements().map((el) => el.localName),
          display: getComputedStyle(document.querySelector("sl-page-header dl")).display,
          pairs,
          rows,
        };
      })()`);
      assert.deepEqual(shown.errors, []);
      assert.deepEqual(shown.slotted, ["dl"]);
      assert.equal(shown.display, "grid");
      assert.deepEqual(shown.pairs, FRONT_MATTER);
      for (const [i, row] of shown.rows.entries()) {
        assert.deepEqual(row, { level: true, beside: true }, FRONT_MATTER[i][0]);
      }
    });

    test("an empty dl and an absent one render nothing", async () => {
      for (const path of [PAGES.empty, PAGES.plain]) {
        await load(path);
        const shown: { errors: string[]; height: number; terms: number } = await page.evaluate(`({
          errors: window.errors,
          height: document.querySelector("sl-page-header").getBoundingClientRect().height,
          terms: document.querySelectorAll("sl-page-header dt").length,
        })`);
        assert.deepEqual(shown, { errors: [], height: 0, terms: 0 }, path);
      }
    });
  });

  describe("sl-site-index", () => {
    /** The index's nav label and slotted elements, and its marked links' hrefs and texts. */
    const marked = (): Promise<{ label: string; slotted: string[]; current: string[][] }> =>
      page.evaluate(`({
        label: ${shadow("sl-site-index")}.querySelector("nav").getAttribute("aria-label"),
        slotted: ${shadow("sl-site-index")}.querySelector("nav slot").assignedElements().map((el) => el.localName),
        current: ${INDEX_LINKS}.filter((a) => a.hasAttribute("aria-current"))
          .map((a) => [a.getAttribute("aria-current"), a.getAttribute("href"), a.textContent]),
      })`);

    test("the shadow root holds the nav landmark around the slot, and marks the page on screen", async () => {
      await load(PAGES.index);
      assert.deepEqual(await marked(), {
        label: "Site",
        slotted: ["ul"],
        current: [["page", ARCHITECTURE, "The architecture stand-in"]],
      });
      await load(`${ARCHITECTURE}index.html`);
      assert.deepEqual(
        (await marked()).current,
        [["page", ARCHITECTURE, "The architecture stand-in"]],
        "index.html is the directory's page",
      );
      await load(PAGES.plain);
      assert.deepEqual((await marked()).current, [["page", PAGES.plain, "Plain web"]]);
      await load(PAGES.empty);
      assert.deepEqual((await marked()).current, [["page", PAGES.empty, "Empty front matter"]]);
    });

    test("a directory is labeled by its index page's link, or by its name", async () => {
      await load(PAGES.index);
      const directories: { label: string; tag: string; href: string | null }[] =
        await page.evaluate(`[...document.querySelectorAll("sl-site-index li:has(> ul)")].map((li) => {
          const label = li.firstElementChild;
          return { label: label.textContent, tag: label.localName, href: label.getAttribute("href") };
        })`);
      assert.deepEqual(directories, [
        { label: "Principles", tag: "a", href: `${ARCHITECTURE}principles/` },
        { label: "Conventions", tag: "span", href: null },
        { label: "Repositories", tag: "span", href: null },
        { label: "Notes", tag: "span", href: null },
      ]);
    });

    test("a renderer's mark on another link is removed, and a changed list is marked again", async () => {
      await load(PAGES.index);
      await page.evaluate(`(() => {
        const list = document.querySelector("sl-site-index ul").cloneNode(true);
        list.querySelector('a[href$="naming.html"]').setAttribute("aria-current", "page");
        document.querySelector("sl-site-index ul").replaceWith(list);
      })()`);
      await page.evaluate(SETTLED);
      assert.deepEqual((await marked()).current, [
        ["page", ARCHITECTURE, "The architecture stand-in"],
      ]);
    });
  });

  describe("sl-site-nav", () => {
    /** The nav's label, its links as text and href, and the current one's text. */
    const listed = (): Promise<{ label: string; links: string[][]; current: string[] }> =>
      page.evaluate(`({
        label: ${shadow("sl-site-nav")}.querySelector("nav").getAttribute("aria-label"),
        links: ${NAV_LINKS}.map((a) => [a.textContent, a.getAttribute("href")]),
        current: ${NAV_LINKS}.filter((a) => a.getAttribute("aria-current") === "page").map((a) => a.textContent),
      })`);

    test("lists the components' sites, root-relative, in its shadow nav, the current one marked", async () => {
      await load(PAGES.index);
      assert.deepEqual(await listed(), { label: "Sites", links: SITES, current: ["Architecture"] });
      await load(PAGES.plain);
      assert.deepEqual((await listed()).current, ["Architecture"], "a nested page's site");
      await load(SQLATE);
      assert.deepEqual(await listed(), { label: "Sites", links: SITES, current: ["sqlate"] });
      assert.deepEqual(await page.evaluate("window.errors"), []);
    });

    test("a path on no listed site marks none", async () => {
      await load("/test/fixtures/section-tree.html");
      await page.evaluate(`(async () => {
        await import("/dist/site-nav.js");
        document.body.append(document.createElement("sl-site-nav"));
        await document.querySelector("sl-site-nav").updateComplete;
      })()`);
      const { links, current } = await listed();
      assert.deepEqual({ links, current }, { links: SITES, current: [] });
    });
  });

  describe("sl-site-nav, one site deployed ahead", () => {
    /** The nav's links as text and href, and the current one's text. */
    const listed = (): Promise<{ links: string[][]; current: string[] }> =>
      page.evaluate(`({
        links: ${NAV_LINKS}.map((a) => [a.textContent, a.getAttribute("href")]),
        current: ${NAV_LINKS}.filter((a) => a.getAttribute("aria-current") === "page").map((a) => a.textContent),
      })`);

    /** The URL of every response the page has had headers for since its last visit(). */
    const responded = new Set<string>();
    before(async () => {
      page.on("Network.responseReceived", ({ response }: { response: { url: string } }) =>
        responded.add(response.url),
      );
      await page.cdp("Network.enable");
    });
    after(() => page.cdp("Network.disable"));

    /** Resolves once the condition holds, polled from the test every 10 ms, for at most 5 s. */
    async function whilst(condition: () => boolean, what: string): Promise<void> {
      for (const started = Date.now(); !condition();) {
        if (Date.now() - started > 5000) throw new Error(`not within 5000 ms: ${what}`);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    /** Resolves once the server has had a request for the list. */
    const received = (list: string) =>
      whilst(() => requested.includes(list), `a request for ${list}`);

    /** Loads the page once, its storage as it is, and resolves once it has rendered. */
    async function visit(path: string): Promise<void> {
      await resize(page, 1280);
      responded.clear();
      await page.goto(`${server.origin}${path}`);
      await page.evaluate(`window.ready.then(() => ${SETTLED})`);
    }

    /**
     * Resolves once the page has had the response for the list, which the nav's fetch() resolves
     * to, and the nav has had a task and two frames since to render what it made of it.
     */
    async function answered(list: string): Promise<void> {
      const url = `${server.origin}${list}`;
      await whilst(() => responded.has(url), `a response for ${list}`);
      await page.evaluate(`new Promise((resolve) => setTimeout(resolve))
        .then(() => document.querySelector("sl-site-nav").updateComplete)
        .then(() => ${SETTLED})`);
    }

    /** Resolves once the nav lists the number of sites. */
    const lists = (count: number) => until(page, `${NAV_LINKS}.length === ${count}`);

    test("with no src, the site ahead lists four sites and the sites behind three, and no list is requested", async () => {
      requested.length = 0;
      await load(AHEAD);
      assert.deepEqual(await listed(), { links: FOUR, current: [FOURTH.label] });
      await load(SQLATE);
      assert.deepEqual(await listed(), { links: SITES, current: ["sqlate"] });
      await load(ARCHITECTURE);
      assert.deepEqual(await listed(), { links: SITES, current: ["Architecture"] });
      assert.deepEqual(requested, [], "no request for any list");
      assert.deepEqual(await page.evaluate("window.errors"), []);
    });

    test("with src naming the org's list, the site ahead and the site behind both list its four", async () => {
      requested.length = 0;
      await visit(`${AHEAD}${src(LISTS.org)}`);
      await answered(LISTS.org);
      assert.deepEqual(await listed(), { links: FOUR, current: [FOURTH.label] });
      await load(SQLATE, {}, src(LISTS.org));
      await lists(FOUR.length);
      assert.deepEqual(await listed(), { links: FOUR, current: ["sqlate"] });
      assert.ok(requested.length > 0, "the lists were requested");
      assert.ok(
        requested.every((path) => path === LISTS.org),
        `only the org's list: ${requested}`,
      );
      assert.deepEqual(await page.evaluate("window.errors"), []);
    });

    test("the built list is painted while the list is held, and the list replaces it once it comes", async () => {
      requested.length = 0;
      const release = hold(LISTS.org);
      try {
        await load(SQLATE, {}, src(LISTS.org));
        await received(LISTS.org);
        assert.ok(await page.evaluate(`performance.getEntriesByType("paint").length > 0`));
        assert.deepEqual(await listed(), { links: SITES, current: ["sqlate"] }, "the built list");
        release();
        await lists(FOUR.length);
        assert.deepEqual(await listed(), { links: FOUR, current: ["sqlate"] }, "the org's list");
      } finally {
        release();
      }
      assert.deepEqual(await page.evaluate("window.errors"), []);
    });

    test("an error status, even with a list, a body that isn't JSON, an empty list, or a list with an empty label leaves the built list", async () => {
      for (const list of [`${LISTS.org}?status=500`, LISTS.malformed, LISTS.empty, LISTS.invalid]) {
        await visit(`${SQLATE}${src(list)}`);
        await answered(list);
        assert.deepEqual(await listed(), { links: SITES, current: ["sqlate"] }, list);
        await visit(`${AHEAD}${src(list)}`);
        await answered(list);
        assert.deepEqual(await listed(), { links: FOUR, current: [FOURTH.label] }, list);
      }
      assert.deepEqual(await page.evaluate("window.errors"), []);
    });

    test("a changed src fetches its list, the older src's response dropped, and a removed src lists the built sites", async () => {
      await load(SQLATE);
      const nav = `document.querySelector("sl-site-nav")`;
      requested.length = 0;
      const release = hold(LISTS.older);
      try {
        await page.evaluate(`${nav}.setAttribute("src", ${JSON.stringify(LISTS.older)})`);
        await received(LISTS.older);
        await page.evaluate(`${nav}.setAttribute("src", ${JSON.stringify(LISTS.org)})`);
        await lists(FOUR.length);
      } finally {
        release();
      }
      await page.evaluate(
        `new Promise((resolve) => setTimeout(resolve, 100)).then(() => ${SETTLED})`,
      );
      assert.deepEqual(
        await listed(),
        { links: FOUR, current: ["sqlate"] },
        "the older list dropped",
      );
      const fetches = `performance.getEntriesByType("resource").filter((e) => e.initiatorType === "fetch").length`;
      const before = await page.evaluate(fetches);
      await page.evaluate(
        `${nav}.removeAttribute("src"); ${nav}.updateComplete.then(() => ${SETTLED})`,
      );
      assert.deepEqual(await listed(), { links: SITES, current: ["sqlate"] });
      assert.equal(await page.evaluate(fetches), before, "a removed src fetches nothing");
      assert.deepEqual(await page.evaluate("window.errors"), []);
    });
  });

  describe("the navigation text", () => {
    test("never breaks inside a word in the site index or the site nav, whatever the page's breaking that they would inherit", async () => {
      for (const width of [1280, 390]) {
        await load(PAGES.index, { width });
        await page.evaluate(`(() => {
          const style = document.createElement("style");
          style.textContent = "body, body > * { overflow-wrap: anywhere; word-break: break-all; }";
          document.head.append(style);
        })()`);
        const wrapping: Record<string, string[]> = await page.evaluate(`(() => {
          const of = (links) => [...new Set(links.map((a) => {
            const style = getComputedStyle(a);
            return style.overflowWrap + " " + style.wordBreak;
          }))];
          return { index: of(${INDEX_LINKS}), nav: of(${NAV_LINKS}) };
        })()`);
        assert.deepEqual(
          wrapping,
          { index: ["normal normal"], nav: ["normal normal"] },
          `at ${width}px`,
        );
      }
    });
  });

  describe("the Pages drawer", () => {
    /** The P key, as the protocol's key events give it. */
    const P = { key: "p", code: "KeyP", windowsVirtualKeyCode: 80 };
    const ESCAPE = { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 };
    /** A key pressed and released on the focused element, with the text it types, if any. */
    async function press(key: typeof P | typeof ESCAPE, text?: string): Promise<void> {
      await page.cdp("Input.dispatchKeyEvent", {
        type: text === undefined ? "rawKeyDown" : "keyDown",
        ...key,
        ...(text === undefined ? {} : { text, unmodifiedText: text }),
      });
      await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...key });
    }

    /** The drawer's mode and dialog, the opener's state, and focus. */
    const drawn = (): Promise<{
      mode: string | null;
      wrapper: string | null;
      modal: boolean;
      opener: { shown: boolean; expanded: string | null; shortcut: string | null };
      links: boolean;
      focused: string | null;
    }> =>
      page.evaluate(`(async () => {
        const drawer = document.querySelector("sl-drawer");
        await drawer.updateComplete;
        const opener = document.querySelector(".pages-opener");
        let focused = document.activeElement;
        while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
        return {
          mode: drawer.matches(":state(docked)") ? "docked" : drawer.matches(":state(drawer)") ? "drawer" : null,
          wrapper: drawer.shadowRoot.querySelector("aside, dialog")?.localName ?? null,
          modal: drawer.shadowRoot.querySelector("dialog")?.matches(":modal") ?? false,
          opener: {
            shown: opener.checkVisibility(),
            expanded: opener.getAttribute("aria-expanded"),
            shortcut: opener.getAttribute("aria-keyshortcuts"),
          },
          links: ${INDEX_LINKS}.every((a) => a.checkVisibility()),
          focused: focused === document.body || focused === null ? null
            : focused.textContent.replace(/\\s+/g, " ").trim(),
        };
      })()`);

    test("wide, the drawer docks the site index as an aside, the Pages button hidden and P doing nothing", async () => {
      await load(PAGES.index);
      const docked = await drawn();
      assert.deepEqual(
        [docked.mode, docked.wrapper, docked.modal, docked.opener.shown, docked.links],
        ["docked", "aside", false, false, true],
      );
      assert.deepEqual(
        await page.evaluate(`${shadow("sl-drawer")}.querySelector("aside h2").textContent`),
        "Pages",
      );
      await press(P, "p");
      assert.deepEqual((await drawn()).modal, false, "P opens nothing while docked");
    });

    test("narrow, P opens it as a modal dialog, focus inside, and Escape closes it, focus back on the Pages button", async () => {
      await load(PAGES.index, { width: 390 });
      const closed = await drawn();
      assert.deepEqual(
        [closed.mode, closed.wrapper, closed.modal, closed.links],
        ["drawer", "dialog", false, false],
      );
      assert.deepEqual(closed.opener, { shown: true, expanded: "false", shortcut: "P" });
      await page.evaluate(`document.querySelector(".pages-opener").focus()`);
      await press(P, "p");
      await until(page, `document.querySelector("sl-drawer").open`);
      const open = await drawn();
      assert.deepEqual([open.modal, open.links, open.opener.expanded], [true, true, "true"]);
      assert.equal(open.focused, "Close Pages", "focus is on the dialog's Close button");
      await press(ESCAPE);
      await until(page, `!document.querySelector("sl-drawer").open`);
      const after = await drawn();
      assert.deepEqual(
        [after.modal, after.opener.expanded, after.focused],
        [false, "false", "Pages P"],
      );
    });

    test("narrow, the Pages button opens it, and its Close button closes it, focus back on the Pages button", async () => {
      await load(PAGES.index, { width: 390 });
      await page.evaluate(`document.querySelector(".pages-opener").focus()`);
      await page.evaluate(`document.querySelector(".pages-opener").click()`);
      assert.deepEqual((await drawn()).modal, true);
      await page.evaluate(`${shadow("sl-drawer")}.querySelector("header button").click()`);
      await until(page, `!document.querySelector("sl-drawer").open`);
      const after = await drawn();
      assert.deepEqual(
        [after.modal, after.opener.expanded, after.focused],
        [false, "false", "Pages P"],
      );
    });
  });

  describe("in every profile the full entry registers", () => {
    let registry: Registry;
    before(async () => {
      await load(PAGES.index);
      registry = await read(page);
    });

    test("registers every palette, space, and type the cases run", () => {
      assert.ok(registry.color.length >= 4, JSON.stringify(registry));
      assert.ok(registry.space.length >= 2, JSON.stringify(registry));
      assert.ok(registry.type.length >= 2, JSON.stringify(registry));
    });

    test("each renders with no sideways scroll and its focus drawn, light and dark, wide and narrow", async () => {
      for (const run of runs(registry)) {
        const name = JSON.stringify(run);
        const { width, ...profile } = run;
        await load(PAGES.index, { width }, `?${new URLSearchParams(profile)}`);
        const shown: {
          errors: string[];
          dataset: Record<string, string>;
          boxes: Record<string, { left: number; right: number; height: number }>;
          scrollWidth: number;
          clientWidth: number;
        } = await page.evaluate(`(() => {
          const boxes = {};
          // Narrow, the site index is in the closed drawer, and the Pages button is in its place.
          const tags = ["sl-page-header", ${width} < ${DOCK} ? ".pages-opener" : "sl-site-index", "sl-site-nav"];
          for (const tag of tags) {
            const box = document.querySelector(tag).getBoundingClientRect();
            boxes[tag] = { left: box.left, right: box.right, height: box.height };
          }
          return {
            errors: window.errors,
            dataset: { ...document.documentElement.dataset },
            boxes,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          };
        })()`);
        assert.deepEqual(shown.errors, [], name);
        assert.deepEqual(shown.dataset, profile, name);
        for (const [tag, box] of Object.entries(shown.boxes)) {
          assert.ok(box.height > 0 && box.left >= 0, `${name}: ${tag} renders`);
          assert.ok(box.right <= shown.clientWidth, `${name}: ${tag} fits the viewport`);
        }
        assert.ok(shown.scrollWidth <= shown.clientWidth, `${name}: no sideways scroll`);

        // The keyboard reaches the site nav's three links, then wide the Theme button and the site
        // index's first link, and narrow the Pages and the Theme buttons; each draws its focus
        // outline. The page header holds nothing to focus.
        const focused: { name: string; visible: boolean; outline: string }[] = [];
        for (let i = 0; i < 5; i++) {
          await tab(page);
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
          width < DOCK
            ? ["Org", "Architecture", "sqlate", "Pages P", "Theme"]
            : ["Org", "Architecture", "sqlate", "Theme", "The architecture stand-in"],
          name,
        );
        for (const { name: what, visible, outline } of focused) {
          assert.ok(visible, `${name}: ${what} matches :focus-visible`);
          assert.match(outline, /^solid [1-9]/, `${name}: ${what}'s outline is drawn`);
        }
      }
    });

    test("narrow, the drawer opens modally, with no sideways scroll and its focus drawn, light and dark", async () => {
      for (const run of runs(registry).filter(({ width }) => width < DOCK)) {
        const name = JSON.stringify(run);
        const { width, ...profile } = run;
        await load(PAGES.index, { width }, `?${new URLSearchParams(profile)}`);
        await page.evaluate(`document.querySelector(".pages-opener").focus()`);
        await page.evaluate(`document.querySelector(".pages-opener").click()`);
        await until(page, `document.querySelector("sl-drawer").open`);
        // The slide in run to its end, the dialog at rest.
        await page.evaluate(
          `Promise.all(${shadow("sl-drawer")}.getAnimations().map((a) => a.finished)).then(() => {})`,
        );
        // Opened, focus is on the Close button; Tab moves it to the drawer's next control.
        await tab(page);
        const shown: {
          errors: string[];
          modal: boolean;
          dialog: { left: number; right: number };
          widths: number[][];
          focused: { name: string; inside: boolean; visible: boolean; outline: string };
        } = await page.evaluate(`(() => {
          const drawer = document.querySelector("sl-drawer");
          const dialog = drawer.shadowRoot.querySelector("dialog");
          const box = dialog.getBoundingClientRect();
          let el = document.activeElement;
          while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
          const style = getComputedStyle(el);
          return {
            errors: window.errors,
            modal: dialog.matches(":modal"),
            dialog: { left: box.left, right: box.right },
            // The page, the dialog, and its scrolling body, each as its scroll and client widths.
            widths: [document.documentElement, dialog, dialog.querySelector(".body")].map(
              (it) => [it.scrollWidth, it.clientWidth],
            ),
            focused: {
              name: el.textContent.replace(/\\s+/g, " ").trim(),
              inside: drawer.contains(el) || drawer.shadowRoot.contains(el),
              visible: el.matches(":focus-visible"),
              outline: style.outlineStyle + " " + parseFloat(style.outlineWidth),
            },
          };
        })()`);
        assert.deepEqual(shown.errors, [], name);
        assert.ok(shown.modal, `${name}: the drawer's dialog is modal`);
        assert.ok(
          shown.dialog.left >= 0 && shown.dialog.right <= width,
          `${name}: the dialog ${JSON.stringify(shown.dialog)} fits the viewport`,
        );
        for (const [scroll, client] of shown.widths) {
          assert.ok(scroll <= client, `${name}: no sideways scroll, ${scroll} past ${client}`);
        }
        const { name: what, inside, visible, outline } = shown.focused;
        assert.ok(inside, `${name}: Tab keeps focus in the drawer, on ${what}`);
        assert.ok(visible, `${name}: ${what} matches :focus-visible`);
        assert.match(outline, /^solid [1-9]/, `${name}: ${what}'s outline is drawn`);
      }
    });
  });

  describe("the theme across sites", () => {
    /** How long the crossing holds each of the foundation's modules, in ms. */
    const DELAY = 200;

    before(async () => {
      await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source: RECORDER });
      // Each request Fetch pauses, only while a crossing has it enabled, continues DELAY ms on.
      page.on("Fetch.requestPaused", ({ requestId }: { requestId: string }) => {
        setTimeout(() => page.cdp("Fetch.continueRequest", { requestId }).catch(() => {}), DELAY);
      });
    });

    /** Opens the theme menu, checks the palette and the scheme, and saves them. */
    async function choose(palette: string, scheme: string): Promise<void> {
      await page.evaluate(`(async () => {
        document.querySelector('[commandfor="theme"]').click();
        let dialog;
        while (!(dialog = document.querySelector("sl-theme-menu dialog[open]"))) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        dialog.querySelector('[data-section="color"] input[value=${JSON.stringify(palette)}]').click();
        dialog.querySelector('[data-section="scheme"] input[value=${JSON.stringify(scheme)}]').click();
        dialog.querySelector('[data-action="save"]').click();
      })()`);
    }

    /** The stored theme, parsed. */
    const stored = (): Promise<Record<string, string> | null> =>
      page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}))`);

    /** The site nav's link to a site, in a page expression. */
    const link = (base: string) => `${shadow("sl-site-nav")}.querySelector('a[href="${base}"]')`;

    /**
     * Follows the site nav's link to the site, every module of the foundation's held DELAY ms, and
     * resolves to the new page's first frame: were the modules not render-blocking, the first frame
     * would come before them, the stored theme not yet applied. The frame's time shows it waited.
     */
    async function cross(base: string): Promise<Record<string, unknown>> {
      await page.cdp("Fetch.enable", {
        patterns: [{ urlPattern: "*/spike-html-apps-foundation/dist/*.js" }],
      });
      try {
        await follow(link(base));
      } finally {
        await page.cdp("Fetch.disable");
      }
      assert.equal(await page.evaluate("location.pathname"), base);
      const { time, ...frame } = await page.evaluate("window.frame");
      assert.ok(time >= DELAY, `the first frame, at ${time} ms, waited on the held modules`);
      return frame;
    }

    test("a theme saved on one site applies before first paint on the other", async () => {
      await load(ARCHITECTURE);
      await choose("primer", "dark");
      const saved = { scheme: "dark", color: "primer", space: "regular", type: "mono" };
      assert.deepEqual(await stored(), saved);
      const frame = await cross(SQLATE);
      assert.deepEqual(frame, {
        dataset: { palette: "primer", space: "regular", type: "mono", scheme: "dark" },
        background: await background(page, "primer", "dark"),
        painted: false,
      });
      assert.notEqual(frame.background, await background(page, "flexoki", "dark"));
      assert.deepEqual(await page.evaluate("window.errors"), []);
    });

    test("a palette the other site doesn't register falls back to its default and stays stored", async () => {
      await load(ARCHITECTURE);
      await choose("catppuccin", "dark");
      const saved = { scheme: "dark", color: "catppuccin", space: "regular", type: "mono" };
      assert.deepEqual(await cross(SQLATE), {
        dataset: { space: "regular", type: "mono", scheme: "dark" },
        background: await background(page, "flexoki", "dark"),
        painted: false,
      });
      assert.deepEqual(await stored(), saved, "the unregistered palette stays stored");
      // Back on the site that registers it, the stored palette applies on the first frame.
      assert.deepEqual(await cross(ARCHITECTURE), {
        dataset: { palette: "catppuccin", space: "regular", type: "mono", scheme: "dark" },
        background: await background(page, "catppuccin", "dark"),
        painted: false,
      });
      assert.deepEqual(await page.evaluate("window.errors"), []);
    });
  });
});
