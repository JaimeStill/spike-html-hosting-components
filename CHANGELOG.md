# Changelog

All notable changes to `@jaimestill/spike-html-hosting-components` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-11-09

The release removes `sl-page-header` and `sl-section-tree`'s bar, buttons, and `dock`, and moves
the tree's keys from H and L to J and K: breaking changes, which a minor release carries before
1.0.0. A site that uses any of them changes its markup or its imports as the entries below say.

### Added

- `glyph-button.css`, the glyph button: the class `glyph-button` on a native `<button>` that shows
  a glyph and, when it has one, its key hint in a `<kbd>`, in a row centered on the text's line,
  with the native button's border, surface, and focus ring kept. A component adopts it into its
  shadow root after the foundation's reset and elements sheets; a page links it after the
  foundation's entry. Its padding makes the smallest glyph button 24 CSS px a side, WCAG 2.5.8's
  target size. The button shows its name on hover and keyboard focus by an interest invoker:
  `interestfor` names a `popover="hint"` of the class `glyph-hint`, `aria-hidden="true"`, whose
  text is the name, placed below the button, or above it at the viewport's foot. The button
  carries an empty `aria-description`, since Chromium makes an interest target's text its
  invoker's description and would read the name twice. Escape dismisses the hint, no script runs,
  and where `interestfor` isn't supported the hint never shows.
- `sl-shortcuts`, `shortcuts.js`: the page's keyboard shortcuts for a Help dialog, a table of each
  binding's keys, each in a `<kbd>`, and its action as plain text, no row a control, exactly as
  the foundation keys module's `bindings()` gives them with the dialog closed. A row the reader's
  setting turns off says "off" after its keys. The foundation's screen-reader note follows the
  table, wrapping to the table's width, so a dialog sized to fit its content fits the table. The
  element reads the bindings again as the dialog opens and at each settings change, a change event
  in the document or another tab's storage event. It renders no `[data-keys-list]`, so the keys
  module never loads its `keys-help.js`.
- `sl-settings`, `settings.js`: the reader's settings for a Settings dialog. The theme is the
  foundation theme menu's rows, color, scheme, space, and type, each a radio group drawn as
  ◀ value ▶, H and L stepping a row and J and K or the arrows moving between rows, beside its
  inert preview card, laid out by the foundation's `theme-menu.css`. The keyboard settings are
  the foundation keys help's character-key switch and wait between presses. Every change applies
  and is stored at once, with no Save and no Cancel, and fires a change event at the host,
  bubbling and composed, so an open shortcuts list reads it. The rows and the preview are rebuilt
  here, so the foundation's `theme-menu.js` is never loaded.
- The README's shortcut dialog pattern: a key and its opener, a glyph button, open a native modal
  dialog whose header row, a `<header class="dialog-header">`, holds its heading and a Close glyph
  button with the hint Esc, its content applying at once. Help and Settings are its two instances.

### Changed

- `sl-section-tree` is its links alone, in its `nav` landmark. The link of the section in view
  carries an accent rule at its inline start and bold text, from `section-tree-links.css`, which
  the element adopts once into the document or the shadow root it sits in, since its own shadow
  sheet can't reach the light-DOM links; every link keeps the rule's width, so the mark moves no
  text. J and K, bound by the foundation keys module's `register()`, move to the next and the
  previous section, where H and L moved to the previous and the next; the help dialog lists them
  as "Next section" and "Previous section". `NEXT_KEYS` and `PREVIOUS_KEYS` are now `"j"` and
  `"k"`.
- `sl-drawer`'s Close is a glyph button, laid out by `glyph-button.css`, and shows its name, the
  `close` slot's text and the label, in an interest hint.
- The README's site shell snippet: the header is the site nav and one group, a
  `<div class="header-actions">`, of glyph buttons, Pages under P, Contents under C, Help under ?,
  and Settings under S, each with its interest hint; Help and Settings open their shortcut
  dialogs. The page's section tree is in a Contents drawer, docked from `70rem` and opened under C
  below it. The SDK's `site.css` lays the header out in one row from `40rem` and in two below it,
  the site nav over the group. A page links the foundation's `page-full.css`, then
  `glyph-button.css`, then the SDK's `site.css`.
