import { LitElement, type TemplateResult } from "lit";
import { type Listed } from "@jaimestill/spike-html-apps-foundation/keys.js";
/** The tag the element defines. */
export declare const tagName = "sl-shortcuts";
/**
 * The screen-reader note after the list, the foundation's keys help note word for word: its help
 * module, which writes it, is the one the element stands in for and never loads.
 */
export declare const NOTE: string;
/** The word a row turned off by the reader's setting shows after its keys. */
export declare const OFF = "off";
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
 * sequences, each key in a kbd as the keys grammar labels it; its action is the binding's name,
 * its registered label or its element's name, as plain text. A row is no control: the list only
 * describes the shortcuts, so nothing in it takes focus, and a dialog whose only other control is
 * its Close puts focus there natively as it opens. A row the reader's setting turns off, one whose
 * every sequence is character keys alone while character keys are off, carries the word "off"
 * after its keys, which is shown and read, and the class off. No row is written that bindings()
 * doesn't give: the foundation's fixed Escape row, which releases a field and is no binding, is
 * left out. The foundation's screen-reader note follows the table.
 *
 * The element reads the bindings again as the dialog opens, since they differ with the page's
 * state, and as the reader's settings change: a change event in the document, as a settings form
 * sends, and a storage event, as another tab's change sends. It holds no settings of its own and
 * no [data-keys-list], so the keys module never fills it and never loads its help module. Outside
 * a dialog it lists the bindings bindings(null) gives, read as it connects and at each change.
 */
export declare class Shortcuts extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        _rows: {
            state: true;
        };
    };
    /** The bindings listed, as bindings() last gave them. */
    _rows: Listed[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-shortcuts": Shortcuts;
    }
}
