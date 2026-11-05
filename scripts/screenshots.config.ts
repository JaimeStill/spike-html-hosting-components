// mise run screenshots' description, which spike-html-apps-tooling's spike-html-apps-screenshots
// reads: the section tree's fixture page in its viewport, wide and narrow, at its top, scrolled to
// a later section, which the tree marks and the progress bar reaches, and with the keys help
// dialog open; the architecture fixture site's index page, at its base, with the site nav, the
// site index, and the page header, wide and narrow, and with its theme menu open; the profile's facets, palette, space, and type, at flexoki, regular, and mono;
// --all's profiles, every palette at the defaults, then compact and sans at flexoki; the profiles
// the page registers, from the foundation's registry; and the repository served as the browser
// tier serves it. The files go to a fresh directory under TMPDIR, or to --dir's, never into the
// repository unless --dir names its gitignored captures/.
// Adapted from spike-html-apps-components (51d2b92): scripts/screenshots.config.ts, its pages
// the section tree's fixture and the architecture fixture site's.

import type {
  DescribedPage,
  DescribedState,
  Description,
  Step,
} from "@jaimestill/spike-html-apps-tooling/screenshots.js";

import { served } from "../test/browser/support/served.ts";

const wide = { width: 1280, height: 800 };
const narrow = { width: 390, height: 844 };

/** Scrolls the fourth section's heading to the top, at once, and resolves once the tree marks it. */
const scrolled: Step = async (page) => {
  await page.evaluate(`(async () => {
    await window.ready;
    const link = document.querySelectorAll("sl-section-tree a")[3];
    document.getElementById(decodeURIComponent(link.hash.slice(1)))
      .scrollIntoView({ block: "start", behavior: "instant" });
    while (link.getAttribute("aria-current") === null) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  })()`);
};

/** Opens the keys help dialog and resolves once keys-help.js has filled it. */
const help: Step = async (page) => {
  await page.evaluate(`(async () => {
    await window.ready;
    document.querySelector("#help").showModal();
    while (!document.querySelector("#help [data-keys-table]")) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  })()`);
};

/** The fixture page's states, each its viewport alone. */
const states: DescribedState[] = [
  { name: "section-tree-wide", caption: "the section tree, wide", viewport: wide, full: false },
  {
    name: "section-tree-narrow",
    caption: "the section tree, narrow",
    viewport: narrow,
    full: false,
  },
  {
    name: "section-tree-scrolled",
    caption: "the section tree, a later section in view",
    viewport: wide,
    full: false,
    open: scrolled,
  },
  {
    name: "section-tree-scrolled-narrow",
    caption: "the section tree, a later section in view, narrow",
    viewport: narrow,
    full: false,
    open: scrolled,
  },
  {
    name: "section-tree-keys",
    caption: "the section tree's keys in the help dialog",
    viewport: wide,
    full: false,
    open: help,
  },
];

/** Opens the theme menu and resolves once theme-menu.js has filled it. */
const theme: Step = async (page) => {
  await page.evaluate(`(async () => {
    await window.ready;
    document.querySelector('[commandfor="theme"]').click();
    while (!document.querySelector("sl-theme-menu dialog[open]")) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  })()`);
};

/** The architecture fixture site's index page's states, each its viewport alone. */
const site: DescribedState[] = [
  { name: "site-wide", caption: "the site components, wide", viewport: wide, full: false },
  { name: "site-narrow", caption: "the site components, narrow", viewport: narrow, full: false },
  {
    name: "site-theme",
    caption: "the site components with the theme menu open",
    viewport: wide,
    full: false,
    open: theme,
  },
];

const pages: DescribedPage[] = [
  {
    name: "section-tree",
    caption: "the section tree",
    path: "test/fixtures/section-tree.html",
    states,
  },
  {
    name: "site",
    caption: "the site components",
    // The site's base, which served.ts's handler answers with its index.html, so the site nav
    // marks the architecture site as the site's own pages do.
    path: "spike-html-hosting-architecture/",
    states: site,
  },
];

/** The page's registered names, by flag, read from the foundation's store at its well-known
 * global key; its color facet is palette's. */
const REGISTRY = `window.ready.then(() => {
  const store = globalThis[Symbol.for("spike-html-apps-foundation.registry")] ?? {};
  return { palette: store.color ?? [], space: store.space ?? [], type: store.type ?? [] };
})`;

const description: Description = {
  pages,
  facets: [
    { flag: "palette", attribute: "data-palette", default: "flexoki" },
    { flag: "space", attribute: "data-space", default: "regular" },
    { flag: "type", attribute: "data-type", default: "mono" },
  ],
  all: [
    ...["flexoki", "primer", "catppuccin", "everforest"].map((palette) => ({ palette })),
    { space: "compact" },
    { type: "sans" },
  ],
  profiles: (page) => page.evaluate(REGISTRY),
  server: served,
};

export default description;
