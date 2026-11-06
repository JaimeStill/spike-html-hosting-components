// The site nav, Lit with a shadow root on the foundation's reset and elements sheets: the sites
// this release of the components lists, or the list its src names once fetched, each linked at its
// root, the current one marked.

import { html, LitElement, nothing, type PropertyDeclarations, type PropertyValues } from "lit";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./site-nav.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-site-nav";

/** The aria-current value the link of the current site carries. */
export const CURRENT = "page";

/** A site the nav lists: its repository, whose Pages site it is, and the link's text. */
export interface Site {
  repository: string;
  label: string;
}

/**
 * The sites, in the order the nav lists them: the one list, and a change to it is a release of
 * the components. Each is a GitHub Pages project site of the same owner, served at /<repository>/
 * on one origin, so each link is root-relative and every site shares the origin's storage, the
 * reader's theme among it.
 */
export const SITES: readonly Readonly<Site>[] = Object.freeze([
  Object.freeze({ repository: "spike-html-hosting", label: "Org" }),
  Object.freeze({ repository: "spike-html-hosting-architecture", label: "Architecture" }),
  Object.freeze({ repository: "spike-html-hosting-sqlate", label: "sqlate" }),
]);

/** The repository whose site a path is on: its first segment, as a project site is served. */
export function siteOf(pathname: string): string {
  return pathname.split("/")[1] ?? "";
}

/** A string with at least one character. */
const filled = (value: unknown): value is string => typeof value === "string" && value !== "";

/**
 * The list a fetched body holds, frozen as SITES is, or undefined when it is malformed: anything
 * but a non-empty array whose every entry is an object with a non-empty string repository and
 * label. An entry's other properties are dropped.
 */
function sitesOf(body: unknown): readonly Readonly<Site>[] | undefined {
  if (!Array.isArray(body) || body.length === 0) return undefined;
  const sites: Readonly<Site>[] = [];
  for (const entry of body as unknown[]) {
    if (typeof entry !== "object" || entry === null) return undefined;
    const { repository, label } = entry as Record<string, unknown>;
    if (!filled(repository) || !filled(label)) return undefined;
    sites.push(Object.freeze({ repository, label }));
  }
  return Object.freeze(sites);
}

/**
 * The nav between the sites. It takes no content: the list is SITES, built into the element, so
 * every site's nav lists the same sites from one place, and the element renders its links in its
 * shadow root:
 *
 *   <sl-site-nav label="Sites"></sl-site-nav>
 *
 * A site deployed with an older release lists that release's SITES until it is rebuilt. `src`, a
 * URL, names one list every site reads instead, so a site added to it appears on every site at
 * once:
 *
 *   <sl-site-nav src="/spike-html-hosting/sites.json"></sl-site-nav>
 *
 * The list is JSON, a non-empty array of Site objects in the order the nav lists them, each with
 * a non-empty string repository and label. The element fetches it with the browser's fetch() and
 * renders SITES until the fetch succeeds, so the first paint never waits on the network, then
 * renders the fetched list in its place. A failed fetch, an error status, or a malformed list
 * leaves SITES in place. A changed src renders SITES and fetches its own list, a response for an
 * older src dropped; a removed src renders SITES again. With no src the element fetches nothing.
 *
 * The shadow root holds the nav landmark, named by `label` ("Sites" by default), around a list of
 * one link per site, its href /<repository>/. The current site's link carries aria-current="page":
 * the site whose repository is location.pathname's first segment, the project site's base, read
 * at each render, so every page of a site marks it, its nested pages too. A path whose first
 * segment names no listed site marks none.
 *
 * With no script the element is empty and renders nothing, so a page never depends on it to be
 * read: each site's own pages stay reachable from its index.
 */
export class SiteNav extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    label: { type: String },
    src: { type: String },
    sites: { state: true },
  } satisfies PropertyDeclarations;

  /** The nav landmark's accessible name. */
  declare label: string;

  /** The URL of the list of sites to fetch and list in place of SITES; none fetches nothing. */
  declare src: string | undefined;

  /** The sites the nav lists: SITES, or src's list once fetched. */
  declare private sites: readonly Readonly<Site>[];

  /** Aborts the fetch of the current src's list, so a response for an older src is dropped. */
  #fetching: AbortController | undefined;

  constructor() {
    super();
    this.label = "Sites";
    this.sites = SITES;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has("src")) return;
    this.#fetching?.abort();
    this.#fetching = undefined;
    this.sites = SITES;
    if (this.src) void this.#fetch(this.src);
  }

  /** Fetches the list at the URL and lists it, unless it fails, is malformed, or is aborted. */
  async #fetch(src: string): Promise<void> {
    const fetching = (this.#fetching = new AbortController());
    let sites: readonly Readonly<Site>[] | undefined;
    try {
      const response = await fetch(src, { signal: fetching.signal });
      if (response.ok) sites = sitesOf(await response.json());
    } catch {
      // A failed fetch, an aborted one, or a body that isn't JSON leaves the list as it is.
    }
    if (sites !== undefined && !fetching.signal.aborted) this.sites = sites;
  }

  render() {
    const current = siteOf(location.pathname);
    return html`
      <nav aria-label=${this.label}>
        <ul>
          ${this.sites.map(
            ({ repository, label }) =>
              html`<li>
                <a
                  href="/${repository}/"
                  aria-current=${repository === current ? CURRENT : nothing}
                  >${label}</a
                >
              </li>`,
          )}
        </ul>
      </nav>
    `;
  }
}

define(tagName, SiteNav);

declare global {
  interface HTMLElementTagNameMap {
    "sl-site-nav": SiteNav;
  }
}
