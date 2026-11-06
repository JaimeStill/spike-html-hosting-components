import { LitElement, type PropertyValues } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-section-tree";
/**
 * The keys that move to the previous and the next section, as the keys grammar names them: a
 * lowercase letter matches either case, as the foundation's own T binding is written.
 */
export declare const PREVIOUS_KEYS = "h";
export declare const NEXT_KEYS = "l";
/** The buttons' aria-keyshortcuts for the two bindings, as the keys module writes a letter's. */
export declare const PREVIOUS_SHORTCUT = "H";
export declare const NEXT_SHORTCUT = "L";
/** The labels the keys help dialog lists the two bindings by. */
export declare const PREVIOUS_LABEL = "Previous section";
export declare const NEXT_LABEL = "Next section";
/** The aria-current value the link of the section in view carries. */
export declare const CURRENT = "location";
/**
 * The width at which the tree is a column, and wider, by default: where one 16rem side column
 * fits beside a reading column of 80ch, 48rem in the foundation's default mono type, with a
 * --space-l gap and the body's --space-m padding either side at their widest. Below it the tree is
 * the sticky bar.
 */
export declare const DOCK = "70rem";
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
 * root holds the nav landmark, named by `label` ("Sections" by default), so the light DOM carries
 * no nav of its own. Each link whose fragment names no element on the page stays a plain link and
 * no section of the tree.
 *
 * The link of the section in view carries aria-current="location", by an IntersectionObserver on
 * the headings: the section is the last whose heading has reached the reading line, a third of
 * the way down the viewport. At the top of the page, the root scrolled to 0, no section is in
 * view, and none is before the first heading reaches the line: the top is a stop of its own, the
 * page's opening, and no link is marked there. The mark is an attribute on the light-DOM link,
 * which a shadow sheet can't reach below the slot's top level, so its look is the page's.
 *
 * H and L move to the previous and the next stop: the top of the page, then each section in tree
 * order, wrapping. L from the top goes to the first section and past the last back to the top; H
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
 * the mark follows the reading line again and the next move counts from the section in view. H
 * and L are bound by register() in the foundation's keys module, so its help dialog lists them
 * and its off switch, which covers character keys, turns them off. Every arrow key stays the
 * browser's own scrolling, in the page and in any region that scrolls sideways: the keys module
 * cancels each key a binding matches, so the element binds none. The Previous and Next buttons,
 * with the bracketed key hints [H] and [L], move the same way whatever the setting, are disabled
 * only when the tree names no section, and carry aria-keyshortcuts while the setting has the keys
 * fire. A move scrolls smoothly unless the reader asks for reduced motion; its scroll ends at its
 * scrollend or, in an engine that fires none, once the page has stood still for a few frames.
 *
 * At `dock`, a CSS length (DOCK, 70rem, by default), and wider, the tree is a column: the
 * progress, the links, and the buttons. Below it the tree is a bar stuck to the top of the
 * viewport, holding the progress and the buttons alone, its links hidden; the bar sticks within
 * the host's containing block, so the page places the element, or a wrapper of display: contents,
 * in the page's own flow, before main. While it is the bar the element sets the root's
 * scroll-padding-block-start, inline, to the bar's block size, so a heading a move or a link
 * scrolls to lands below the bar rather than under it, and puts back the root's own inline value
 * as it leaves the bar or the page. `dock` is read in a media query, `(width < <dock>)`, as
 * sl-drawer reads its own, where rem and em are the initial font size's, so a viewport of exactly
 * `dock` is a column; a length the query can't read never matches, so the tree stays a column. The
 * mode is a custom state, docked or bar, which the page may style. With no script the element is
 * undefined, so its list renders as the page's own at every width and every link still jumps.
 *
 * The reading progress is a bar the page's scroll drives through a CSS scroll timeline, with no
 * script: in an engine without scroll timelines it is absent and nothing else changes.
 */
export declare class SectionTree extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        label: {
            type: StringConstructor;
        };
        dock: {
            type: StringConstructor;
        };
        _index: {
            state: true;
        };
        _count: {
            state: true;
        };
        _keys: {
            state: true;
        };
    };
    /** The nav landmark's accessible name. */
    label: string;
    /** The width at which the tree is a column, and wider: a CSS length, read in a media query. */
    dock: string;
    /** The section in view, by its place in the tree, or TOP with none. */
    _index: number;
    /** How many sections the tree holds. */
    _count: number;
    /** Whether the reader's keys setting is on, read at each render's cue. */
    _keys: boolean;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    protected willUpdate(changed: PropertyValues<this>): void;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-section-tree": SectionTree;
    }
}
