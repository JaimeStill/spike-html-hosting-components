// The settings, Lit with a shadow root on the foundation's sheets: the reader's theme, its color,
// scheme, space, and type, in the foundation theme menu's rows and live preview, and the keys
// module's character-key switch and wait between presses, for a Settings dialog that holds the
// element. Every change applies and is stored at once, with no Save and no Cancel. It reuses the
// foundation's public preferences, registry, and keys modules and lays the theme out by its
// exported theme-menu.css; the rows, their steppers, the preview card, and the H, J, K, and L
// moves, which the foundation keeps private in theme-menu.ts, are rebuilt here, so the
// foundation's theme-menu.js is never loaded.
// Adapted from spike-html-apps-foundation (618cb83): src/theme-menu.ts, its rows, steppers,
// preview, and moves, without Save, Cancel, and the snapshot; and src/keys-help.ts, its settings
// form.

import { html, LitElement, type PropertyDeclarations } from "lit";
import { live } from "lit/directives/live.js";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import {
  changeSettings,
  settings,
  WAITS,
  type Settings as KeySettings,
} from "@jaimestill/spike-html-apps-foundation/keys.js";
import meta from "@jaimestill/spike-html-apps-foundation/meta.css" with { type: "css" };
import {
  apply,
  ATTRIBUTES,
  save,
  SCHEMES,
  type Choice,
  type Key,
} from "@jaimestill/spike-html-apps-foundation/preferences.js";
import { DEFAULTS, FACETS, profiles } from "@jaimestill/spike-html-apps-foundation/registry.js";
import structure from "@jaimestill/spike-html-apps-foundation/structure.css" with { type: "css" };
import themeMenu from "@jaimestill/spike-html-apps-foundation/theme-menu.css" with { type: "css" };
import utilities from "@jaimestill/spike-html-apps-foundation/utilities.css" with { type: "css" };
import styles from "./settings.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-settings";

/** The character-key switch's label, the foundation's keys help label word for word. */
export const SWITCH_LABEL =
  "Character-key shortcuts (combinations with Control, Alt, or Meta stay on)";

/** The wait select's label, the foundation's keys help label. */
export const WAIT_LABEL = "Wait between presses";

/** The theme rows, in order: each key of a choice with its legend, the foundation menu's. */
const SECTIONS: readonly (readonly [Key, string])[] = [
  ["color", "Color"],
  ["scheme", "Scheme"],
  ["space", "Space"],
  ["type", "Type"],
];

/**
 * The preview card's contents, the foundation menu's: a heading, a link, code, kbd, a neutral and
 * a blue button, a field, and a striped table. Its neutral button reads Retry, so it never reads
 * as a control of the settings. The input's id is the shadow root's own.
 */
const PREVIEW = html`<h3>Nightly build</h3>
  <p>
    Read the <a href="#release-notes">release notes</a>, run <code>mise run check</code>, or press
    <kbd>Ctrl</kbd> <kbd>K</kbd> to search.
  </p>
  <p class="theme-menu-buttons">
    <button type="button">Retry</button> <button type="button" class="button-blue">Deploy</button>
  </p>
  <div class="field">
    <label for="preview-branch">Branch</label
    ><input type="text" id="preview-branch" value="main" />
  </div>
  <table class="table-striped">
    <thead>
      <tr>
        <th scope="col">Run</th>
        <th scope="col">Status</th>
        <th scope="col">Time</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1204</td>
        <td>passed</td>
        <td>2m 14s</td>
      </tr>
      <tr>
        <td>1205</td>
        <td>failed</td>
        <td>48s</td>
      </tr>
      <tr>
        <td>1206</td>
        <td>queued</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>`;

/** A row's names: the registry's for a facet, SCHEMES for the scheme. */
function options(key: Key): string[] {
  return key === "scheme" ? [...SCHEMES] : profiles(key);
}

/**
 * What applies to the root now, as a choice: each facet's attribute, or its default where none is
 * set, and the scheme, system when data-scheme is absent. The foundation menu's rule, rebuilt.
 */
function current(): Choice {
  const root = document.documentElement;
  const choice = { scheme: root.getAttribute(ATTRIBUTES.scheme) ?? SCHEMES[0] } as Choice;
  for (const facet of FACETS) {
    choice[facet] = root.getAttribute(ATTRIBUTES[facet]) ?? DEFAULTS[facet];
  }
  return choice;
}

/** The row holding the node, or null. */
function rowOf(node: EventTarget | null): HTMLFieldSetElement | null {
  return node instanceof Element ? node.closest<HTMLFieldSetElement>(".theme-menu-row") : null;
}

