// The type guards: values that hold to the declarations dist/ ships, so a declaration that
// narrows what a consumer may write fails `types:browser`. No page runs this module; tsc checks
// it against dist/.
// Adapted from spike-html-apps-components (51d2b92): test/browser/support/types.js, its guards
// the section tree's and the site components'.

/** @import { SectionTree } from "../../../dist/section-tree.js" */
/** @import { PageHeader } from "../../../dist/page-header.js" */
/** @import { SiteIndex } from "../../../dist/site-index.js" */
/** @import { Site, SiteNav } from "../../../dist/site-nav.js" */

/** A section tree's label, a plain string: a narrower `label` fails here.
 * @type {Pick<SectionTree, "label">} */
export const labelled = { label: "On this page" };

/** A page header, an element with no property of its own to narrow.
 * @type {PageHeader | null} */
export const header = null;

/** A site index's label, a plain string: a narrower `label` fails here.
 * @type {Pick<SiteIndex, "label">} */
export const indexed = { label: "Site" };

/** A site nav's label, a plain string: a narrower `label` fails here.
 * @type {Pick<SiteNav, "label">} */
export const navigated = { label: "Sites" };

/** A site the nav lists, its repository and label plain strings: a narrower field fails here.
 * @type {Site} */
export const site = { repository: "spike-html-hosting-example", label: "Example" };

/** The tags the modules define, as the tag name map types them: a missing entry fails here.
 * @type {[
 *   HTMLElementTagNameMap["sl-section-tree"] | null,
 *   HTMLElementTagNameMap["sl-page-header"] | null,
 *   HTMLElementTagNameMap["sl-site-index"] | null,
 *   HTMLElementTagNameMap["sl-site-nav"] | null,
 * ]} */
export const tags = [null, null, null, null];
