# Changelog

All notable changes to `@jaimestill/spike-html-hosting-components` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
