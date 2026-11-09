# spike-html-hosting-components

The documentation components layer of spike-html-hosting: six Lit elements with shadow roots,
their sheets, and the glyph button's sheet, that the spike's GitHub Pages sites build their pages
from, the section tree, the site index, the nav between the sites, the drawer that holds the
site index where its column doesn't fit, the list of the page's keyboard shortcuts in its Help
dialog, and the reader's settings in its Settings dialog. It is ES modules
with their type declarations and stylesheets, built on
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
import "@jaimestill/spike-html-hosting-components/section-tree.js";
import "@jaimestill/spike-html-hosting-components/drawer.js";
import "@jaimestill/spike-html-hosting-components/shortcuts.js";
import "@jaimestill/spike-html-hosting-components/settings.js";
```

- `./<name>.js`, with its `./<name>.d.ts`: each element's module, which exports its `tagName`.
- `./<name>.css`: each element's sheet, which its module imports itself, and
  `./section-tree-links.css`, the section tree's sheet for its slotted links, which its module
  imports and adopts into the page.
- `./glyph-button.css`: the glyph button's sheet, which the drawer adopts in its shadow root and
  a page links for its own; see [Glyph buttons](#glyph-buttons).

Every element but the site nav, the shortcuts list, and the settings slots light-DOM markup the
page writes, so with no script that markup renders as the page's own and every link still goes
where it says.
Where an element marks a slotted link with `aria-current`, the mark is an attribute on the
light-DOM link, which a shadow sheet can't reach below the slot's top level. The site index leaves
its look to the page, for example `sl-site-index a[aria-current]`; the section tree draws its own,
through a sheet it adopts into the page (see [`sl-section-tree`](#sl-section-tree)).

### Glyph buttons

A glyph button is a control of its own beside the text button: the class `glyph-button` on a
native `<button>` that shows a glyph and, when it has one, its key hint in a `<kbd>`, named by its
`aria-label`. `glyph-button.css` lays the glyph and the hint in a row, centered, with padding
`--space-3xs` block and `--space-2xs` inline and `--space-3xs` between them, and keeps the native
button's border, surface, hover, and focus ring from the foundation's elements layer. Its lengths
are the foundation's space steps alone, and every glyph button is at least 24 CSS px a side, the
glyph alone in the compact space profile at its narrowest included. The sheet is unlayered, so it
sits above the foundation's layers in a shadow root and in a page.

Each glyph button shows its name on hover and keyboard focus through an interest invoker:
`interestfor` names an element of `popover="hint"` in the same tree, of the class `glyph-hint`,
whose text is the button's name. The browser shows it below the button, above where the viewport
would cut it, and Escape dismisses it, with no script. Where `interestfor` isn't supported, today
everywhere but Chromium, the hint never shows and the button keeps its name. Chromium makes an
interest target's text its invoker's description, so the button carries an empty
`aria-description` and the hint `aria-hidden="true"`: assistive technology announces the name
once.

```html
<button
  type="button"
  class="glyph-button"
  commandfor="help"
  command="show-modal"
  aria-label="Help"
  data-keys="?"
  interestfor="help-hint"
  aria-description=""
>
  <svg …></svg>
  <span aria-hidden="true"><kbd>?</kbd></span>
