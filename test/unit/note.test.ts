// The element's screen-reader note is the foundation's keys help note word for word. The element
// never loads the keys help module, so nothing at run time would show the two apart: the case reads
// both from source, the installed foundation's built keys-help.js as package.json pins it, and
// src/shortcuts.ts, so a change to either wording, or a foundation pin whose note differs, fails.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { KEYS_HELP, noteIn, SHORTCUTS } from "./note.ts";

describe("shortcuts note", () => {
  test("the foundation's keys help declares a screen-reader note", () => {
    assert.match(noteIn(KEYS_HELP), /^Screen readers: /);
  });

  test("src/shortcuts.ts's NOTE is the foundation's keys help note, word for word", () => {
    assert.equal(noteIn(SHORTCUTS), noteIn(KEYS_HELP));
  });
});
