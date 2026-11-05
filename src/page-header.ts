// The page header, Lit with a shadow root on the foundation's reset and elements sheets: a page's
// front matter, slotted from the light DOM as a description list, its terms beside their values.

import { html, LitElement } from "lit";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./page-header.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-page-header";

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
export class PageHeader extends LitElement {
  static styles = [reset, elements, styles];

  render() {
    return html`<slot></slot>`;
  }
}

define(tagName, PageHeader);

declare global {
  interface HTMLElementTagNameMap {
    "sl-page-header": PageHeader;
  }
}
