// What the components serve to a browser: the repository root, whose test/fixtures/ pages load the
// built dist/, the packages the pages' import maps name under /deps/, and the fixture sites, each
// under its own base on the one origin. The browser tier and the screenshots description both
// serve it through spike-html-apps-tooling's serve, so the list is kept here once.
// Adapted from spike-html-apps-components (51d2b92): test/browser/support/served.ts, without
// marked and the demo, with the fixture sites' handler.

import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

import type { Handler, ServeOptions } from "@jaimestill/spike-html-apps-tooling/server.js";

/** The repository root, the served tree. */
export const root = join(import.meta.dirname, "../../..");

/**
 * The packages served under /deps/: lit, whose own dependencies (lit-html, lit-element, and
 * @lit/reactive-element) pnpm installs beside it in its store and the server brings with it; and
 * the foundation, the install the components' dist/ imports by name, reached as a consumer
 * reaches it.
 */
export const deps = ["lit", "@jaimestill/spike-html-apps-foundation"];

/**
 * The fixture sites' directory: each directory in it is a site, served at /<directory>/ as GitHub
 * Pages serves a project site at /<repository>/, so two sites share one origin and its storage.
 */
export const sites = join(root, "test/fixtures/sites");

/**
 * Claims a request whose path's first segment names a fixture site, answering with the site's
 * .html file at the rest of the path, a directory's index.html for a path ending in "/", or a 404;
 * passes on every other request. A site's pages load their modules and sheets from /deps/ and
 * /dist/, which the server's own routes answer.
 */
export const handler: Handler = async (request, response) => {
  let path: string;
  try {
    path = normalize(decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname));
  } catch {
    return false;
  }
  const [, site] = path.split("/");
  if (site === undefined || site === "" || !existsSync(join(sites, site))) return false;
  if (!statSync(join(sites, site)).isDirectory()) return false;
  const file = join(sites, path.endsWith("/") ? `${path}index.html` : path);
  const body = extname(file) === ".html" ? await readFile(file).catch(() => undefined) : undefined;
  if (body === undefined) response.writeHead(404).end();
  else
    response.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" }).end(body);
  return true;
};

/** The serve options for the repository: the root, its deps, and the fixture sites. */
export const served: ServeOptions = { root, deps, handler };
