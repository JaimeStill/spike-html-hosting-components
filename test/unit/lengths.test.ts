// The components' sheets space by the foundation's scale alone: every length in a src/*.css is a
// --space-* step, read with var(), so no sheet writes a number with a unit, a percentage among
// them, outside a comment. One sheet keeps more, by provenance: drawer.css, copied from
// spike-html-apps-components (51d2b92) with its behavior, keeps the viewport cover, the slide and
// its timing, the visually hidden label, and the foundation's line and radius tokens for its
// frame, none of them a space between things; the case holds it to exactly those, so a length
// added or changed there fails as anywhere else.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

const src = join(import.meta.dirname, "../../src");

/** A number with a unit or a percent sign, not part of a name such as --space-2xs. */
const LENGTH = /(?<![\w-])[+-]?(?:\d+\.?\d*|\.\d+)(?:%|[a-z]+)/gi;

/** The lengths and the non-space tokens a provenance-copied sheet keeps, in source order. */
const KEPT: Record<string, { lengths: string[]; tokens: string[] }> = {
  "drawer.css": {
    // The slide's edge, the aside's and the dialog's full boxes, the label's hidden box and clip,
    // and the slide's timing.
    lengths: [
      "-100%",
      "100%",
      "100%",
      "100%",
      "100dvh",
      "1px",
      "1px",
      "50%",
      "200ms",
      "200ms",
      "200ms",
    ],
    // The aside's frame and the header's rule.
    tokens: ["var(--line-s", "var(--radius-md", "var(--line-s"],
  },
};

/** The sheet's declarations' values, its comments removed. */
function values(css: string): string[] {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...code.matchAll(/[\w-]+\s*:\s*([^;{}]+);/g)].map(([, value]) => value.trim());
}

describe("component lengths", () => {
  const sheets = readdirSync(src).filter((name) => name.endsWith(".css"));

  test("src/ holds the components' sheets", () => {
    assert.ok(sheets.length > 0);
  });

  for (const name of sheets) {
    const title = KEPT[name]
      ? `${name} writes every space as a --space-* step, and keeps only its provenance's other lengths`
      : `${name} writes every length as a --space-* step`;
    test(title, () => {
      const css = readFileSync(join(src, name), "utf8");
      const kept = KEPT[name] ?? { lengths: [], tokens: [] };
      const found = values(css).flatMap((value) => value.match(LENGTH) ?? []);
      assert.deepEqual(found, kept.lengths);
      const steps = values(css).flatMap((value) => value.match(/var\(--[\w-]+/g) ?? []);
      const lengths = steps.filter((step) => /^var\(--(space|line|radius)-/.test(step));
      assert.deepEqual(
        lengths.filter((step) => !step.startsWith("var(--space-")),
        kept.tokens,
        `lengths ${lengths.join(", ")}`,
      );
    });
  }
});
