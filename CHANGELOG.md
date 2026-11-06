# Changelog

All notable changes to `@jaimestill/spike-html-hosting-components` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-11-06

### Added

- The icons layer,
  [spike-html-hosting-icons](https://github.com/JaimeStill/spike-html-hosting-icons), as a peer at
  `^0.1.0`, beside the foundation: a site declares it beside the components, pinned by its tag.
  Each element imports only the glyphs it shows, one icons module apiece.

### Changed

- A site now pins the icons layer too, beside the components and the foundation: the components
  import it by package name, so a site that installs v0.4.0 without it fails to build.
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
