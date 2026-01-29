// Character Registry
// Re-exports character definitions from individual files

export type {
  CharacterDefinition,
  CharacterObjective,
  CharacterDisplay,
} from "./types";

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
import type { CharacterDefinition } from "./types";

export const allCharacters: CharacterDefinition[] = [
  Frodo,
  Gandalf,
  Merry,
  Celeborn,
  Pippin,
  Boromir,
  Sam,
  Gimli,
  Legolas,
  Aragorn,
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

export const characterRegistry = new Map<string, CharacterDefinition>(
  allCharacters.map((c) => [c.name, c])
);

export const allCharacterNames = allCharacters.map((c) => c.name);
