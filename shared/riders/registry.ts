// Rider Registry

import type { RiderDefinition } from "./types";
import { MorgulKnife } from "./morgul-knife";
import { BlackBreath } from "./black-breath";
import { Terror } from "./terror";
import { TheUnseen } from "./the-unseen";

export type { RiderDefinition } from "./types";

export const allRiders: RiderDefinition[] = [
  MorgulKnife,
  BlackBreath,
  Terror,
  TheUnseen,
];
