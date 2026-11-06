// What the components serve to a browser: the repository root, whose test/fixtures/ pages load the
// built dist/, the packages the pages' import maps name under /deps/, and the fixture sites, each
// under its own base on the one origin, their lists of sites among them, and the site nav's
// module as a release ahead of the build would ship it. The browser tier and the screenshots
// description both serve it through spike-html-apps-tooling's serve, so the list is kept here
// once.
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

/** The content type of each extension a fixture site serves; any other is a 404. */
const types: Record<string, string> = {
  ".html": "text/html",
  ".json": "application/json",
};

/** The path of the module a site deployed ahead of the build loads: the built one, ?ahead. */
export const AHEAD_MODULE = "/dist/site-nav.js?ahead";

/** The site a release ahead of the build adds to the site nav's list, last. */
export const FOURTH = { repository: "spike-html-hosting-fourth", label: "Fourth" };

/** The built module's last listed site, as tsc emits it, which the release ahead follows. */
const LAST = `Object.freeze({ repository: "spike-html-hosting-sqlate", label: "sqlate" }),`;

/**
 * The built site nav as a release ahead of it ships: its SITES with FOURTH added, made from
 * dist/site-nav.js as it is at the request, written to no file. Throws, and the server fails the
 * response, when the built module no longer lists LAST as it did.
 */
async function ahead(): Promise<string> {
  const built = await readFile(join(root, "dist/site-nav.js"), "utf8");
  if (!built.includes(LAST)) throw new Error(`dist/site-nav.js no longer lists ${LAST}`);
  const fields = Object.entries(FOURTH).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return built.replace(LAST, `${LAST}\n    Object.freeze({ ${fields.join(", ")} }),`);
}

/** The path and query of every .json request the server has had, in order, until cleared. */
export const requested: string[] = [];

/** Held lists: each path the server holds a .json request for, to its release. */
const held = new Map<string, Promise<void>>();

/**
 * Holds every request for the .json file at the path, its response unsent, until the returned
 * release is called; a request that comes after the release is answered at once.
 */
export function hold(path: string): () => void {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  held.set(path, released);
  return () => {
    held.delete(path);
    release();
  };
}

/**
 * Claims a request for the module AHEAD_MODULE names, answering with ahead()'s; and a request
 * whose path's first segment names a fixture site, answering with the site's .html or .json file
 * at the rest of the path, a directory's index.html for a path ending in "/", or a 404. A .json
 * request is recorded in requested, waits while its path is held, and with a status query, as
 * ?status=500, is answered with that status, the file still its body. Passes on every other
 * request. A site's pages load their modules and sheets from /deps/ and /dist/, which the server's
 * own routes answer.
 */
export const handler: Handler = async (request, response) => {
  let url: URL;
  let path: string;
  try {
    url = new URL(request.url ?? "/", "http://localhost");
    path = normalize(decodeURIComponent(url.pathname));
  } catch {
    return false;
  }
  if (`${url.pathname}${url.search}` === AHEAD_MODULE) {
    const body = await ahead();
    response
      .writeHead(200, { "content-type": "text/javascript", "cache-control": "no-store" })
      .end(body);
    return true;
  }
  if (extname(path) === ".json") requested.push(`${url.pathname}${url.search}`);
  const [, site] = path.split("/");
  if (site === undefined || site === "" || !existsSync(join(sites, site))) return false;
  if (!statSync(join(sites, site)).isDirectory()) return false;
  const file = join(sites, path.endsWith("/") ? `${path}index.html` : path);
  const type = types[extname(file)];
  const list = extname(file) === ".json";
  if (list) await held.get(path);
  const body = type === undefined ? undefined : await readFile(file).catch(() => undefined);
  if (body === undefined) response.writeHead(404).end();
  else {
    // A list's status query answers with that status, the list still its body.
    const status = list ? Number(url.searchParams.get("status") ?? 200) : 200;
    response.writeHead(status, { "content-type": type, "cache-control": "no-store" }).end(body);
  }
  return true;
};

/** The serve options for the repository: the root, its deps, and the fixture sites. */
export const served: ServeOptions = { root, deps, handler };
