// Character Registry
// Re-exports character definitions from individual files

export type { CharacterDefinition, CharacterObjective } from "./types";

import { Frodo } from "./frodo";
import { Gandalf } from "./gandalf";
import { Merry } from "./merry";
import { Celeborn } from "./celeborn";
import { Pippin } from "./pippin";
import { Boromir } from "./boromir";
import { Sam } from "./sam";
import { Gimli } from "./gimli";
import { Legolas } from "./legolas";
import { Aragorn } from "./aragorn";
import { Goldberry } from "./goldberry";
import { Glorfindel } from "./glorfindel";
import { Galadriel } from "./galadriel";
import { GildorInglorian } from "./gildor-inglorian";
import { FarmerMaggot } from "./farmer-maggot";
import { FattyBolger } from "./fatty-bolger";
import { TomBombadil } from "./tom-bombadil";
import { BarlimanButterbur } from "./barliman-butterbur";
import { BillThePony } from "./bill-the-pony";
import { Elrond } from "./elrond";
import { Arwen } from "./arwen";
import { Gloin } from "./gloin";
import { BilboBaggins } from "./bilbo-baggins";
import { Gwaihir } from "./gwaihir";
import { Shadowfax } from "./shadowfax";
import { SamBurdened } from "./burdened/sam";
import { LegolasBurdened } from "./burdened/legolas";
import { GimliBurdened } from "./burdened/gimli";
import { AragornBurdened } from "./burdened/aragorn";
import { BoromirBurdened } from "./burdened/boromir";
import { MerryBurdened } from "./burdened/merry";
import { PippinBurdened } from "./burdened/pippin";
import type { CharacterDefinition } from "./types";

// Character pools
// Special characters have unique assignment rules
export const specialCharacters: CharacterDefinition[] = [Frodo, Gandalf];

// Fellowship members (Gandalf included here for standard mode)
export const fellowshipCharacters: CharacterDefinition[] = [
  Gandalf,
  Merry,
  Pippin,
  Sam,
  Aragorn,
  Boromir,
  Legolas,
  Gimli,
];

// Extra characters from Middle-earth
export const extraCharacters: CharacterDefinition[] = [
  Celeborn,
  Goldberry,
  Glorfindel,
  Galadriel,
  GildorInglorian,
  FarmerMaggot,
  FattyBolger,
  TomBombadil,
  BarlimanButterbur,
  BillThePony,
  Elrond,
  Arwen,
  Gloin,
  BilboBaggins,
  Gwaihir,
  Shadowfax,
];

export const burdenedCharacters: CharacterDefinition[] = [
  SamBurdened,
  LegolasBurdened,
  GimliBurdened,
  AragornBurdened,
  BoromirBurdened,
  MerryBurdened,
  PippinBurdened,
];

export const allCharacters: CharacterDefinition[] = [
  Frodo,
  ...fellowshipCharacters.filter((c) => c !== Gandalf),
  Gandalf,
  ...extraCharacters,
  ...burdenedCharacters,
];

export const characterRegistry = new Map<string, CharacterDefinition>(
  allCharacters.map((c) => [c.name, c])
);

export const allCharacterNames = allCharacters.map((c) => c.name);
