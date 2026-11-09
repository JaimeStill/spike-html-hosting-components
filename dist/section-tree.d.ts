import { LitElement } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-section-tree";
/**
 * The keys that move to the next and the previous section, as the keys grammar names them: a
 * lowercase letter matches either case, as the foundation's own T binding is written.
 */
export declare const NEXT_KEYS = "j";
export declare const PREVIOUS_KEYS = "k";
/** The labels the keys help dialog lists the two bindings by. */
export declare const NEXT_LABEL = "Next section";
export declare const PREVIOUS_LABEL = "Previous section";
/** The aria-current value the link of the section in view carries. */
export declare const CURRENT = "location";
/**
 * A page's section tree. Its content is light-DOM HTML, the list the element slots, so with no
 * script the list still renders and every link still jumps to its section:
 *
 *   <sl-section-tree label="On this page">
 *     <ul>
 *       <li><a href="#install">Install</a>
 *         <ul>
 *           <li><a href="#from-a-tag">From a tag</a></li>
 *         </ul>
 *       </li>
 *       <li><a href="#use">Use</a></li>
 *     </ul>
 *   </sl-section-tree>
 *
 * The list is a ul or an ol of li, each holding one a whose href is "#" and the id of an h2 on the
 * page, GitHub's heading id, with a nested ul or ol for the h3s under it. The element's shadow
 * root holds the nav landmark, named by `label` ("Sections" by default), around the slot and
 * nothing else, so the light DOM carries no nav of its own and the tree is its links alone. Each
 * link whose fragment names no element on the page stays a plain link and no section of the tree.
 *
 * The link of the section in view carries aria-current="location", by an IntersectionObserver on
 * the headings: the section is the last whose heading has reached the reading line, a third of
 * the way down the viewport. At the top of the page, the root scrolled to 0, no section is in
 * view, and none is before the first heading reaches the line: the top is a stop of its own, the
 * page's opening, and no link is marked there. The mark is an attribute on the light-DOM link,
 * which a shadow sheet can't reach below the slot's top level, so the element adopts
 * section-tree-links.css into the document, or the shadow root it sits in, once, as it connects:
 * every link of a tree a block with an inline-start rule, transparent, and the current one's rule
 * the accent color and its text bold, so the mark moves no text.
 *
 * J and K move to the next and the previous stop: the top of the page, then each section in tree
 * order, wrapping. J from the top goes to the first section and past the last back to the top; K
 * from the top goes to the last section and from the first to the top. A move to a section
 * scrolls its heading to the top of the viewport, and one to the top scrolls the root to 0. The
 * stop a move reaches is its target: marked while the page rests where the move left it, whatever
 * the reading line would mark there, as at a section shorter than the line's distance from the
 * top or one the page can't scroll to the line, and the stop the next move counts from. A link
 * followed to a section the tree lists reaches it as a move would: one of the tree's own, clicked
 * or entered, and any change of the URL's fragment to a listed heading's id, by a link elsewhere
 * on the page, a script, or the history, make that section the held stop, while the link's
 * navigation and its scroll, to the :target's scroll margin, stay the browser's. A page loaded
 * with a fragment holds no stop: its section in view is the reading line's. Once the reader
 * scrolls by other means, the wheel, the keyboard, a link to no listed section, or the scrollbar,
 * the mark follows the reading line again and the next move counts from the section in view. J
 * and K are bound by register() in the foundation's keys module, so its help dialog lists them,
 * as "Next section" and "Previous section", and its off switch, which covers character keys,
 * turns them off. No control carries them, so no aria-keyshortcuts follows the setting. Every
 * arrow key stays the browser's own scrolling, in the page and in any region that scrolls
 * sideways: the keys module cancels each key a binding matches, so the element binds none. A move
 * scrolls smoothly unless the reader asks for reduced motion; its scroll ends at its scrollend
 * or, in an engine that fires none, once the page has stood still for a few frames.
 *
 * The element has one layout at every width, the column of its links: where the page's layout
 * has no room for the column, the page places the element in a drawer, as spike-html-hosting-sdk
 * places it in an sl-drawer. With no script the element is undefined, so its list renders as the
 * page's own and every link still jumps.
 */
export declare class SectionTree extends LitElement {
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
    disconnectedCallback(): void;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-section-tree": SectionTree;
    }
}
