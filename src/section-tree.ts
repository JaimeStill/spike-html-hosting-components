// The section tree, Lit with a shadow root on the foundation's reset and elements sheets: a page's
// table of contents, its links slotted from the light DOM, the section in view marked, Left and
// Right bound through the foundation's keys module, and the reading progress a CSS scroll timeline
// draws.

import { html, LitElement, nothing, type PropertyDeclarations } from "lit";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { register, settings } from "@jaimestill/spike-html-apps-foundation/keys.js";
import styles from "./section-tree.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-section-tree";

/** The keys that move to the previous and the next section, as the keys grammar names them. */
export const PREVIOUS_KEYS = "ArrowLeft";
export const NEXT_KEYS = "ArrowRight";

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

/** One entry of the tree: a slotted link and the heading its fragment names. */
interface Section {
  link: HTMLAnchorElement;
  heading: HTMLElement;
}

/** The id a "#" href names: its fragment, percent-decoded, or as written when it decodes to none. */
function fragment(href: string): string {
  try {
    return decodeURIComponent(href.slice(1));
  } catch {
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
 * Left and Right move to the previous and the next section, scrolling its heading to the top, by
 * register() in the foundation's keys module, so its help dialog lists them; Up and Down stay the
 * browser's own scrolling. The keys module's off switch covers character keys alone, which the
 * arrows are not, so the element reads the reader's setting at each press and does nothing while
 * it is off. The Previous and Next buttons, each with its bracketed key hint, move the same way
 * whatever the setting. A move scrolls smoothly unless the reader asks for reduced motion.
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
  } satisfies PropertyDeclarations;

  /** The nav landmark's accessible name. */
  declare label: string;
  /** The section in view, by its place in the tree, or -1 with none. */
  declare _index: number;
  /** How many sections the tree holds. */
  declare _count: number;
  /** Whether the reader's keys setting is on, read at each render's cue. */
  declare _keys: boolean;

  #sections: Section[] = [];
  #observer: IntersectionObserver | null = null;
  #unregister: (() => void)[] = [];
  /**
   * The section a move scrolled to, held as the one in view until the next scroll ends: the
   * observer's calls during a smooth scroll leave it, and a heading the page can't scroll to the
   * line, near its end, stays marked while it is on screen.
   */
  #pinned: number | null = null;

  constructor() {
    super();
    this.label = "Sections";
    this._index = -1;
    this._count = 0;
    this._keys = true;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#unregister = [
      register(PREVIOUS_KEYS, PREVIOUS_LABEL, () => this.#press(-1)),
      register(NEXT_KEYS, NEXT_LABEL, () => this.#press(1)),
    ];
    document.addEventListener("scrollend", this.#settle);
    // The keys setting changes in the help dialog's form, whose own listener sits below the
    // document and so runs first, or in another tab.
    document.addEventListener("change", this.#refresh);
    addEventListener("storage", this.#refresh);
    this.#refresh();
    this.#collect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const unregister of this.#unregister) unregister();
    this.#unregister = [];
    document.removeEventListener("scrollend", this.#settle);
    document.removeEventListener("change", this.#refresh);
    removeEventListener("storage", this.#refresh);
    this.#observer?.disconnect();
    this.#observer = null;
  }

  render() {
    const hint = (key: string) =>
      html`<span class="hint" aria-hidden="true">[<kbd>${key}</kbd>]</span>`;
    // aria-keyshortcuts declares a key only while the reader's setting has it fire.
    const shortcut = (keys: string) => (this._keys ? keys : nothing);
    return html`
      <nav aria-label=${this.label}>
        <div class="progress" part="progress" aria-hidden="true"><div class="bar"></div></div>
        <slot @slotchange=${this.#collect}></slot>
        <div class="moves">
          <button
            type="button"
            class="previous"
            aria-keyshortcuts=${shortcut(PREVIOUS_KEYS)}
            ?disabled=${this._index <= 0}
            @click=${() => this.#move(-1)}
          >
            Previous ${hint("←")}
          </button>
          <button
            type="button"
            class="next"
            aria-keyshortcuts=${shortcut(NEXT_KEYS)}
            ?disabled=${this._index >= this._count - 1}
            @click=${() => this.#move(1)}
          >
            Next ${hint("→")}
          </button>
        </div>
      </nav>
    `;
  }

  /** Reads the reader's keys setting again. */
  #refresh = (): void => {
    this._keys = settings().enabled;
  };

  /** The sections the slotted links name, in tree order, and the observer on their headings. */
  #collect = (): void => {
    const sections: Section[] = [];
    for (const link of this.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      const id = fragment(link.getAttribute("href")!);
      const heading = id === "" ? null : document.getElementById(id);
      if (heading) sections.push({ link, heading });
    }
    this.#sections = sections;
    this._count = sections.length;
    this.#pinned = null;
    this.#observer?.disconnect();
    this.#observer = new IntersectionObserver(this.#follow, {
      rootMargin: `0px 0px ${-Math.round((1 - LINE) * 100)}% 0px`,
    });
    for (const { heading } of sections) this.#observer.observe(heading);
    this.#mark(this.#atLine());
  };

  /** The last section whose heading has reached the reading line, the first before any has. */
  #atLine(): number {
    if (this.#sections.length === 0) return -1;
    const line = innerHeight * LINE;
    let index = 0;
    this.#sections.forEach(({ heading }, i) => {
      if (heading.getBoundingClientRect().top <= line + 1) index = i;
    });
    return index;
  }

  /** The observer's call: the section in view follows the scroll, unless a move holds one. */
  #follow = (): void => {
    if (this.#pinned === null) this.#mark(this.#atLine());
  };

  /**
   * A scroll's end: a move's section stays in view while its heading is on screen and the line
   * hasn't reached it; else the section at the line is in view.
   */
  #settle = (): void => {
    const at = this.#atLine();
    const pinned = this.#pinned;
    if (pinned !== null) {
      const { top } = this.#sections[pinned].heading.getBoundingClientRect();
      if (at < pinned && top >= 0 && top < innerHeight) return;
    }
    this.#pinned = null;
    this.#mark(at);
  };

  /** Marks the section's link with aria-current, and no other link of the tree. */
  #mark(index: number): void {
    this._index = index;
    this.#sections.forEach(({ link }, i) => {
      if (i === index) link.setAttribute("aria-current", CURRENT);
      else if (link.getAttribute("aria-current") === CURRENT) link.removeAttribute("aria-current");
    });
  }

  /** A key's move, which does nothing while the reader has turned the keys off. */
  #press(step: number): void {
    if (settings().enabled) this.#move(step);
  }

  /** Scrolls the section `step` places from the one in view to the top, and marks it. */
  #move(step: number): void {
    const index = Math.min(Math.max(this._index + step, 0), this.#sections.length - 1);
    if (index === this._index || index < 0) return;
    this.#pinned = index;
    this.#mark(index);
    this.#sections[index].heading.scrollIntoView({
      block: "start",
      behavior: reduced() ? "instant" : "smooth",
    });
  }
}

define(tagName, SectionTree);

declare global {
  interface HTMLElementTagNameMap {
    "sl-section-tree": SectionTree;
  }
}