- eslint-plugin-import-x is at 4.18.1 and typescript-eslint at 8.72.2. `no-extraneous-dependencies`
  drops `includeInternal`, inert since import-x 4.18.0: the package's own name passes there, and
  the layer table refuses it.
- A unit case reads the screen-reader note from the installed foundation's `keys-help.js` and from
  `src/shortcuts.ts`, so a change to either wording, or a foundation pin whose note differs, fails
  the check.

### Removed

- `sl-section-tree`'s reading progress, its Previous and Next buttons, its sticky bar below `dock`,
  and the `dock` attribute, with the exports `DOCK`, `PREVIOUS_SHORTCUT`, `NEXT_SHORTCUT`,
  `PREVIOUS_NAME`, and `NEXT_NAME`. The element no longer sets the root's
  `scroll-padding-block-start`. A page places the tree in its own column and, where that doesn't
  fit, in a drawer, as the README's Contents drawer does.
- `sl-page-header`, `page-header.js` and `page-header.css`: spike-html-hosting-sdk writes a page's
  front matter as head meta.

## [0.4.0] - 2026-11-06

### Added

- The icons layer,
  [spike-html-hosting-icons](https://github.com/JaimeStill/spike-html-hosting-icons), as a peer at
  `^0.1.0`, beside the foundation: a site declares it beside the components, pinned by its tag.
  Each element imports only the glyphs it shows, one icons module apiece.

### Changed

- A site now pins the icons layer too, beside the components and the foundation: the components
  import it by package name, and it isn't on the npm registry, so a site that leaves it out fails.
  pnpm's install, which adds a missing peer from the registry by default, fails to resolve it, and
  with `autoInstallPeers` off, the build fails to resolve the import.
- `sl-section-tree`'s Previous and Next buttons show Octicons' `arrow-up-16` and `arrow-down-16`
  with their key hints H and L in a `<kbd>`, the words no longer shown. Their accessible names stay
  "Previous" and "Next", now from their `aria-label`, and the keys help dialog still lists the
  bindings as "Previous section" and "Next section".
- `sl-drawer`'s Close button shows Octicons' `x-16` alone. It is still named "Close" and the
  label, "Close Pages", by its text, which is now visually hidden, the `close` slot's replacement
  included.
- The README's site shell snippet shows each header button's glyph marker,
  `<svg data-icon="octicon/<name>">`, which spike-html-hosting-sdk fills at build:
  `list-unordered-16` for Pages, `question-16` for Help, `paintbrush-16` for Theme, and `x-16` for
  the keys help dialog's Close, each with its key hint and its name in its `aria-label`.

## [0.3.0] - 2026-11-06

### Added

- `sl-site-nav`'s `src`, optional, a URL naming a JSON list of sites every site reads in place of
  `SITES`, so a site added to it appears on every site's nav at once, where a site deployed with
  an older release listed only that release's `SITES`. The list is a non-empty array of
  `{ repository, label }`, each a non-empty string, fetched with `fetch()`. The element paints
  `SITES` first and replaces it with the fetched list once the fetch succeeds; a failed fetch, an
  error status, or a list that isn't JSON, is empty, or has a malformed entry keeps `SITES`. A
  changed `src` renders `SITES` and fetches its own list, a response for an older `src` dropped,
  and a removed one renders `SITES` again and fetches nothing. With no `src` the element is as it
  was.

## [0.2.2] - 2026-11-05

### Changed

- `sl-section-tree`'s Previous and Next buttons show their key hints H and L in a `<kbd>` alone,
  with no brackets around them, so the buttons read "Previous H" and "Next L": the `<kbd>` already
  reads as a shortcut. The site shell's Pages opener, in the README's snippet, does the same, its
  hint P in a `<kbd>` alone.

## [0.2.1] - 2026-11-05

### Fixed

- `sl-section-tree`'s H and L no longer skip a section or stall on a page of short sections. A
  move's stop is its target: marked while the page rests where the move left it, and the stop the
  next move counts from, where at the end of the move's scroll the tree dropped it for the section
  at the reading line, the next one whenever the stop was shorter than the line's distance from
  the top. Once the reader scrolls by other means, the wheel, the keyboard, a link to no listed
  section, or the scrollbar, the mark follows the reading line again and the next move counts
  from the section in view.
- `sl-section-tree` marks the section a followed link reaches, where a link to a short section,
  or one near the page's end, marked a neighbour by the reading line. A click or Enter on one of
  the tree's own links, and any change of the URL's fragment to a listed heading's id, by a link
  elsewhere on the page, a script, or the history, make that section the held stop, as an H or L
  move to it would; the link's navigation and scroll stay the browser's.
- `sl-section-tree`'s mark no longer freezes after a smooth move in an engine that fires no
  `scrollend`, as Safari may. A move's smooth scroll, or a followed link's, ends at its
  `scrollend`, or, with none, once the page has stood still for five frames, or after three
  seconds at most, whichever comes first, and settles once, where a reader's scroll after it was
  taken for the move's own and the mark stayed on the move's stop.

## [0.2.0] - 2026-11-05

### Added

- `sl-drawer`, `drawer.js`, copied with its behavior and markup contract from
  spike-html-apps-components (51d2b92): its slotted children docked in an `aside` at `dock`
  (48rem by default) and wider, and below it a modal dialog covering the viewport, closed by its
  Close button or Escape, focus returned to its opener, the children never moved. A site holds its
  site index in `<sl-drawer label="Pages">`, opened by a "Pages [P]" header button of the page's
  own, bound to P through the foundation's keys module by `data-keys="p"`, as the README shows.
- `sl-section-tree`'s `dock`, a CSS length, `70rem` by default (`DOCK`), read in the media query
  `(width < <dock>)`: below it the tree is a bar stuck to the top of the viewport holding the
  reading progress and the Previous and Next buttons alone, its links hidden, and the root's
  scroll padding set to the bar's height so a heading a move or a link scrolls to lands below it.
  The mode is a custom state, `docked` or `bar`.

### Changed

- `sl-section-tree`'s H and L cycle through the page's top and its sections, wrapping: L from the
  top goes to the first section and past the last back to the top, H from the top to the last
  section and from the first to the top. At the top no link is marked `aria-current`, where the
  first section's was before, and the Previous and Next buttons are disabled only when the tree
  names no section.
- `sl-section-tree`, `sl-site-index`, and `sl-site-nav` never break link text inside a word: each
  sets `overflow-wrap` and `word-break` to `normal`, where the tree and the index broke a long
  link anywhere.

## [0.1.0] - 2026-11-05

### Added

- `sl-page-header`, `page-header.js`: a page's front matter, slotting a `dl` of its keys and
  values in source order, laid out as terms beside their values; an empty or absent `dl` renders
  nothing.
- `sl-site-index`, `site-index.js`: every page of the current site, slotting a nested list by
  directory, each directory labeled by its index page's link or by a `span` of its name. The link
  of the page on screen carries `aria-current="page"`, the element its one writer.
- `sl-site-nav`, `site-nav.js`: the sites this release lists, built into the element as `SITES`
  (the org stand-in, the architecture stand-in, and sqlate), each linked root-relative at
  `/<repository>/`; the site whose repository is the path's first segment carries
  `aria-current="page"`. A change to the list is a release of the components.
- `sl-section-tree`, `section-tree.js`: a page's table of contents, slotting a nested list of
  links to its h2 and h3 headings. The link of the section in view carries
  `aria-current="location"`; H and L move to the previous and next section through the
  foundation's keys module, beside Previous and Next buttons with the bracketed key hints [H] and
  [L], while every arrow key stays the browser's scrolling; a CSS scroll timeline draws the
  reading progress, absent where scroll timelines aren't supported.
- The components toolchain, adapted from spike-html-apps-components (51d2b92): the tsc build
  to ES modules and declarations, ESLint with the layer's import rules, the unit tier, the
  browser tier in chrome-headless-shell 157.0.8103.38 on spike-html-apps-tooling v0.3.0, and
  `mise run screenshots`. lit 3.3.3 is the one dependency, and spike-html-apps-foundation
  `^0.3.0` a peer.