</button>
<div id="help-hint" class="glyph-hint" popover="hint" aria-hidden="true">Help</div>
```

### Shortcut dialogs

A shortcut dialog is a pattern, not an element: markup the page writes from native parts, which
no module of this package defines. A key and its opener, a [glyph button](#glyph-buttons), open a
native modal dialog that opens with a header row, a heading naming it and a Close glyph button
with the hint Esc, over whatever content its focused operation needs. It gives any focused
interface overlaid on the page a key: the reader's settings and the page's shortcuts are its two
instances here.

The opener is a native `<button class="glyph-button">`:

- `data-keys="<key>"` binds it to its key: the foundation's keys module clicks it on that key and
  writes its `aria-keyshortcuts` while the reader's setting has the key fire.
- `commandfor="<dialog id>"` and `command="show-modal"` open the dialog as a modal, by the native
  invoker command, with no script.
- It shows its glyph, a marker `<svg data-icon="octicon/<name>">` that
  [spike-html-hosting-sdk](https://github.com/JaimeStill/spike-html-hosting-sdk) fills with the
  icons module's `svg` at build, and its key hint, a `<kbd>` in an `aria-hidden` span.
- `aria-label` names it, and the shortcuts list names its row by that name.
- Its `interestfor` names its hint, a `popover="hint"` element of the class `glyph-hint` and
  `aria-hidden="true"` whose text is the name, and it carries an empty `aria-description`, as
  every glyph button does.

The dialog is a native `<dialog>`:

- It opens with its header row, a `<header class="dialog-header">` holding its heading, an `h2`
  of the operation's name, and, at the row's inline end, its Close. `aria-labelledby` names the
  dialog by that heading: a dialog takes no name from a heading inside it on its own.
- Its content follows the header row and is whatever the operation needs, and the operation
  applies as its content says: there is no Save and no Cancel, and closing is the dialog's own
  concern, never the content's.
- Its Close is a glyph button, `commandfor="<dialog id>"` and `command="close"`, named "Close" by
  its `aria-label`, showing Octicons' `x-16` and the hint `<kbd>Esc</kbd>`, with its own interest
  hint. Nothing follows the content: the Close is the header row's, never a trailing one. Escape
  closes a modal dialog natively, from anywhere in it, a field included. The Close
  takes no `data-keys`, and the opener's key doesn't close it: the keys module passes over a key
  pressed in a field, and a shortcut dialog's content is often one, so the key would close it
  only some of the time.

This package ships no sheet for the dialog: the SDK's `site.css` lays it out. The header row puts
the heading at its inline start and the Close at its inline end, aligned on their centers, with
more space under it than between the content's own sections, so the first section stands apart
from the heading. The Help dialog is as wide as its content, `fit-content`, up to `56rem`; the
Settings dialog keeps its `56rem`.

While the dialog is open the page behind it is inert and the keys module fires only the
dialog's own keys, so the opener's key, outside it, fires nothing. When it closes, the browser
returns focus to the element that held it as the dialog opened: the opener, when it was clicked
or activated from the keyboard, or, since the keys module clicks the opener without focusing it,
the element focus was on when the dialog's key opened it.

The Settings dialog is one instance, under S, with Octicons' `gear-16`; its heading is
"Settings" and it holds [`sl-settings`](#sl-settings), which applies and stores every change at
once:

```html
<button
  type="button"
  class="glyph-button"
  commandfor="settings"
  command="show-modal"
  aria-label="Settings"
  data-keys="s"
  interestfor="settings-hint"
  aria-description=""
>
  <svg data-icon="octicon/gear-16"></svg>
  <span aria-hidden="true"><kbd>S</kbd></span>
</button>
<div id="settings-hint" class="glyph-hint" popover="hint" aria-hidden="true">Settings</div>
<dialog id="settings" aria-labelledby="settings-title">
  <header class="dialog-header">
    <h2 id="settings-title">Settings</h2>
    <button
      type="button"
      class="glyph-button"
      commandfor="settings"
      command="close"
      aria-label="Close"
      interestfor="settings-close-hint"
      aria-description=""
    >
      <svg data-icon="octicon/x-16"></svg>
      <span aria-hidden="true"><kbd>Esc</kbd></span>
    </button>
    <div id="settings-close-hint" class="glyph-hint" popover="hint" aria-hidden="true">Close</div>
  </header>
  <sl-settings></sl-settings>
</dialog>
```

The Help dialog is the other, under ?, with Octicons' `question-16`; its heading is "Keyboard
shortcuts" and it holds [`sl-shortcuts`](#sl-shortcuts) alone, which lists every binding outside
the dialog, Help's and Settings' among them. The site header under [`sl-drawer`](#sl-drawer)
gives both.

Any other focused operation extends the pattern the same way, its content whatever the
operation needs. An upload, for one, is an opener under U, with Octicons' `upload-16` and the
name "Upload", and a dialog headed "Upload" that holds a file input, a drop area, and a list of
the uploads' progress, which the page's script runs:

```html
<dialog id="upload" aria-labelledby="upload-title">
  <header class="dialog-header">
    <h2 id="upload-title">Upload</h2>
    <button
      type="button"
      class="glyph-button"
      commandfor="upload"
      command="close"
      aria-label="Close"
      interestfor="upload-close-hint"
      aria-description=""
    >
      <svg data-icon="octicon/x-16"></svg>
      <span aria-hidden="true"><kbd>Esc</kbd></span>
    </button>
    <div id="upload-close-hint" class="glyph-hint" popover="hint" aria-hidden="true">Close</div>
  </header>
  <label>Files <input type="file" multiple /></label>
  <div class="drop">Or drop files here</div>
  <ul class="uploads"></ul>
