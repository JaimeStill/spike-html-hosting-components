// The site nav, Lit with a shadow root on the foundation's reset and elements sheets: the sites
// this release of the components lists, each linked at its root, the current one marked.
import { html, LitElement, nothing } from "lit";
import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./site-nav.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-site-nav";
/** The aria-current value the link of the current site carries. */
export const CURRENT = "page";
/**
 * The sites, in the order the nav lists them: the one list, and a change to it is a release of
 * the components. Each is a GitHub Pages project site of the same owner, served at /<repository>/
 * on one origin, so each link is root-relative and every site shares the origin's storage, the
 * reader's theme among it.
 */
export const SITES = Object.freeze([
    Object.freeze({ repository: "spike-html-hosting", label: "Org" }),
    Object.freeze({ repository: "spike-html-hosting-architecture", label: "Architecture" }),
    Object.freeze({ repository: "spike-html-hosting-sqlate", label: "sqlate" }),
]);
/** The repository whose site a path is on: its first segment, as a project site is served. */
export function siteOf(pathname) {
    return pathname.split("/")[1] ?? "";
}
/**
 * The nav between the sites. It takes no content: the list is SITES, built into the element, so
 * every site's nav lists the same sites from one place, and the element renders its links in its
 * shadow root:
 *
 *   <sl-site-nav label="Sites"></sl-site-nav>
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
    };
    constructor() {
        super();
        this.label = "Sites";
    }
    render() {
        const current = siteOf(location.pathname);
        return html `
      <nav aria-label=${this.label}>
        <ul>
          ${SITES.map(({ repository, label }) => html `<li>
                <a
                  href="/${repository}/"
                  aria-current=${repository === current ? CURRENT : nothing}
                  >${label}</a
                >
              </li>`)}
        </ul>
      </nav>
    `;
    }
}
define(tagName, SiteNav);
