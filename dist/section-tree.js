// The section tree, Lit with a shadow root on the foundation's reset and elements sheets: a page's
// table of contents, its links slotted from the light DOM, the section in view marked, H and L
// bound through the foundation's keys module, and the reading progress a CSS scroll timeline
// draws.
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
export class SectionTree extends LitElement {
    static styles = [reset, elements, styles];
    static properties = {
        label: { type: String },
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
    constructor() {
        super();
        this.label = "Sections";
        this._index = -1;
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
            ?disabled=${this._index <= 0}
            @click=${() => this.#move(-1)}
          >
            Previous ${hint(PREVIOUS_SHORTCUT)}
          </button>
          <button
            type="button"
            class="next"
            aria-keyshortcuts=${shortcut(NEXT_SHORTCUT)}
            ?disabled=${this._index >= this._count - 1}
            @click=${() => this.#move(1)}
          >
            Next ${hint(NEXT_SHORTCUT)}
          </button>
        </div>
      </nav>
    `;
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
    /** The last section whose heading has reached the reading line, the first before any has. */
    #atLine() {
        if (this.#sections.length === 0)
            return -1;
        const line = innerHeight * LINE;
        let index = 0;
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
        if (pinned !== null) {
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
    /** Scrolls the section `step` places from the one in view to the top, and marks it. */
    #move(step) {
        const index = Math.min(Math.max(this._index + step, 0), this.#sections.length - 1);
        if (index === this._index || index < 0)
            return;
        this.#pinned = index;
        this.#mark(index);
        this.#sections[index].heading.scrollIntoView({
            block: "start",
            behavior: reduced() ? "instant" : "smooth",
        });
    }
}
define(tagName, SectionTree);
