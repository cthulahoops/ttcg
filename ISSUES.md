- [ ] Fatty doesn't reveal extra cards in 1 player when giving away.

  Unimplemented Character Mechanics

  2. Shadowfax (registry.ts:1125)
    - "Set one card aside" mechanic not implemented
    - Core character ability missing
  3. BilboBaggins (registry.ts:1050)
    - "Choose next leader" mechanic not implemented
    - Special ability when winning tricks
  4. BillThePony & Elrond (registry.ts:827, 853)
    - Simultaneous card exchanges not implemented
    - Currently sequential (may differ from intended rules)

  Lower Priority isCompletable Logic

  5. TomBombadil.isCompletable (registry.ts:753)
    - Currently returns true (too optimistic)
    - Needs proper completability check
  6. Aragorn.isCompletable (registry.ts:390)
    - Currently returns true (too optimistic)
    - Comment says "Simplified for now"
