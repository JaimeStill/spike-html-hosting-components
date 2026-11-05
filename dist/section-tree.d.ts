import { LitElement } from "lit";
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
 * the way down the viewport, or the first before any has. The mark is an attribute on the light-DOM
 * link, which a shadow sheet can't reach below the slot's top level, so its look is the page's.
 *
 * H and L move to the previous and the next section, scrolling its heading to the top, by
 * register() in the foundation's keys module, so its help dialog lists them and its off switch,
 * which covers character keys, turns them off. Every arrow key stays the browser's own scrolling,
 * in the page and in any region that scrolls sideways: the keys module cancels each key a binding
 * matches, so the element binds none. The Previous and Next buttons, with the bracketed key hints
 * [H] and [L], move the same way whatever the setting, and carry aria-keyshortcuts while the
 * setting has the keys fire. A move scrolls smoothly unless the reader asks for reduced motion.
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
    /** The section in view, by its place in the tree, or -1 with none. */
    _index: number;
    /** How many sections the tree holds. */
    _count: number;
    /** Whether the reader's keys setting is on, read at each render's cue. */
    _keys: boolean;
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
