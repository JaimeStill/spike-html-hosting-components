# Changelog

All notable changes to `@jaimestill/spike-html-hosting-components` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `sl-section-tree`, `section-tree.js`: a page's table of contents, slotting a nested list of
  links to its h2 and h3 headings. The link of the section in view carries
  `aria-current="location"`; Left and Right move to the previous and next section through the
  foundation's keys module, beside Previous and Next buttons with bracketed key hints; a CSS
  scroll timeline draws the reading progress, absent where scroll timelines aren't supported.
- The components toolchain, adapted from spike-html-apps-components (51d2b92): the tsc build
  to ES modules and declarations, ESLint with the layer's import rules, the unit tier, the
  browser tier in chrome-headless-shell 157.0.8103.38 on spike-html-apps-tooling v0.3.0, and
  `mise run screenshots`. lit 3.3.3 is the one dependency, and spike-html-apps-foundation
  `^0.3.0` a peer.
