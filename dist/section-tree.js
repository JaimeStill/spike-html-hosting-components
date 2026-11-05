// The section tree, Lit with a shadow root on the foundation's reset and elements sheets: a page's
// table of contents, its links slotted from the light DOM, the section in view marked, H and L
// bound through the foundation's keys module and cycling through the page's top and its sections,
// and the reading progress a CSS scroll timeline draws. Below `dock` it is a sticky bar of the
// progress and the moves alone, its links hidden.
import { html, LitElement, nothing } from "lit";
import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { register, settings } from "@jaimestill/spike-html-apps-foundation/keys.js";
import styles from "./section-tree.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-section-tree";
/**
 * The keys that move to the previous and the next section, as the keys grammar names them: a
 * lowercase letter matches either case, as the foundation's own T binding is written.
 */
export const PREVIOUS_KEYS = "h";
export const NEXT_KEYS = "l";
/** The buttons' aria-keyshortcuts for the two bindings, as the keys module writes a letter's. */
export const PREVIOUS_SHORTCUT = "H";
export const NEXT_SHORTCUT = "L";
/** The labels the keys help dialog lists the two bindings by. */
export const PREVIOUS_LABEL = "Previous section";
export const NEXT_LABEL = "Next section";
/** The aria-current value the link of the section in view carries. */
export const CURRENT = "location";
/**
 * The width at which the tree is a column, and wider, by default: where one 16rem side column
 * fits beside a reading column of 80ch, 48rem in the foundation's default mono type, with a
 * --space-l gap and the body's --space-m padding either side at their widest. Below it the tree is
 * the sticky bar.
 */
export const DOCK = "70rem";
/** The place of the page's top among the moves' stops, before the first section. */
const TOP = -1;
/**
 * The reading line, as a fraction of the viewport's height from its top: the section in view is
 * the last whose heading has reached it. The observer's root is cut to the band above the line, so
 * a heading crossing the line, or the viewport's top, calls it.
 */
