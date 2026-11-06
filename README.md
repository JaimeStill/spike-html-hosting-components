# spike-html-hosting-components

The documentation components layer of spike-html-hosting: five Lit elements with shadow roots,
and their sheets, that the spike's GitHub Pages sites build their pages from, the section tree,
the page header, the site index, the nav between the sites, and the drawer that holds the site
index where its column doesn't fit. It is ES modules with their type declarations and
stylesheets, built on
[spike-html-apps-foundation](https://github.com/JaimeStill/spike-html-apps-foundation) and drawing
its glyphs from [spike-html-hosting-icons](https://github.com/JaimeStill/spike-html-hosting-icons),
both of which it takes as peers, and is released by git tag.

## Install

Each release is a tag, `v<version>`, whose tree is the package as `pnpm pack` builds it:
`package.json`, this README, the LICENSE, and `dist/`; each GitHub release also carries the
tarball. It depends on lit 3.3.3, and takes the foundation as a peer at `^0.3.0` and the icons
at `^0.1.0`: a site declares each beside the components, and the one copy serves both, so a
restyle of the foundation's sheets by package name reaches the components' shadow roots too, and
a glyph the site and the components both use is in its bundle once. A site pins all three by
their tags:

```
pnpm add github:JaimeStill/spike-html-hosting-components#v0.4.0 \
  github:JaimeStill/spike-html-apps-foundation#v0.3.0 \
  github:JaimeStill/spike-html-hosting-icons#v0.1.0
```

## Use

The package is `@jaimestill/spike-html-hosting-components`. Each module defines its element when
it is imported, and the element's shadow root adopts the foundation's reset and elements sheets,
then its own. The modules import `lit`, the foundation, and each glyph they show, one icons module
apiece, by package name, and their sheets as CSS module scripts, `with { type: "css" }`; tsc
builds one module per element, so a site's bundle holds only the glyphs of the elements it
imports. A site built with
[spike-html-hosting-sdk](https://github.com/JaimeStill/spike-html-hosting-sdk) imports each
element's module from its entry script, and the SDK's `cssModuleScripts()` Vite plugin, which
parses every module under `node_modules/@jaimestill/`, rewrites each sheet to a constructed
`CSSStyleSheet` at build:

```js
import "@jaimestill/spike-html-hosting-components/site-nav.js";
import "@jaimestill/spike-html-hosting-components/site-index.js";
import "@jaimestill/spike-html-hosting-components/page-header.js";
import "@jaimestill/spike-html-hosting-components/section-tree.js";
import "@jaimestill/spike-html-hosting-components/drawer.js";
```

- `./<name>.js`, with its `./<name>.d.ts`: each element's module, which exports its `tagName`.
- `./<name>.css`: each element's sheet, which its module imports itself.

Every element but the site nav slots light-DOM markup the page writes, so with no script that
markup renders as the page's own and every link still goes where it says. Where an element marks
a slotted link with `aria-current`, the mark is an attribute on the light-DOM link, which a shadow
sheet can't reach below the slot's top level, so its look is the page's to style, for example
`sl-section-tree a[aria-current]` and `sl-site-index a[aria-current]`.

### `sl-section-tree`

`./section-tree.js`: a page's table of contents. `label`, the name of the nav landmark its shadow
root holds, is "Sections" by default; the light DOM carries no nav of its own. It slots a `ul` or
an `ol` of `li`, each holding one `a` whose href is `#` and the id of an `h2` on the page,
GitHub's heading id, with a nested `ul` or `ol` for the `h3`s under it:

```html
<sl-section-tree label="On this page">
  <ul>
    <li>
      <a href="#install">Install</a>
      <ul>
        <li><a href="#from-a-tag">From a tag</a></li>
      </ul>
    </li>
    <li><a href="#use">Use</a></li>
  </ul>
</sl-section-tree>
```

- A link whose fragment names no element on the page stays a plain link and no section of the
  tree.
- The link of the section in view carries `aria-current="location"`: the last section whose
  heading has reached the reading line, a third of the way down the viewport. At the top of the
  page, scrolled to 0, and before the first heading reaches the line, no link is marked: the top
  is a stop of its own.
- H and L move to the previous and the next stop, the page's top then each section, and wrap: L
  from the top goes to the first section and past the last back to the top; H from the top goes
  to the last section and from the first to the top. A move to a section scrolls its heading to
  the top of the viewport, and one to the top scrolls the page to 0. Each move counts from the
  stop the last one reached, which stays marked while the page rests where the move left it, even
  a short section whose next heading is already past the reading line, or the last section, which
  the page can't scroll to the line. A link followed to a section the tree lists reaches it as a
  move would: a click or Enter on one of the tree's own links, and any change of the URL's
  fragment to a listed heading's id, by a link elsewhere on the page, a script, or the history,
  make that section the held stop, while the link's navigation and scroll, with `:target` and its
  scroll margin, stay the browser's. A page loaded with a fragment holds no stop. Once the reader
  scrolls by other means, the mark follows the reading line again and the next move counts from
  the section in view. H and L are bound by `register()` in the foundation's keys module, so its
  help dialog lists them as "Previous section" and "Next section" and its off switch, which
  covers character keys, turns them off. Every arrow key stays the browser's own scrolling, in the
  page and in any region that scrolls sideways. The Previous and Next buttons show Octicons'
  `arrow-up-16` and `arrow-down-16` with the key hints H and L, each in a `<kbd>`, and are named
  "Previous" and "Next" by their `aria-label`. They move the same way whatever the setting, are
  disabled only when the tree names no section, and carry `aria-keyshortcuts` while the keys are
  on. A move scrolls smoothly unless the reader asks for reduced motion; its scroll ends at its
  `scrollend`, or, in an engine that fires none, as Safari may, once the page has stood still for
  five frames, or after three seconds at most, whichever comes first.
- `dock`, a CSS length, `70rem` by default (exported as `DOCK`), is the width at which the tree is
  a column, and wider: where one 16rem side column fits beside a reading column of 80ch in the
  foundation's default mono type. A site whose layout docks the column elsewhere sets its own,
  for example `<sl-section-tree dock="88rem">`. It is read in the media query `(width < <dock>)`,
  as `sl-drawer` reads its own: a viewport of exactly `dock` is a column, and a length the query
  can't read leaves the tree a column at every width. The mode is a custom state, `docked` or
  `bar`, which a page may style as `sl-section-tree:state(bar)`.
- Below `dock` the tree is a bar stuck to the top of the viewport, on the page's background,
  holding the reading progress and the Previous and Next buttons alone, its links hidden. The bar
  sticks within the element's containing block, so the page places the element, or a wrapper of
  `display: contents` at those widths, in the page's own flow before `main`, not in a wrapper
  only as tall as the tree. While it is the bar the element sets the root's
  `scroll-padding-block-start`, inline, to the bar's block size, so a heading a move or a link
  scrolls to lands below the bar, and puts back the root's own inline value as it leaves the bar
  or the page.
- Link text never breaks inside a word: the element sets `overflow-wrap` and `word-break` to
  `normal`, so a page's own mid-word breaking, inherited from an ancestor, stops at the tree. A
  word wider than the column overflows it, so the column's minimum width is the page's to give.
- The reading progress is a bar the page's scroll drives through a CSS scroll timeline, with no
  script; in an engine without scroll timelines it is absent and nothing else changes.
- With no script the element is undefined, so the list renders as the page's own at every width
  and every link jumps to its section; the bar, the buttons, the mark, and the keys are the
  script's.

### `sl-page-header`

`./page-header.js`: a page's front matter. It takes no attribute. It slots one `dl` of `dt` and
`dd` pairs, a `dt` for each front matter key and a `dd` for its value, in the order the source
writes them, and lays them out terms beside values:

```html
<sl-page-header>
  <dl>
    <dt>title</dt>
    <dd>The architecture stand-in</dd>
    <dt>status</dt>
    <dd>draft</dd>
  </dl>
</sl-page-header>
```

- Every key and value is text, escaped where the page is written, so a value that reads as markup
  shows as the characters it is; the element parses and reorders nothing.
- A page with no front matter writes an empty `dl`, or none: either renders nothing, the element
  taking no space.
- It is no landmark and holds nothing to focus. With no script the list renders as the page's own
  `dl`.

### `sl-site-index`

`./site-index.js`: every page of the current site. `label`, the name of the nav landmark its
shadow root holds, is "Pages" by default. It slots a `ul` of `li`, one for every page of the site
and every directory, nested as the directories are, in the order the renderer writes them:

```html
<sl-site-index label="Site">
  <ul>
    <li><a href="/spike-html-hosting-architecture/">The architecture stand-in</a></li>
    <li>
      <a href="/spike-html-hosting-architecture/principles/">Principles</a>
      <ul>
        <li><a href="/spike-html-hosting-architecture/principles/plain-web.html">Plain web</a></li>
      </ul>
    </li>
    <li>
      <span>Conventions</span>
      <ul>
        <li><a href="/spike-html-hosting-architecture/conventions/naming.html">Naming</a></li>
      </ul>
    </li>
  </ul>
</sl-site-index>
```

- A page is an `li` holding one `a`, its text the page's title. A directory is an `li` holding its
  label then a nested `ul` of its entries: with an index page the label is that page's `a`, its
  href the directory's; with none it is a `span` of the directory's name. The site's own index
  page is an entry of the top-level list.
- The link of the page on screen carries `aria-current="page"`: the first whose resolved path is
  `location`'s, a directory's path and its `index.html` the same page, at connection and whenever
  the slotted list changes. The element is the mark's one writer, removing a renderer's own
  `aria-current="page"` from any other link, so the same list serves every page of the site.
- Its link text never breaks inside a word, as the section tree's never does.
- With no script the list renders and every link goes to its page, unmarked.
- Where its column doesn't fit, a site holds it in an `sl-drawer`, which the Pages button opens;
  see [`sl-drawer`](#sl-drawer).

### `sl-site-nav`

`./site-nav.js`: the nav between the sites. `label`, the name of the nav landmark its shadow root
holds, is "Sites" by default. It takes no content:

```html
<sl-site-nav label="Sites"></sl-site-nav>
```

- The built list is `SITES`, built into the element and exported, so every site's nav lists the
  same sites from one place: Org (`spike-html-hosting`), Architecture
  (`spike-html-hosting-architecture`), and sqlate (`spike-html-hosting-sqlate`). Each is a GitHub
  Pages project site of the same owner, on one origin, linked root-relative at `/<repository>/`,
  so the sites share the origin's storage, the reader's theme among it.
- A change to the built list is a release of the components, and each site takes it by moving its
  pin, so a site deployed with an older release lists that release's `SITES` until it is rebuilt.
- `src`, optional, a URL, names one list every site reads instead, so a site added to it appears
  on every site's nav at once, whatever release each was built with:

  ```html
  <sl-site-nav src="/spike-html-hosting/sites.json"></sl-site-nav>
  ```

  The list is JSON, a non-empty array of objects in the order the nav lists them, each with a
  non-empty string `repository` and `label`, the shape of a `SITES` entry; an entry's other
  properties are dropped:

  ```json
  [
    { "repository": "spike-html-hosting", "label": "Org" },
    { "repository": "spike-html-hosting-architecture", "label": "Architecture" },
    { "repository": "spike-html-hosting-sqlate", "label": "sqlate" }
  ]
  ```

  The element fetches it with the browser's `fetch()` and renders the built list until the fetch
  succeeds, so the first paint never waits on the network, then renders the fetched list in its
  place. A failed fetch, an error status, or a list that isn't JSON, is empty, or has an entry
  without both strings keeps the built list. A changed `src` renders the built list again and
  fetches its own list, a response for an older `src` dropped; a removed `src` renders the built
  list again and fetches nothing. With no `src` the element fetches nothing and behaves as it did
  in v0.2.2.
- The current site's link carries `aria-current="page"`: the site whose repository is
  `location.pathname`'s first segment, so every page of a site marks it. A path whose first
  segment names no listed site marks none. The link is in the shadow root, so the element's own
  sheet styles the mark.
- With no script the element is empty and renders nothing; each site's own pages stay reachable
  from its index.
- Its link text never breaks inside a word, as the section tree's never does.

### `sl-drawer`

`./drawer.js`: a drawer for a narrow layout, copied with its behavior and its markup contract from
[spike-html-apps-components](https://github.com/JaimeStill/spike-html-apps-components) at
51d2b92. Its children sit in its default slot and are never moved, disconnected, or re-created:
a switch between the modes swaps only the shadow root's wrapper around the same slot.

- At `dock`, a CSS length, `48rem` by default, and wider it is docked: an `aside`, a
  complementary landmark named by `label` as its visible `h2`, laid out as an ordinary block in
  the element's place, always shown and never taking focus. `open` stays false there, and
  `show()`, `close()`, and `toggle()` do nothing. `dock` is read in the media query
  `(width < <dock>)`: a viewport of exactly `dock` docks, and a length the query can't read
  leaves it docked at every width.
- Below `dock` it is closed until `show()`, `toggle()`, or `open` opens it as a native modal
  dialog covering the viewport, sliding in from the inline-start edge unless the reader asks for
  reduced motion, the page behind inert and focus inside. Its header holds `label` as a visible
  `h2` and a Close button that shows Octicons' `x-16` alone, named "Close" and the label by its
  visually hidden text; the `close` slot replaces "Close" there, for a translation. The Close
  button, Escape, `close()`, `toggle()`, or `open` set false closes it, and focus returns to the
  element that held it.
- `open` and `close` go out, bubbling and composed, each time the modal drawer opens or closes,
  never on a switch between the modes or on removal. The mode is a custom state, `docked` or
  `drawer`.

A site shell holds its site index in a drawer labeled "Pages", and its header holds the opener,
page markup and the page's script rather than the drawer's: a button named "Pages" by its
`aria-label`, showing its glyph and the key hint P in a `<kbd>`, bound to P by the foundation's
keys module through `data-keys="p"`, as the Help button is bound to ? and the Theme button to T,
shown only below the drawer's `dock` and only once the drawer is defined, which calls the drawer's
`show()` and says through `aria-expanded` whether it is open. Each header button, and the keys
help dialog's Close, shows a glyph and its key hint, its word no longer shown and its name in its
`aria-label`. The page's markup names each glyph by a marker, an empty
`<svg data-icon="<set>/<name>">`, which
[spike-html-hosting-sdk](https://github.com/JaimeStill/spike-html-hosting-sdk) fills with the
icons module's `svg` at build: Octicons' `list-unordered-16` for Pages, `question-16` for Help,
`paintbrush-16` for Theme, and `x-16` for the help dialog's Close:

```html
<header>
  <sl-site-nav></sl-site-nav>
  <button
    type="button"
    class="pages-opener"
    aria-controls="pages"
    aria-haspopup="dialog"
    aria-expanded="false"
    aria-label="Pages"
    data-keys="p"
  >
    <svg data-icon="octicon/list-unordered-16"></svg>
    <span aria-hidden="true"><kbd>P</kbd></span>
  </button>
  <button type="button" commandfor="help" command="show-modal" aria-label="Help" data-keys="?">
    <svg data-icon="octicon/question-16"></svg>
    <span aria-hidden="true"><kbd>?</kbd></span>
  </button>
  <button type="button" commandfor="theme" command="--open" aria-label="Theme" data-keys="t">
    <svg data-icon="octicon/paintbrush-16"></svg>
    <span aria-hidden="true"><kbd>T</kbd></span>
  </button>
</header>
<sl-drawer label="Pages" id="pages">
  <sl-site-index label="Site">
    <ul>
      …
    </ul>
  </sl-site-index>
</sl-drawer>
<dialog id="help" aria-labelledby="help-title">
  <h2 id="help-title">Keyboard shortcuts</h2>
  <div data-keys-list></div>
  <footer>
    <button type="button" commandfor="help" command="close" aria-label="Close" data-keys="?">
      <svg data-icon="octicon/x-16"></svg>
      <span aria-hidden="true"><kbd>?</kbd></span>
    </button>
  </footer>
</dialog>
```

```css
.pages-opener {
  display: none;
}
@media (width < 48rem) {
  body:has(sl-drawer:defined) .pages-opener {
    display: inline-block;
  }
}
```

```js
const drawer = document.querySelector("sl-drawer");
const opener = document.querySelector(".pages-opener");
opener.addEventListener("click", () => drawer.show());
const expanded = () => opener.setAttribute("aria-expanded", String(drawer.open));
drawer.addEventListener("open", expanded);
drawer.addEventListener("close", expanded);
```

The keys module clicks only a rendered control, so while the drawer is docked and its opener
hidden, P is neither listed nor fired; while the drawer is open, a modal, the keys module fires
none of the page's keys, and Escape or the Close button closes it. A site that docks its index at
another width sets the drawer's `dock` and its opener's media query to the same length. With no
script the drawer is undefined, so the index renders as the page's own and the opener stays
hidden.

## Development

Tasks run through [mise](https://mise.jdx.dev):

```
mise run install                      # the pinned tools, and node_modules with the foundation, the icons, and the tooling at their tags; reads the network
mise run check                        # lint, types, build, and the unit and browser tiers; reads no network
mise run build                        # src/ into dist/
mise run screenshots                  # capture each fixture page light and dark, wide and narrow, inline in the terminal
mise run screenshots --palette primer # the same, in the palette named; --space and --type name the other facets
mise run screenshots --all            # every palette at the defaults, then compact and sans at flexoki
mise run screenshots --page site      # only the page named: section-tree, site, ahead, behind, ahead-fetched, or behind-fetched; repeatable
mise run screenshots --scheme dark    # only the scheme named, light or dark
mise run screenshots --output browser # a gallery of the captures, opened in the browser; directory keeps the files
mise run screenshots --dir <path>     # write the captures into the directory named
mise run screenshots --keep           # keep the terminal output's captures
mise run currency                     # report every tool, package, and action pin, the foundation's, the icons', and the tooling's tags, and the peers' ranges, behind its latest
```

`test/fixtures/section-tree.html` is the section tree's fixture page,
`test/fixtures/section-tree-short.html` its page of sections shorter than a screen,
`test/fixtures/drawer.html` the drawer cases' page, and `test/fixtures/sites/` holds the fixture
sites served at their project sites' paths: the architecture stand-in's, with the site nav, the
site index in its Pages drawer and opener, and the page header; sqlate's, with the site nav as
built, a site deployed behind; a fourth site's, with a site nav whose `SITES` lists it too, a site
deployed ahead; and the org's lists for `src`, `sites.json` naming all four. The browser tier
runs on them in the pinned chrome-headless-shell, and `mise run screenshots` captures them
through the `spike-html-apps-screenshots` bin of
[spike-html-apps-tooling](https://github.com/JaimeStill/spike-html-apps-tooling).

A push to main whose `package.json` version has no tag yet releases it: the check, then the pack
committed and tagged, and a GitHub release from `CHANGELOG.md`.

## License

[Apache License 2.0](LICENSE).