</dialog>
```

spike-html-hosting-sdk's shell checks hold every page a site builds to the pattern: a page fails
where a dialog that a keyed `show-modal` opener opens has no heading naming it or no Close with
the hint Esc, or where the opener doesn't show its key and its name.

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
- The tree is its links alone: the shadow root holds the nav landmark around the slot and
  nothing else.
- The link of the section in view carries `aria-current="location"`: the last section whose
  heading has reached the reading line, a third of the way down the viewport. At the top of the
  page, scrolled to 0, and before the first heading reaches the line, no link is marked: the top
  is a stop of its own.
- The current link is marked by an accent rule at its inline start and bold text. The mark is an
  attribute on the light-DOM link, which the element's shadow sheet can't reach, so the element
  adopts `section-tree-links.css` into the document, or the shadow root it sits in, once, as it
  connects: every link of the tree is a block with a transparent inline-start rule `--space-3xs`
  wide and `--space-2xs` before its text, and the current one draws the rule in `--accent-color`
  (by default `--magenta`) and its text at weight 600. Every link keeps the rule's width, so the
  mark moves no text. The sheet is unlayered, above the foundation's layers; a page restyles the
  links with selectors at least as specific, such as `sl-section-tree a[aria-current]`.
- J and K move to the next and the previous stop, the page's top then each section, and wrap: J
  from the top goes to the first section and past the last back to the top; K from the top goes
  to the last section and from the first to the top. A move to a section scrolls its heading to
  the top of the viewport, and one to the top scrolls the page to 0, and the section a move
  reaches carries `aria-current`. Each move counts from the stop the last one reached, which stays
  marked while the page rests where the move left it, even a short section whose next heading is
  already past the reading line, or the last section, which the page can't scroll to the line. A
  link followed to a section the tree lists reaches it as a move would: a click or Enter on one of
  the tree's own links, and any change of the URL's fragment to a listed heading's id, by a link
  elsewhere on the page, a script, or the history, make that section the held stop, while the
  link's navigation and scroll, with `:target` and its scroll margin, stay the browser's. A page
  loaded with a fragment holds no stop. Once the reader scrolls by other means, the mark follows
  the reading line again and the next move counts from the section in view. J and K are bound by
  `register()` in the foundation's keys module, so [`sl-shortcuts`](#sl-shortcuts) lists them as
  "Next section" and "Previous section", and the character-key switch of
  [`sl-settings`](#sl-settings) turns them off. No control carries them, so the tree writes no
  `aria-keyshortcuts`. Every arrow key stays the browser's own scrolling, in the page and in any
  region that scrolls sideways. A move scrolls smoothly unless the reader asks for reduced motion;
  its scroll ends at its `scrollend`, or, in an engine that fires none, as Safari may, once the
  page has stood still for five frames, or after three seconds at most, whichever comes first.
- The tree has one layout at every width, a column of its links, and takes no `dock`: the page
  docks it. Where the page's layout has room for a side column, the page places the tree in it;
  below that width it places the tree in a drawer, as
  [spike-html-hosting-sdk](https://github.com/JaimeStill/spike-html-hosting-sdk) places it in an
  [`sl-drawer`](#sl-drawer), docked as a column at the drawer's `dock` and a modal dialog below it:
  the Contents drawer, docked from `70rem`, which the header's Contents button opens under C.
- Link text never breaks inside a word: the element sets `overflow-wrap` and `word-break` to
  `normal`, so a page's own mid-word breaking, inherited from an ancestor, stops at the tree. A
  word wider than the column overflows it, so the column's minimum width is the page's to give.
- With no script the element is undefined, so the list renders as the page's own and every link
  jumps to its section; the mark and the keys are the script's.

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
  visually hidden text; the `close` slot replaces "Close" there, for a translation. It is a
  [glyph button](#glyph-buttons), showing that name, the slot's text and the label, in its hint on
  hover and keyboard focus. The Close
  button, Escape, `close()`, `toggle()`, or `open` set false closes it, and focus returns to the
  element that held it.
- `open` and `close` go out, bubbling and composed, each time the modal drawer opens or closes,
  never on a switch between the modes or on removal. The mode is a custom state, `docked` or
  `drawer`.
- Following a link in the modal drawer leaves it open: the drawer doesn't close itself, so a page
  whose drawer holds links calls `close()` from its own script at the link's click, as the site
  shell's script below does.

A site shell holds two drawers. Its site index is in a drawer labeled "Pages", `id="pages"`,
docked from `86rem`; on the pages
[spike-html-hosting-sdk](https://github.com/JaimeStill/spike-html-hosting-sdk) copies, the
page's section tree is in a drawer labeled "Contents", `id="contents"`, docked from `70rem`,
which the SDK writes: `<sl-drawer id="contents" label="Contents" dock="70rem">` holding an
[`sl-section-tree`](#sl-section-tree) of the page's section links. Each drawer's opener is in the
header, page markup and the page's script rather than the drawer's:

- Pages, a button named "Pages" by its `aria-label`, showing Octicons' `list-unordered-16` and
  the key hint P in a `<kbd>`, bound to P by the foundation's keys module through
  `data-keys="p"`.
- Contents, a button named "Contents" by its `aria-label`, showing Octicons' `list-ordered-16`
  and the key hint C, bound to C through `data-keys="c"`.

Each opener is shown only below its drawer's `dock`, `86rem` for Pages and `70rem` for Contents,
and only once the drawer is defined; it calls its drawer's `show()` and says through
`aria-expanded` whether the drawer is open. Following a link in either drawer closes it, by the
page's script, so the link's navigation and its scroll land on the page the drawer covered.

The header is the site nav and one group of buttons at its inline end, a
`<div class="header-actions">`, which holds Pages, Contents, Help under ?, and Settings under S,
in that order. Each is a [glyph button](#glyph-buttons), showing its glyph and its key hint, named
by its `aria-label`, and showing that name in its interest hint. Help and Settings open their
[shortcut dialogs](#shortcut-dialogs), each closed by its Close or Escape. The page's markup names
each glyph by a marker, an empty `<svg data-icon="<set>/<name>">`, which
[spike-html-hosting-sdk](https://github.com/JaimeStill/spike-html-hosting-sdk) fills with the
icons module's `svg` at build: Octicons' `list-unordered-16` for Pages, `list-ordered-16` for
Contents, `question-16` for Help, `gear-16` for Settings, and `x-16` for each dialog's Close. The
SDK's `site.css` lays out the header and its `header-actions` group: one row, and below `40rem`
two, the site nav over the group. A page links the foundation's full page entry,
`page-full.css`, then this package's `glyph-button.css`, then the SDK's `site.css`, and imports
`shortcuts.js` and `settings.js` beside the elements it shows:

```html
<header>
  <sl-site-nav></sl-site-nav>
  <div class="header-actions">
    <button
      type="button"
      class="glyph-button pages-opener"
      aria-controls="pages"
      aria-haspopup="dialog"
      aria-expanded="false"
      aria-label="Pages"
      data-keys="p"
      interestfor="pages-hint"
      aria-description=""
    >
      <svg data-icon="octicon/list-unordered-16"></svg>
      <span aria-hidden="true"><kbd>P</kbd></span>
    </button>
    <div id="pages-hint" class="glyph-hint" popover="hint" aria-hidden="true">Pages</div>
    <button
      type="button"
      class="glyph-button contents-opener"
      aria-controls="contents"
      aria-haspopup="dialog"
      aria-expanded="false"
      aria-label="Contents"
      data-keys="c"
      interestfor="contents-hint"
      aria-description=""
    >
      <svg data-icon="octicon/list-ordered-16"></svg>
      <span aria-hidden="true"><kbd>C</kbd></span>
    </button>
    <div id="contents-hint" class="glyph-hint" popover="hint" aria-hidden="true">Contents</div>
    <button
      type="button"
      class="glyph-button"
      commandfor="help"
      command="show-modal"
      aria-label="Help"
      data-keys="?"
      interestfor="help-hint"
      aria-description=""
    >
      <svg data-icon="octicon/question-16"></svg>
      <span aria-hidden="true"><kbd>?</kbd></span>
    </button>
    <div id="help-hint" class="glyph-hint" popover="hint" aria-hidden="true">Help</div>
    <button
      type="button"
      class="glyph-button"
      commandfor="settings"
      command="show-modal"
      aria-label="Settings"
      data-keys="s"
      interestfor="settings-hint"
      aria-description=""
    >
      <svg data-icon="octicon/gear-16"></svg>
      <span aria-hidden="true"><kbd>S</kbd></span>
    </button>
    <div id="settings-hint" class="glyph-hint" popover="hint" aria-hidden="true">Settings</div>
  </div>
