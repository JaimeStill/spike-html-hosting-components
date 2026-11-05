// The type guards: values that hold to the declarations dist/ ships, so a declaration that
// narrows what a consumer may write fails `types:browser`. No page runs this module; tsc checks
// it against dist/.
// Adapted from spike-html-apps-components (51d2b92): test/browser/support/types.js, its guards
// the section tree's.

/** @import { SectionTree } from "../../../dist/section-tree.js" */

/** A section tree's label, a plain string: a narrower `label` fails here.
 * @type {Pick<SectionTree, "label">} */
export const labelled = { label: "On this page" };

/** The tag the module defines, as the tag name map types it: a missing entry fails here.
 * @type {HTMLElementTagNameMap["sl-section-tree"] | null} */
export const tree = null;
