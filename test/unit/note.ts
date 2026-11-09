// The screen-reader note a module declares, read from its source as text and never run: the
// top-level const NOTE, parsed by TypeScript's own parser, its initializer string literals joined
// by +, as the foundation's built keys help and src/shortcuts.ts both write it. Any other
// initializer throws, so a note built some other way fails the reading rather than passing.
// test/unit/note.test.ts runs it on both; the browser tier reads the element's from src/ with it.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import ts from "typescript";

/** The source file of the installed foundation's keys help module, as its exports resolve it. */
export const KEYS_HELP = fileURLToPath(
  import.meta.resolve("@jaimestill/spike-html-apps-foundation/keys-help.js"),
);

/** This repository's shortcuts element source. */
export const SHORTCUTS = fileURLToPath(new URL("../../src/shortcuts.ts", import.meta.url));

/** The string an expression of string literals joined by + spells. */
function spell(node: ts.Expression): string {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return spell(node.expression);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return spell(node.left) + spell(node.right);
  }
  throw new Error(`NOTE is not string literals joined by +: ${ts.SyntaxKind[node.kind]}`);
}

/** The value of the top-level const NOTE in the file at `path`. */
export function noteIn(path: string): string {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest);
  const found = source.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .filter((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "NOTE");
  if (found.length !== 1 || !found[0]?.initializer) {
    throw new Error(`${path} declares ${found.length} top-level NOTE with a value, not one`);
  }
  return spell(found[0].initializer);
}
