// The components' sheets space by the foundation's scale alone: every length in a src/*.css is a
// --space-* step, read with var(), so no sheet writes a number with a unit, a percentage among
// them, outside a comment.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

const src = join(import.meta.dirname, "../../src");

/** A number with a unit or a percent sign, not part of a name such as --space-2xs. */
const LENGTH = /(?<![\w-])[+-]?(?:\d+\.?\d*|\.\d+)(?:%|[a-z]+)/gi;

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
    test(`${name} writes every length as a --space-* step`, () => {
      const css = readFileSync(join(src, name), "utf8");
      const found = values(css).flatMap((value) => value.match(LENGTH) ?? []);
      assert.deepEqual(found, []);
      const steps = values(css).flatMap((value) => value.match(/var\(--[\w-]+/g) ?? []);
      const lengths = steps.filter((step) => /^var\(--(space|line|radius)-/.test(step));
      assert.ok(
        lengths.every((step) => step.startsWith("var(--space-")),
        `lengths ${lengths.join(", ")}`,
      );
    });
  }
});
