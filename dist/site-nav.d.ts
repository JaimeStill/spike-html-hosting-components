import { LitElement, type PropertyValues } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-site-nav";
/** The aria-current value the link of the current site carries. */
export declare const CURRENT = "page";
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
export declare const SITES: readonly Readonly<Site>[];
/** The repository whose site a path is on: its first segment, as a project site is served. */
export declare function siteOf(pathname: string): string;
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
export declare class SiteNav extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        label: {
            type: StringConstructor;
        };
        src: {
            type: StringConstructor;
        };
        sites: {
            state: true;
        };
    };
    /** The nav landmark's accessible name. */
    label: string;
    /** The URL of the list of sites to fetch and list in place of SITES; none fetches nothing. */
    src: string | undefined;
    /** The sites the nav lists: SITES, or src's list once fetched. */
    private sites;
    constructor();
    protected willUpdate(changed: PropertyValues<this>): void;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-site-nav": SiteNav;
    }
}
