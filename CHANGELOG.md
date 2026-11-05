# Changelog

All notable changes to `@jaimestill/spike-html-hosting-components` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
