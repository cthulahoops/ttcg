Step-by-Step Fix Plan
Phase 1: Display Bugs (getObjectiveCards)

Bug 1: Shadowfax

    File: shared/characters/shadowfax.ts
    Change getObjectiveCards() to return trick markers (count tricks containing hills)
    Expected: Show 0-2+ trick card backs, not individual hills cards

Bug 2: Gwaihir

    File: shared/characters/gwaihir.ts
    Change getObjectiveCards() to return only mountain trick markers
    Expected: Show count of tricks containing mountains, not all tricks won

Phase 2: Early Completion Logic Bugs

Bug 3: Pippin - "Win the fewest (or joint fewest) tricks"
    Status: DONE

    File: shared/characters/pippin.ts
    Update isCompleted() to check if guaranteed fewest
    Logic: myMax <= othersMin where:
        myMax = myCount + tricksRemaining
        othersMin = min(other players' current counts)
    Use <= because joint fewest is acceptable

Bug 4: Arwen - "Win the most forests cards"
    Status: DONE

    File: shared/characters/arwen.ts
    Update isCompleted() to check if guaranteed most
    Logic: myMin > othersMax where:
        myMin = myCount (current forests)
        othersMax = max(otherCount + forestsRemaining) for each other player
    Use strict > because ties don't count as "most"

Bug 5: Gloin - "Win the most mountains cards"
    Status: DONE

    File: shared/characters/gloin.ts
    Same logic as Arwen but for mountains suit
    Logic: myMin > othersMax

Bug 6: Galadriel - "Win neither the fewest nor the most tricks"
    Status: DONE

    File: shared/characters/galadriel.ts
    Update isCompleted() to check if guaranteed neither
    Logic requires BOTH:
        Guaranteed not fewest: Math.max(playersBelow) + tricksRemaining < myCount (strict <)
        Guaranteed not most: myCount + tricksRemaining < Math.min(playersAbove) (strict <)