</header>
<main>…</main>
<sl-drawer id="contents" label="Contents" dock="70rem">
  <sl-section-tree>
    <ul>
      …
    </ul>
  </sl-section-tree>
</sl-drawer>
<sl-drawer id="pages" label="Pages" dock="86rem">
  <sl-site-index label="Site">
    <ul>
      …
    </ul>
  </sl-site-index>
</sl-drawer>
<dialog id="help" aria-labelledby="help-title">
  <header class="dialog-header">
    <h2 id="help-title">Keyboard shortcuts</h2>
    <button
      type="button"
      class="glyph-button"
      commandfor="help"
      command="close"
      aria-label="Close"
      interestfor="help-close-hint"
      aria-description=""
    >
      <svg data-icon="octicon/x-16"></svg>
      <span aria-hidden="true"><kbd>Esc</kbd></span>
    </button>
    <div id="help-close-hint" class="glyph-hint" popover="hint" aria-hidden="true">Close</div>
  </header>
  <sl-shortcuts></sl-shortcuts>
</dialog>
<dialog id="settings" aria-labelledby="settings-title">
  <header class="dialog-header">
    <h2 id="settings-title">Settings</h2>
    <button
      type="button"
      class="glyph-button"
      commandfor="settings"
      command="close"
      aria-label="Close"
      interestfor="settings-close-hint"
      aria-description=""
    >
      <svg data-icon="octicon/x-16"></svg>
      <span aria-hidden="true"><kbd>Esc</kbd></span>
    </button>
    <div id="settings-close-hint" class="glyph-hint" popover="hint" aria-hidden="true">Close</div>
  </header>
  <sl-settings></sl-settings>
