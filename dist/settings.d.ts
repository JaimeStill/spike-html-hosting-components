import { LitElement } from "lit";
import { type Settings as KeySettings } from "@jaimestill/spike-html-apps-foundation/keys.js";
import { type Choice } from "@jaimestill/spike-html-apps-foundation/preferences.js";
/** The tag the element defines. */
export declare const tagName = "sl-settings";
/** The character-key switch's label, the foundation's keys help label word for word. */
export declare const SWITCH_LABEL = "Character-key shortcuts (combinations with Control, Alt, or Meta stay on)";
/** The wait select's label, the foundation's keys help label. */
export declare const WAIT_LABEL = "Wait between presses";
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
 * at the rows and kept from the page, so no page binding, the section tree's J and K among them,
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
 * the same tab, an open shortcuts list among them, read them again at a change event in the
 * document. The rows and the keyboard settings follow another tab's change, at its storage
 * event, after the preferences module has applied it to the root, and a change event in the
 * document, as another settings form sends. As the dialog opens the element reads both again and
 * focuses the first row's checked radio, unless an element in the dialog has autofocus. Escape is
 * the native dialog's.
 */
export declare class Settings extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        _choice: {
            state: true;
        };
        _keys: {
            state: true;
        };
    };
    /** What applies to the root, as the rows show it. */
    _choice: Choice;
    /** The reader's keys settings, as the keyboard settings show them. */
    _keys: KeySettings;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-settings": Settings;
    }
}
