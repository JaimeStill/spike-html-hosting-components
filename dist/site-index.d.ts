import { LitElement } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-site-index";
/** The aria-current value the link of the page on screen carries. */
export declare const CURRENT = "page";
/**
 * A site's index. Its content is light-DOM HTML, the list the element slots, so with no script the
 * list still renders and every link still goes to its page:
 *
 *   <sl-site-index label="Site">
 *     <ul>
 *       <li><a href="/spike-html-hosting-architecture/">The architecture stand-in</a></li>
 *       <li>
 *         <a href="/spike-html-hosting-architecture/principles/">Principles</a>
 *         <ul>
 *           <li><a href="/spike-html-hosting-architecture/principles/plain-web.html">Plain web</a></li>
 *         </ul>
 *       </li>
 *       <li>
 *         <span>Conventions</span>
 *         <ul>
 *           <li><a href="/spike-html-hosting-architecture/conventions/naming.html">Naming</a></li>
 *         </ul>
 *       </li>
 *     </ul>
 *   </sl-site-index>
 *
 * The list is a ul of li, one for every page of the site and every directory, nested as the
 * directories are, in the order the renderer writes them. A page is an li holding one a, its text
 * the page's title. A directory is an li holding its label then a nested ul of its entries: with
 * an index page the label is that page's a, its text the index page's title and its href the
 * directory's; with none it is a span holding the directory's name. The site's own index page is
 * an entry of the top-level list. The element's shadow root holds the nav landmark, named by
 * `label` ("Pages" by default), so the light DOM carries no nav of its own.
 *
 * The link of the page on screen carries aria-current="page": the element compares each link's
 * resolved path with location's, a directory's path and its index.html the same page, and
 * marks the first that matches, at connection and whenever the slotted list changes. It is the
 * mark's one writer: a renderer's own aria-current="page" on any other link is removed, so the
 * same list serves every page of the site. The mark is an attribute on the light-DOM link, which a
 * shadow sheet can't reach below the slot's top level, so its look is the page's.
 */
export declare class SiteIndex extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        label: {
            type: StringConstructor;
        };
    };
    /** The nav landmark's accessible name. */
    label: string;
    constructor();
    connectedCallback(): void;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-site-index": SiteIndex;
    }
}