const LINE = 0.34;
/** The id a "#" href names: its fragment, percent-decoded, or as written when it decodes to none. */
function fragment(href) {
    try {
        return decodeURIComponent(href.slice(1));
    }
    catch {
        return href.slice(1);
    }
}
/** Whether the reader asks for reduced motion: then no section move scrolls smoothly. */
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
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
 * scrolls its heading to the top of the viewport, and one to the top scrolls the root to 0. They
 * are bound by register() in the foundation's keys module, so its help dialog lists them and its
 * off switch, which covers character keys, turns them off. Every arrow key stays the browser's
 * own scrolling, in the page and in any region that scrolls sideways: the keys module cancels each
 * key a binding matches, so the element binds none. The Previous and Next buttons, with the
 * bracketed key hints [H] and [L], move the same way whatever the setting, are disabled only when
 * the tree names no section, and carry aria-keyshortcuts while the setting has the keys fire. A
 * move scrolls smoothly unless the reader asks for reduced motion.
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
export class SectionTree extends LitElement {
    static styles = [reset, elements, styles];
    static properties = {
        label: { type: String },
        dock: { type: String },
        _index: { state: true },
        _count: { state: true },
        _keys: { state: true },
    };
    #sections = [];
    #observer = null;
    #unregister = [];
    /**
     * The section a move scrolled to, held as the one in view until the next scroll ends: the
     * observer's calls during a smooth scroll leave it, and a heading the page can't scroll to the
     * line, near its end, stays marked while it is on screen.
     */
    #pinned = null;
    // The mode is a custom state, docked or bar, which the page may style.
    #internals = this.attachInternals();
    #query = null;
    // Whether the tree is the bar: null until the element is connected, and again once removed.
    #bar = null;
    // The root's own inline scroll-padding-block-start, put back as the tree leaves the bar.
    #padding = "";
    // Keeps the root's scroll padding at the bar's block size as the bar's size changes.
    #resized = new ResizeObserver(() => this.#pad());
    constructor() {
        super();
        this.label = "Sections";
        this.dock = DOCK;
        this._index = TOP;
        this._count = 0;
        this._keys = true;
    }
    connectedCallback() {
        super.connectedCallback();
        this.#unregister = [
            register(PREVIOUS_KEYS, PREVIOUS_LABEL, () => this.#move(-1)),
            register(NEXT_KEYS, NEXT_LABEL, () => this.#move(1)),
        ];
        document.addEventListener("scrollend", this.#settle);
        // aria-keyshortcuts follows the keys setting. The keys module keeps it current on data-keys
        // elements alone, which it finds in the document and never in a shadow root, so the element
        // reads the setting as it changes: in the help dialog's form, whose own listener sits below
        // the document and so runs first, or in another tab.
        document.addEventListener("change", this.#refresh);
        addEventListener("storage", this.#refresh);
        this.#refresh();
        this.#collect();
        this.#watch();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        for (const unregister of this.#unregister)
            unregister();
        this.#unregister = [];
        document.removeEventListener("scrollend", this.#settle);
        document.removeEventListener("change", this.#refresh);
        removeEventListener("storage", this.#refresh);
        this.#observer?.disconnect();
        this.#observer = null;
        this.#query?.removeEventListener("change", this.#change);
        this.#query = null;
        if (this.#bar)
            this.#unpad();
        this.#bar = null;
    }
    willUpdate(changed) {
        if (changed.has("dock") && this.#query)
            this.#watch();
    }
    render() {
        const hint = (key) => html `<span class="hint" aria-hidden="true">[<kbd>${key}</kbd>]</span>`;
        // aria-keyshortcuts declares a key only while the reader's setting has it fire.
        const shortcut = (keys) => (this._keys ? keys : nothing);
        return html `
      <nav aria-label=${this.label}>
        <div class="progress" part="progress" aria-hidden="true"><div class="bar"></div></div>
        <slot @slotchange=${this.#collect}></slot>
        <div class="moves">
          <button
            type="button"
            class="previous"
            aria-keyshortcuts=${shortcut(PREVIOUS_SHORTCUT)}
            ?disabled=${this._count === 0}
            @click=${() => this.#move(-1)}
          >
            Previous ${hint(PREVIOUS_SHORTCUT)}
          </button>
          <button
            type="button"
            class="next"
            aria-keyshortcuts=${shortcut(NEXT_SHORTCUT)}
            ?disabled=${this._count === 0}
            @click=${() => this.#move(1)}
          >
            Next ${hint(NEXT_SHORTCUT)}
          </button>
        </div>
      </nav>
    `;
    }
    /** Reads the mode from a new query on `dock`, listening for its changes. */
    #watch() {
        this.#query?.removeEventListener("change", this.#change);
        this.#query = matchMedia(`(width < ${this.dock})`);
        this.#query.addEventListener("change", this.#change);
        this.#change();
    }
    /** Sets the mode from the query: the custom state, and the root's scroll padding for the bar. */
    #change = () => {
        const bar = this.#query?.matches ?? false;
        if (bar === this.#bar)
            return;
        const { states } = this.#internals;
        states.delete(bar ? "docked" : "bar");
        states.add(bar ? "bar" : "docked");
        if (bar) {
            this.#padding = document.documentElement.style.scrollPaddingBlockStart;
            this.#resized.observe(this);
            this.#pad();
        }
        else if (this.#bar) {
            this.#unpad();
        }
        this.#bar = bar;
    };
    /** The root's scroll padding at the bar's block size, so the bar covers no heading scrolled to. */
    #pad() {
        const { height } = this.getBoundingClientRect();
        document.documentElement.style.scrollPaddingBlockStart = `${Math.ceil(height)}px`;
    }
    /** The root's own scroll padding put back, and the bar's size no longer followed. */
    #unpad() {
        this.#resized.disconnect();
        document.documentElement.style.scrollPaddingBlockStart = this.#padding;
    }
    /** Reads the reader's keys setting again. */
    #refresh = () => {
        this._keys = settings().enabled;
    };
    /** The sections the slotted links name, in tree order, and the observer on their headings. */
    #collect = () => {
        const sections = [];
        for (const link of this.querySelectorAll('a[href^="#"]')) {
            const id = fragment(link.getAttribute("href"));
            const heading = id === "" ? null : document.getElementById(id);
            if (heading)
                sections.push({ link, heading });
        }
        this.#sections = sections;
        this._count = sections.length;
        this.#pinned = null;
        this.#observer?.disconnect();
        this.#observer = new IntersectionObserver(this.#follow, {
            rootMargin: `0px 0px ${-Math.round((1 - LINE) * 100)}% 0px`,
        });
        for (const { heading } of sections)
            this.#observer.observe(heading);
        this.#mark(this.#atLine());
    };
    /**
     * The last section whose heading has reached the reading line; TOP at the page's top, the root
     * scrolled to 0, and before any heading has reached it.
     */
    #atLine() {
        if (this.#sections.length === 0 || document.documentElement.scrollTop < 1)
            return TOP;
        const line = innerHeight * LINE;
        let index = TOP;
        this.#sections.forEach(({ heading }, i) => {
            if (heading.getBoundingClientRect().top <= line + 1)
                index = i;
        });
        return index;
    }
    /** The observer's call: the section in view follows the scroll, unless a move holds one. */
    #follow = () => {
        if (this.#pinned === null)
            this.#mark(this.#atLine());
    };
    /**
     * A scroll's end: a move's section stays in view while its heading is on screen and the line
     * hasn't reached it; else the section at the line is in view.
     */
    #settle = () => {
        const at = this.#atLine();
        const pinned = this.#pinned;
        if (pinned !== null && pinned !== TOP) {
            const { top } = this.#sections[pinned].heading.getBoundingClientRect();
            if (at < pinned && top >= 0 && top < innerHeight)
                return;
        }
        this.#pinned = null;
        this.#mark(at);
    };
    /** Marks the section's link with aria-current, and no other link of the tree. */
    #mark(index) {
        this._index = index;
        this.#sections.forEach(({ link }, i) => {
            if (i === index)
                link.setAttribute("aria-current", CURRENT);
            else if (link.getAttribute("aria-current") === CURRENT)
                link.removeAttribute("aria-current");
        });
    }
    /**
     * Moves `step` stops from the one in view, around the ring of the page's top and each section:
     * a section's heading scrolled to the top of the viewport, below the root's scroll padding, or
     * the root scrolled to 0; the stop marked, and held until the scroll ends.
     */
    #move(step) {
        const stops = this.#sections.length + 1;
        if (stops === 1)
            return;
        // The query's change event lags a resize by a frame; its matches is current, so the mode, and
        // with it the root's scroll padding, is read from it first, as sl-drawer's show() reads it.
        this.#change();
        const index = ((((this._index - TOP + step) % stops) + stops) % stops) + TOP;
        this.#pinned = index;
        this.#mark(index);
        const behavior = reduced() ? "instant" : "smooth";
        if (index === TOP)
            scrollTo({ top: 0, behavior });
        else
            this.#sections[index].heading.scrollIntoView({ block: "start", behavior });
    }
}
define(tagName, SectionTree);
