// Rider Registry

import type { RiderDefinition } from "./types";
import { MorgulKnife } from "./morgul-knife";
import { BlackBreath } from "./black-breath";
import { Terror } from "./terror";

export type { RiderDefinition } from "./types";

export const riderRegistry = new Map<string, RiderDefinition>([
  [MorgulKnife.name, MorgulKnife],
  [BlackBreath.name, BlackBreath],
  [Terror.name, Terror],
]);

export const allRiderNames = Array.from(riderRegistry.keys());
