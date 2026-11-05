// The section tree, Lit with a shadow root on the foundation's reset and elements sheets: a page's
// table of contents, its links slotted from the light DOM, the section in view marked, H and L
// bound through the foundation's keys module and cycling through the page's top and its sections,
// and the reading progress a CSS scroll timeline draws. Below `dock` it is a sticky bar of the
// progress and the moves alone, its links hidden.

import { html, LitElement, nothing, type PropertyDeclarations, type PropertyValues } from "lit";

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
 * top or one the page can't scroll to the line, and the stop the next move counts from. Once the
 * reader scrolls by other means, the wheel, the keyboard, a link, or the scrollbar, the mark
 * follows the reading line again and the next move counts from the section in view. H and L
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
  } satisfies PropertyDeclarations;

  /** The nav landmark's accessible name. */
  declare label: string;
  /** The width at which the tree is a column, and wider: a CSS length, read in a media query. */
  declare dock: string;
  /** The section in view, by its place in the tree, or TOP with none. */
  declare _index: number;
  /** How many sections the tree holds. */
  declare _count: number;
  /** Whether the reader's keys setting is on, read at each render's cue. */
  declare _keys: boolean;

  #sections: Section[] = [];
  #observer: IntersectionObserver | null = null;
  #unregister: (() => void)[] = [];
  /**
   * The stop the last move reached, held as the one in view, so the next move counts from it,
   * until the reader scrolls the page by other means: whatever the observer would mark there, a
   * short section whose next heading is already past the line, or one the page can't scroll to
   * the line, near its end. Null while the observer's rule holds.
   */
  #target: number | null = null;
  /** The root's scroll position the last move rests at, while a move's target is held. */
  #rest = 0;
  /** Whether a move's smooth scroll is under way: its scroll events are its own until it ends. */
  #moving = false;
  // The mode is a custom state, docked or bar, which the page may style.
  readonly #internals = this.attachInternals();
  #query: MediaQueryList | null = null;
  // Whether the tree is the bar: null until the element is connected, and again once removed.
  #bar: boolean | null = null;
  // The root's own inline scroll-padding-block-start, put back as the tree leaves the bar.
  #padding = "";
  // Keeps the root's scroll padding at the bar's block size as the bar's size changes.
  readonly #resized = new ResizeObserver(() => this.#pad());

  constructor() {
    super();
    this.label = "Sections";
    this.dock = DOCK;
    this._index = TOP;
    this._count = 0;
    this._keys = true;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#unregister = [
      register(PREVIOUS_KEYS, PREVIOUS_LABEL, () => this.#move(-1)),
      register(NEXT_KEYS, NEXT_LABEL, () => this.#move(1)),
    ];
    document.addEventListener("scroll", this.#scrolled, { passive: true });
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

  disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const unregister of this.#unregister) unregister();
    this.#unregister = [];
    document.removeEventListener("scroll", this.#scrolled);
    document.removeEventListener("scrollend", this.#settle);
    document.removeEventListener("change", this.#refresh);
    removeEventListener("storage", this.#refresh);
    this.#observer?.disconnect();
    this.#observer = null;
    this.#query?.removeEventListener("change", this.#change);
    this.#query = null;
    if (this.#bar) this.#unpad();
    this.#bar = null;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("dock") && this.#query) this.#watch();
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
  #watch(): void {
    this.#query?.removeEventListener("change", this.#change);
    this.#query = matchMedia(`(width < ${this.dock})`);
    this.#query.addEventListener("change", this.#change);
    this.#change();
  }

  /** Sets the mode from the query: the custom state, and the root's scroll padding for the bar. */
  #change = (): void => {
    const bar = this.#query?.matches ?? false;
    if (bar === this.#bar) return;
    const { states } = this.#internals;
    states.delete(bar ? "docked" : "bar");
    states.add(bar ? "bar" : "docked");
    if (bar) {
      this.#padding = document.documentElement.style.scrollPaddingBlockStart;
      this.#resized.observe(this);
      this.#pad();
    } else if (this.#bar) {
      this.#unpad();
    }
    this.#bar = bar;
  };

  /** The root's scroll padding at the bar's block size, so the bar covers no heading scrolled to. */
  #pad(): void {
    const { height } = this.getBoundingClientRect();
    document.documentElement.style.scrollPaddingBlockStart = `${Math.ceil(height)}px`;
  }

  /** The root's own scroll padding put back, and the bar's size no longer followed. */
  #unpad(): void {
    this.#resized.disconnect();
    document.documentElement.style.scrollPaddingBlockStart = this.#padding;
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
    this.#release();
    this.#observer?.disconnect();
    this.#observer = new IntersectionObserver(this.#follow, {
      rootMargin: `0px 0px ${-Math.round((1 - LINE) * 100)}% 0px`,
    });
    for (const { heading } of sections) this.#observer.observe(heading);
    this.#mark(this.#atLine());
  };

  /**
   * The last section whose heading has reached the reading line; TOP at the page's top, the root
   * scrolled to 0, and before any heading has reached it.
   */
  #atLine(): number {
    if (this.#sections.length === 0 || document.documentElement.scrollTop < 1) return TOP;
    const line = innerHeight * LINE;
    let index = TOP;
    this.#sections.forEach(({ heading }, i) => {
      if (heading.getBoundingClientRect().top <= line + 1) index = i;
    });
    return index;
  }

  /** The observer's call: the section in view follows the scroll, unless a move holds one. */
  #follow = (): void => {
    if (this.#target === null) this.#mark(this.#atLine());
  };

  /** Drops a move's target, so the observer's rule holds again. */
  #release(): void {
    this.#target = null;
    this.#moving = false;
  }

  /** Whether the root is scrolled away from where the last move rests. */
  #away(): boolean {
    return Math.abs(document.documentElement.scrollTop - this.#rest) > 1;
  }

  /**
   * A scroll: one away from where a move rests, and no move's own smooth scroll, is the reader's,
   * by the wheel, the keyboard, a link, or the scrollbar, so the section at the line is in view
   * again and the next move counts from it. A move's instant scroll lands at its rest, so its
   * scroll event, which follows a frame later, is no reader's.
   */
  #scrolled = (): void => {
    if (this.#target === null || this.#moving || !this.#away()) return;
    this.#release();
    this.#mark(this.#atLine());
  };

  /**
   * A scroll's end: a move's scroll, smooth or instant, that came to its rest leaves the target
   * held; else the section at the line is in view, the target released if the reader took the
   * move's scroll elsewhere on the way. The observer calls only as a heading crosses the line or
   * the viewport's top, so a scroll off the page's top that moves no heading across either, as
   * from the top to a first heading already above the line, is marked here.
   */
  #settle = (): void => {
    if (this.#target !== null) {
      const landed = document.documentElement.scrollTop;
      // A smooth scroll lands within a device pixel of its computed rest, which the rest then
      // takes, so no rounding of a fractional scale reads as the reader's scroll.
      if (this.#moving && Math.abs(landed - this.#rest) <= 2) this.#rest = landed;
      this.#moving = false;
      if (!this.#away()) return;
      this.#release();
    }
    this.#mark(this.#atLine());
  };

  /**
   * Where a move to `index` rests the root's scroll: 0 for the top; for a section, its heading at
   * the viewport's top, less its scroll margin and the root's scroll padding, as scrollIntoView
   * lands it, within the root's scroll range, so a heading the page can't scroll that far rests
   * at the range's end.
   */
  #destination(index: number): number {
    if (index === TOP) return 0;
    const root = document.documentElement;
    const { heading } = this.#sections[index];
    const margin = parseFloat(getComputedStyle(heading).scrollMarginBlockStart) || 0;
    const padding = parseFloat(getComputedStyle(root).scrollPaddingBlockStart) || 0;
    const top = heading.getBoundingClientRect().top + root.scrollTop - margin - padding;
    return Math.min(Math.max(top, 0), root.scrollHeight - root.clientHeight);
  }

  /** Marks the section's link with aria-current, and no other link of the tree. */
  #mark(index: number): void {
    this._index = index;
    this.#sections.forEach(({ link }, i) => {
      if (i === index) link.setAttribute("aria-current", CURRENT);
      else if (link.getAttribute("aria-current") === CURRENT) link.removeAttribute("aria-current");
    });
  }

  /**
   * Moves `step` stops from the one in view, around the ring of the page's top and each section:
   * a section's heading scrolled to the top of the viewport, below the root's scroll padding, or
   * the root scrolled to 0. The stop is the target, marked and held, so the next move counts from
   * it, until the reader scrolls the page.
   */
  #move(step: number): void {
    const stops = this.#sections.length + 1;
    if (stops === 1) return;
    // The query's change event lags a resize by a frame; its matches is current, so the mode, and
    // with it the root's scroll padding, is read from it first, as sl-drawer's show() reads it.
    this.#change();
    const index = ((((this._index - TOP + step) % stops) + stops) % stops) + TOP;
    this.#target = index;
    this.#mark(index);
    const smooth = !reduced();
    this.#rest = this.#destination(index);
    const behavior = smooth ? "smooth" : "instant";
    if (index === TOP) scrollTo({ top: 0, behavior });
    else this.#sections[index].heading.scrollIntoView({ block: "start", behavior });
    // An instant scroll has landed already, and its rest is where it landed; a smooth one runs
    // until its scrollend, unless the root is at its rest already and it scrolls nowhere.
    if (smooth) this.#moving = this.#away();
    else this.#rest = document.documentElement.scrollTop;
  }
}

define(tagName, SectionTree);

declare global {
  interface HTMLElementTagNameMap {
    "sl-section-tree": SectionTree;
  }
}