</dialog>
```

```css
.pages-opener,
.contents-opener {
  display: none;
}
@media (width < 86rem) {
  body:has(#pages:defined) .pages-opener {
    display: inline-flex;
  }
}
@media (width < 70rem) {
  body:has(#contents:defined) .contents-opener {
    display: inline-flex;
  }
}
```

```js
for (const id of ["pages", "contents"]) {
  const drawer = document.getElementById(id);
  const opener = document.querySelector(`[aria-controls="${id}"]`);
  if (!drawer || !opener) continue;
  opener.addEventListener("click", () => drawer.show());
  const expanded = () => opener.setAttribute("aria-expanded", String(drawer.open));
  drawer.addEventListener("open", expanded);
  drawer.addEventListener("close", expanded);
  drawer.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a[href]")) drawer.close();
  });
}
```

The keys module clicks only a rendered control, so while a drawer is docked and its opener
hidden, its key is neither listed nor fired; while a drawer is open, a modal, the keys module
fires none of the page's keys, and Escape, its Close button, or a followed link closes it. A site
that docks a drawer at another width sets the drawer's `dock` and its opener's media query to the
same length. With no script the drawers are undefined, so the index and the section tree render
as the page's own and the openers stay hidden.

The page's keys are then P for Pages and C for Contents, each while its opener shows; ? for Help
and S for Settings; J and K for the next and the previous section, from
[`sl-section-tree`](#sl-section-tree); and, on the pages the SDK copies, H and L for the previous
and the next page, from the SDK's pager links.

### `sl-shortcuts`

`./shortcuts.js`: the page's keyboard shortcuts, for its Help dialog, a
[shortcut dialog](#shortcut-dialogs). It takes no attribute and slots nothing. Placed in a
`dialog`, it lists exactly the bindings that the foundation's keys module's `bindings(dialog)`
gives with that dialog closed, the ones the page has outside it, in that order:

```html
<dialog id="help" aria-labelledby="help-title">
  <h2 id="help-title">Keyboard shortcuts</h2>
  <sl-shortcuts></sl-shortcuts>
