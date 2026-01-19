// Character Registry
// Re-exports character definitions from individual files

export type {
  CharacterDefinition,
  CharacterObjective,
  CharacterDisplay,
  NewCharacterDefinition,
  NewCharacterObjective,
  NewCharacterDisplay,
  AnyCharacterDefinition,
  AnyCharacterObjective,
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
import type { AnyCharacterDefinition } from "./types";

export const characterRegistry = new Map<string, AnyCharacterDefinition>([
  [Frodo.name, Frodo],
  [Gandalf.name, Gandalf],
  [Merry.name, Merry],
  [Celeborn.name, Celeborn],
  [Pippin.name, Pippin],
  [Boromir.name, Boromir],
  [Sam.name, Sam],
  [Gimli.name, Gimli],
  [Legolas.name, Legolas],
  [Aragorn.name, Aragorn],
  [Goldberry.name, Goldberry],
  [Glorfindel.name, Glorfindel],
  [Galadriel.name, Galadriel],
  [GildorInglorian.name, GildorInglorian],
  [FarmerMaggot.name, FarmerMaggot],
  [FattyBolger.name, FattyBolger],
  [TomBombadil.name, TomBombadil],
  [BarlimanButterbur.name, BarlimanButterbur],
  [BillThePony.name, BillThePony],
  [Elrond.name, Elrond],
  [Arwen.name, Arwen],
  [Gloin.name, Gloin],
  [BilboBaggins.name, BilboBaggins],
  [Gwaihir.name, Gwaihir],
  [Shadowfax.name, Shadowfax],
]);

export const allCharacterNames = Array.from(characterRegistry.keys());
