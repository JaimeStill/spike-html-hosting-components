import { LitElement } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-page-header";
/**
 * A page's front matter. Its content is light-DOM HTML, the description list the element slots, so
 * with no script the list still renders as the page's own dl:
 *
 *   <sl-page-header>
 *     <dl>
 *       <dt>title</dt>
 *       <dd>The architecture stand-in</dd>
 *       <dt>status</dt>
 *       <dd>draft</dd>
 *     </dl>
 *   </sl-page-header>
 *
 * The list is one dl of dt and dd pairs, a dt for each front matter key and a dd for its value, in
 * the order the source writes them. Every key and value is text, escaped where the page is
 * written, so a value that reads as markup shows as the characters it is; the element parses
 * nothing and reorders nothing, it lays the pairs out in two columns. A page with no front matter
 * writes an empty dl, or none: either renders nothing, the element taking no space.
 *
 * The header is no landmark and holds nothing to focus: it is the page's metadata, read in place.
 */
export declare class PageHeader extends LitElement {
    static styles: CSSStyleSheet[];
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-page-header": PageHeader;
    }
}