</dialog>
```

- Its shadow root holds a table of two columns, Keys and Action. A row's keys are the binding's
  sequences, each key in a `<kbd>` as the foundation's keys grammar labels it, joined by `+`,
  "then", and "or". Its action is the binding's name, its `register()` label or its element's
  name, as plain text.
- A row is no control: the list describes the shortcuts and runs none, and nothing in it takes
  focus. With the dialog's Close its only other control, the dialog puts focus on the Close as it
  opens, natively.
- A row the reader's setting turns off, character keys alone while character keys are off, shows
  the word "off" after its keys, which assistive technology reads with them, in the muted text
  tier, and carries the class `off`. Combinations with Control, Alt, or Meta stay on.
- It writes no row that `bindings()` doesn't give: the foundation's fixed Escape row, "Leave a
  field", is no binding and is left out. The dialog's own controls, such as its Close, are inside
  the dialog and so left out too.
- The foundation's screen-reader note follows the table: a screen reader may take a key first,
  and how NVDA, JAWS, Narrator, and VoiceOver pass the next key through. It is exported as `NOTE`.
- It reads the bindings again as the dialog opens, since they change with the page's state, and
  as the reader's settings change: a `change` event in the document, as a settings form sends,
  and a `storage` event, as another tab's change sends.
- It holds no settings, no character-key switch and no wait, and renders no `[data-keys-list]`,
  so the keys module never fills it and never loads its `keys-help.js`.

### `sl-settings`

`./settings.js`: the reader's settings, the theme and the keyboard, for a Settings dialog. It
takes no attribute and slots nothing. The dialog, its heading, and its Close are the page's, a
[shortcut dialog](#shortcut-dialogs):

```html
<dialog id="settings" aria-labelledby="settings-title">
  <h2 id="settings-title">Settings</h2>
  <sl-settings></sl-settings>
</dialog>
```

- Every change applies and is stored at once: there is no Save and no Cancel, and closing the
  dialog, by Escape or its Close, keeps what was chosen.
- The theme is the foundation theme menu's rows and preview card, laid out by the foundation's
  `theme-menu.css`, which the shadow root adopts after its reset, elements, meta, structure, and
  utilities sheets. A row each for color, scheme, space, and type lists the registry's names, or
  system, light, and dark, as a radio group drawn as ◀ value ▶. The arrows step the row on a
  click and, as the foundation's, are hidden from assistive technology and take no focus. On a
  row, H and L step it, J and K or the down and up arrows move between the rows, and the left
  and right arrows cycle the radios. The keys stop at the rows, so no page binding sees one.
- Each step applies the choice to the page's root and stores it through the foundation's
  `preferences.js`. The preview card, inert, shows the theme on a heading, a link, code, kbd,
  buttons, a field, and a striped table. The foundation's `theme-menu.js` is never loaded.
- The keyboard settings are the foundation's keys help settings: the character-key switch,
  "Character-key shortcuts (combinations with Control, Alt, or Meta stay on)", and the wait
  between presses, stored at once through the keys module's `changeSettings()`. With character
  keys off, every binding of character keys alone stops firing and loses its `aria-keyshortcuts`.
- Every change fires a `change` event at the element, bubbling and composed, since a control's
  own stops at the shadow root: an open shortcuts list follows it in the same tab, as it follows
  a `storage` event from another tab.
- It follows another tab's change, the theme and the keyboard settings, at its `storage` event.
  As its dialog opens it reads both again and focuses the first row, unless an element in the
  dialog has `autofocus`.

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
`test/fixtures/drawer.html` the drawer cases' page, `test/fixtures/shortcuts.html` the
shortcuts list's page of several bindings in a help dialog, `test/fixtures/settings.html` the
settings' page, a Settings dialog beside a help dialog and the bindings the settings turn off,
and `test/fixtures/sites/` holds the fixture sites served at their project sites' paths: the
architecture stand-in's, with the site nav and the site index in its Pages drawer and opener;
sqlate's, with the site nav as built, a site deployed behind; a fourth site's,
with a site nav whose `SITES` lists it too, a site deployed ahead; and the org's lists for `src`,
`sites.json` naming all four. The browser tier runs on them in the pinned chrome-headless-shell,
and `mise run screenshots` captures them through the `spike-html-apps-screenshots` bin of
[spike-html-apps-tooling](https://github.com/JaimeStill/spike-html-apps-tooling).

A push to main whose `package.json` version has no tag yet releases it: the check, then the pack
committed and tagged, and a GitHub release from `CHANGELOG.md`.

## License

[Apache License 2.0](LICENSE).
