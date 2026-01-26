// Rider type definitions

import type { CharacterObjective, CharacterDisplay } from "../characters/types";

export interface RiderDefinition {
  name: string;
  objective: CharacterObjective;
  display: CharacterDisplay;
}
