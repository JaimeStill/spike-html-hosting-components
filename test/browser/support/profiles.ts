// The browser tier's profile runs, which every component's cases share: the registry a page's
// full entry fills, read from the foundation's store, and the runs it gives, every palette at the
// other facets' defaults, then each other space and type, each light and dark, at 1280 and 390 px;
// and the viewport's size, which each run sets.

import { until } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Page } from "@jaimestill/spike-html-apps-tooling/browser.js";

/** The registry's names by facet, the first of each the default. */
export interface Registry {
  color: string[];
  space: string[];
  type: string[];
}

/** One run: a profile's facets and scheme, as the fixtures' query names them, and a width. */
export interface Run {
  palette: string;
  space: string;
  type: string;
  scheme: string;
  width: number;
}

/** The registry the loaded page's entry filled, from the foundation's store at its global key. */
export const registry = (page: Page): Promise<Registry> =>
  page.evaluate(`(() => {
    const store = globalThis[Symbol.for("spike-html-apps-foundation.registry")];
    return { color: store.color, space: store.space, type: store.type };
  })()`);

/** Every palette at the other facets' defaults, then each other space and type, each light and
 * dark, at 1280 and 390 px. */
export function runs(registry: Registry): Run[] {
  const [palette] = registry.color;
  const [space] = registry.space;
  const [type] = registry.type;
  const profiles = [
    ...registry.color.map((name) => ({ palette: name, space, type })),
    ...registry.space.slice(1).map((name) => ({ palette, space: name, type })),
    ...registry.type.slice(1).map((name) => ({ palette, space, type: name })),
  ];
  return profiles.flatMap((profile) =>
    ["light", "dark"].flatMap((scheme) =>
      [1280, 390].map((width) => ({ ...profile, scheme, width })),
    ),
  );
}

/** The viewport's size. */
export async function resize(page: Page, width: number, height = 800): Promise<void> {
  await page.cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await until(page, `innerWidth === ${width} && innerHeight === ${height}`);
}