/** A wait as the select shows it, in seconds. */
const shown = (ms: number): string => `${ms / 1000} s`;

/**
 * The reader's settings, for a Settings dialog: placed in the dialog, as its content after the
 * page's heading, it holds the theme and the keyboard settings:
 *
 *   <dialog id="settings" aria-labelledby="settings-title">
 *     <h2 id="settings-title">Settings</h2>
 *     <sl-settings></sl-settings>
 *     …
 *   </dialog>
 *
 * The theme is the foundation theme menu's rows and preview, laid out by its theme-menu.css: a row
 * each for color, scheme, space, and type, each a radio group drawn as ◀ value ▶, its other radios
 * kept in the group and hidden visually, so a screen reader announces the value's place among
 * them. The arrows are spans hidden from assistive technology that take no focus, as the
 * foundation's are; a click steps the row. On a row, H and L step it, wrapping, and J and K, or
 * the down and up arrows, move to the next and the previous row, stopping at the first and the
 * last; the left and right arrows cycle the radios natively. The keys are the element's own, held
 * at the rows and kept from the page, so no page binding, the section tree's H and L among them,
 * sees one. Beside the rows, the preview card shows the theme on a heading, a link, code, kbd,
 * buttons, a field, and a table; it is inert. Each step applies the new choice to the page's root
 * and stores it at once through the foundation's preferences module.
 *
 * The keyboard settings are the foundation's keys help settings: the character-key switch, which
 * turns off every binding of character keys alone, and the wait between presses, one of WAITS; a
 * stored wait the reader can't pick shows as an option that clears it. Each change is stored at
 * once through the keys module's changeSettings(), which writes aria-keyshortcuts on every
 * data-keys element in the document.
 *
 * Every change also fires a change event at the host, bubbling and composed: a control's own
 * change event stops at the shadow root, and the components that follow the reader's settings in
 * the same tab, the section tree's aria-keyshortcuts and an open shortcuts list, read them again at
 * a change event in the document. The rows and the keyboard settings follow another tab's change,
 * at its storage event, after the preferences module has applied it to the root, and a change
 * event in the document, as another settings form sends. As the dialog opens the element reads
 * both again and focuses the first row's checked radio, unless an element in the dialog has
 * autofocus. Escape is the native dialog's.
 */
export class Settings extends LitElement {
  static styles = [reset, elements, meta, structure, utilities, themeMenu, styles];

  static properties = {
    _choice: { state: true },
    _keys: { state: true },
  } satisfies PropertyDeclarations;

  /** What applies to the root, as the rows show it. */
  declare _choice: Choice;
  /** The reader's keys settings, as the keyboard settings show them. */
  declare _keys: KeySettings;

  /** The dialog the element is in, whose opening reads the settings again, or null. */
  #dialog: HTMLDialogElement | null = null;

