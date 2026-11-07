// The shortcuts list, Lit with a shadow root on the foundation's reset and elements sheets: the
// page's keyboard shortcuts, as the foundation's keys module lists them for the help dialog that
// holds the element, in a table of each binding's keys and a button that runs it, with the
// foundation's screen-reader note after it. It holds no settings, and it renders no
// [data-keys-list], so the keys module never loads its own help module.

import { html, LitElement, nothing, type PropertyDeclarations, type TemplateResult } from "lit";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { bindings, type Listed } from "@jaimestill/spike-html-apps-foundation/keys.js";
import { labels, type Sequence } from "@jaimestill/spike-html-apps-foundation/keys-grammar.js";
import styles from "./shortcuts.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-shortcuts";

/**
 * The screen-reader note after the list, the foundation's keys help note word for word: its help
 * module, which writes it, is the one the element stands in for and never loads.
 */
export const NOTE =
  "Screen readers: a screen reader may take a key before the page does. To pass the next key " +
  "through, press NVDA+F2 in NVDA, JAWS+3 in JAWS, Narrator+3 in Narrator, or VO+Tab in VoiceOver.";

/** The word a row turned off by the reader's setting shows after its keys. */
export const OFF = "off";

/**
 * The element's text without its key hints: each kbd, and the joiner between two of them. The
 * foundation's keys help reads a row's label so, privately; this is its rule rebuilt.
 */
function textOf(el: Element): string {
  const copy = el.cloneNode(true) as Element;
  for (const kbd of copy.querySelectorAll("kbd")) {
    const joiner = kbd.nextSibling;
    const after = joiner?.nextSibling;
    if (
      joiner?.nodeType === Node.TEXT_NODE &&
      after instanceof Element &&
      after.localName === "kbd"
    ) {
      joiner.remove();
    }
    kbd.remove();
  }
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * A row's action label, as the foundation's keys help names it: a registered binding's label; an
 * element's aria-label, else its text, else its field's label, else its keys.
 */
function labelOf({ element, label, keys }: Listed): string {
  if (!element) return label ?? "";
  const aria = element.getAttribute("aria-label")?.trim();
  if (aria) return aria;
  const text = textOf(element);
  if (text) return text;
  const field = (element as Partial<Pick<HTMLInputElement, "labels">>).labels?.[0];
  return (field && textOf(field)) || keys;
}

/**
 * A binding's sequences, each key in a kbd by the grammar's labels, joined as the foundation's
 * keys help joins them: "+" within a press, " then " between presses, " or " between sequences.
 */
function keysOf(sequences: Sequence[]): (string | TemplateResult)[] {
  const parts: (string | TemplateResult)[] = [];
  sequences.forEach((sequence, a) => {
    if (a > 0) parts.push(" or ");
    labels(sequence).forEach((press, p) => {
      if (p > 0) parts.push(" then ");
      press.forEach((name, k) => {
        if (k > 0) parts.push("+");
        parts.push(html`<kbd>${name}</kbd>`);
      });
    });
  });
  return parts;
}

/**
 * The page's keyboard shortcuts, for a help dialog: placed in the dialog, it lists exactly the
 * bindings the foundation's keys module's bindings() gives with that dialog closed, the ones the
 * page has while the reader is outside it, in its order:
 *
 *   <dialog id="help" aria-labelledby="help-title">
 *     <h2 id="help-title">Keyboard shortcuts</h2>
 *     <sl-shortcuts></sl-shortcuts>
 *     …
 *   </dialog>
 *
 * The shadow root holds a table of two columns, Keys and Action. A row's keys are each binding's
 * sequences, each key in a kbd as the keys grammar labels it; its action is a button named by the
 * binding, its registered label or its element's name, which closes the dialog and runs the
 * binding as its keys would. A row the reader's setting turns off, one whose every sequence is
 * character keys alone while character keys are off, carries the word "off" after its keys, which
 * is shown and read, and the class off. No row is written that bindings() doesn't give: the
 * foundation's fixed Escape row, which releases a field and is no binding, is left out. The
 * foundation's screen-reader note follows the table.
 *
 * The element reads the bindings again as the dialog opens, since they differ with the page's
 * state, and as the reader's settings change: a change event in the document, as a settings form
 * sends, and a storage event, as another tab's change sends. It holds no settings of its own and
 * no [data-keys-list], so the keys module never fills it and never loads its help module. Outside
 * a dialog it lists the bindings bindings(null) gives, read as it connects and at each change.
 */
export class Shortcuts extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    _rows: { state: true },
  } satisfies PropertyDeclarations;

  /** The bindings listed, as bindings() last gave them. */
  declare _rows: Listed[];

  /** The dialog the element is in, whose opening reads the bindings again, or null. */
  #dialog: HTMLDialogElement | null = null;

  constructor() {
    super();
    this._rows = [];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#dialog = this.closest("dialog");
    this.#dialog?.addEventListener("beforetoggle", this.#toggled);
    document.addEventListener("change", this.#refresh);
    addEventListener("storage", this.#refresh);
    this.#refresh();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#dialog?.removeEventListener("beforetoggle", this.#toggled);
    this.#dialog = null;
    document.removeEventListener("change", this.#refresh);
    removeEventListener("storage", this.#refresh);
  }

  render() {
    return html`
      <table>
        <thead>
          <tr>
            <th scope="col">Keys</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          ${this._rows.map(
            (binding) => html`
              <tr class=${binding.off ? OFF : nothing}>
                <td>
                  ${keysOf(binding.sequences)}${binding.off ? html` <small>${OFF}</small>` : nothing}
                </td>
                <td>
                  <button type="button" @click=${() => this.#run(binding)}>
                    ${labelOf(binding)}
                  </button>
                </td>
              </tr>
            `,
          )}
        </tbody>
      </table>
      <p class="note">${NOTE}</p>
    `;
  }

  /** Reads the bindings again as the dialog opens. */
  #toggled = (event: Event): void => {
    if ((event as ToggleEvent).newState === "open") this.#refresh();
  };

  /** Reads the bindings again, as bindings() gives them with the dialog closed. */
  #refresh = (): void => {
    this._rows = bindings(this.#dialog);
  };

  /** Closes the dialog and runs the binding, as its keys would. */
  #run(binding: Listed): void {
    this.#dialog?.close();
    binding.run();
  }
}

define(tagName, Shortcuts);

declare global {
  interface HTMLElementTagNameMap {
    "sl-shortcuts": Shortcuts;
  }
}