  constructor() {
    super();
    this._choice = current();
    this._keys = settings();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#dialog = this.closest("dialog");
    this.#dialog?.addEventListener("toggle", this.#toggled);
    document.addEventListener("change", this.#refresh);
    addEventListener("storage", this.#refresh);
    this.#refresh();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#dialog?.removeEventListener("toggle", this.#toggled);
    this.#dialog = null;
    document.removeEventListener("change", this.#refresh);
    removeEventListener("storage", this.#refresh);
  }

  render() {
    const { enabled, wait } = this._keys;
    const odd = !WAITS.some((ms) => ms === wait);
    return html`
      <section aria-labelledby="theme-title">
        <h3 id="theme-title">Theme</h3>
        <div class="theme-menu-body">
          <div
            class="theme-menu-rows"
            @change=${this.#picked}
            @click=${this.#clicked}
            @keydown=${this.#onkey}
          >
            ${SECTIONS.map(([key, legend]) => this.#row(key, legend))}
          </div>
          <div class="theme-menu-preview" inert>${PREVIEW}</div>
        </div>
      </section>
      <section aria-labelledby="keyboard-title">
        <h3 id="keyboard-title">Keyboard</h3>
        <label>
          <input
            type="checkbox"
            name="enabled"
            .checked=${live(enabled)}
            @change=${this.#switched}
          />
          ${SWITCH_LABEL}
        </label>
        <p>
          <label>
            ${WAIT_LABEL}
            <select name="wait" @change=${this.#waited}>
              ${odd ? html`<option value="" .selected=${live(true)}>${shown(wait)}</option>` : ""}
              ${WAITS.map(
                (ms) =>
                  html`<option value=${String(ms)} .selected=${live(ms === wait)}>
                    ${shown(ms)}
                  </option>`,
              )}
            </select>
          </label>
        </p>
      </section>
    `;
  }

  /**
   * A row's radio group, its radios the row's options, the one at the choice checked. Names come
   * from whatever registered them, and Lit sets them as text and property values, never markup.
   */
  #row(key: Key, legend: string) {
    const value = this._choice[key];
    return html`
      <fieldset class="theme-menu-row" data-section=${key}>
        <legend>${legend}</legend>
        <span data-step="-1" aria-hidden="true">◀</span>
        ${options(key).map(
          (option) =>
            html`<label
              ><input
                type="radio"
                name=${key}
                .value=${option}
                .checked=${live(option === value)}
              />${option}</label
            >`,
        )}
        <span data-step="1" aria-hidden="true">▶</span>
      </fieldset>
    `;
  }

  /** Reads the theme and the keys settings again. */
  #refresh = (): void => {
    this._choice = current();
    this._keys = settings();
  };

  /** Reads the settings again as the dialog opens, and focuses the first row's checked radio. */
  #toggled = async (event: Event): Promise<void> => {
    if ((event as ToggleEvent).newState !== "open") return;
    this.#refresh();
    if (this.#dialog?.querySelector("[autofocus]")) return;
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLInputElement>(".theme-menu-row :checked")?.focus();
  };

  /** Tells the document a setting changed: a control's own change stops at the shadow root. */
  #changed(): void {
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }

  /** Applies and stores the choice with the key at value, then focuses its row when asked. */
  async #choose(key: Key, value: string, focus: boolean): Promise<void> {
    const choice = { ...this._choice, [key]: value };
    this._choice = choice;
    apply(choice);
    save(choice);
    this.#changed();
    if (!focus) return;
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLInputElement>(`[data-section="${key}"] :checked`)?.focus();
  }

  /** Steps the row delta places from its checked option, wrapping, as native radios do. */
  #step(row: HTMLFieldSetElement, delta: number): void {
    const key = row.dataset.section as Key;
    const names = options(key);
    if (names.length === 0) return;
    const at = names.indexOf(this._choice[key]);
    void this.#choose(key, names[(at + delta + names.length) % names.length], true);
  }

  /** Focuses the checked radio of the row delta rows from the one given, stopping at the ends. */
  #move(row: HTMLFieldSetElement, delta: number): void {
    const rows = [...this.renderRoot.querySelectorAll<HTMLFieldSetElement>(".theme-menu-row")];
    const to = Math.min(Math.max(rows.indexOf(row) + delta, 0), rows.length - 1);
    rows[to].querySelector<HTMLInputElement>(":checked")?.focus();
  }

  /** A radio picked natively, by a click on its label or an arrow key. */
  #picked = (event: Event): void => {
    const radio = event.target as HTMLInputElement;
    const row = rowOf(radio);
    if (row) void this.#choose(row.dataset.section as Key, radio.value, false);
  };

  /** A click on a row's arrow steps it. */
  #clicked = (event: Event): void => {
    const arrow = event.target instanceof Element ? event.target.closest("[data-step]") : null;
    const row = rowOf(arrow);
    if (arrow instanceof HTMLElement && row) this.#step(row, Number(arrow.dataset.step));
  };

  /**
   * The keys the rows own, each stopped at the rows so no page-wide listener sees it. A held key
   * repeats a move, as a native arrow does.
   */
  #onkey = (event: KeyboardEvent): void => {
    const row = rowOf(event.target);
    if (!row || event.ctrlKey || event.altKey || event.metaKey) return;
    switch (event.key) {
      case "ArrowUp":
      case "k":
        this.#move(row, -1);
        break;
      case "ArrowDown":
      case "j":
        this.#move(row, 1);
        break;
      case "ArrowLeft":
      case "ArrowRight":
        // Native: the radio group cycles and fires change.
        event.stopPropagation();
        return;
      case "h":
      case "l":
        this.#step(row, event.key === "h" ? -1 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  /** The character-key switch, stored at once. */
  #switched = (event: Event): void => {
    this._keys = changeSettings({ enabled: (event.target as HTMLInputElement).checked });
    this.#changed();
  };

  /** The wait, stored at once; the option of a wait the reader can't pick clears theirs. */
  #waited = (event: Event): void => {
    const { value } = event.target as HTMLSelectElement;
    this._keys = changeSettings({ wait: value === "" ? null : Number(value) });
    this.#changed();
  };
}

define(tagName, Settings);

declare global {
  interface HTMLElementTagNameMap {
    "sl-settings": Settings;
  }
}
