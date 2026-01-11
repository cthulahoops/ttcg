# Trick Taking Game - Project Documentation

## Overview
This is a Lord of the Rings-themed trick-taking card game implemented as a single-page web application. The game supports 1-4 players with unique character abilities and win conditions.

## Project Structure

### Client (client/)
- **index.html** - Main HTML structure and layout
- **game.css** - All styling and visual design
- **display.ts** - Display/rendering functions for UI
- **controllers.ts** - Client-side controller extensions
- **utils.ts** - Client-side utility functions

### Server (server/)
- **server.ts** - Express server setup and HTTP endpoints
- **game-server.ts** - Server-side game state management
- **room-manager.ts** - Room/lobby management

### Shared (shared/)
Core game logic shared between client and server:
- **game.ts** - Game class and main game loop logic
- **hands.ts** - Hand class implementations (PlayerHand, PyramidHand, SolitaireHand, HiddenHand)
- **seat.ts** - Seat class for managing player state
- **controllers.ts** - Controller interface definitions
- **types.ts** - TypeScript type definitions (Card, Suit, Trick, etc.)
- **utils.ts** - Shared utility functions (card sorting, deck shuffling)
- **serialized.ts** - Serialized types for network transmission (SerializedGame, SerializedSeat, SerializedTrickPlay)
- **serialize.ts** - Serialization functions (serializeGameForSeat)
- **characters/registry.ts** - Character definitions and registry

## Game Modes

### 1-Player (Solitaire)
- All 4 seats controlled by the human player
- Each seat uses **SolitaireHand**: initially reveals 4 cards, reveals 1 additional card after each trick
- The 1 of Rings is guaranteed to be in the initially revealed cards for the seat that has it
- Player must complete all character objectives to win

### 2-Player (with Pyramid)
- 3 characters in play (one is a pyramid)
- Pyramid hand reveals cards as they become uncovered
- One human player, pyramid controlled by human or Frodo

### 3-Player
- 3 human/AI players
- Each player gets 12 cards
- Frodo needs 4 ring cards instead of 2

### 4-Player
- Classic mode: 1 human vs 3 AI
- Each player gets 9 cards

## Game Rules Summary

### Deck Composition
- 4 normal suits (Mountains, Shadows, Forests, Hills): 1-8 cards each (32 cards)
- Rings suit: 1-5 cards (5 cards)
- Total: 37 cards
- Lost card: 1 card dealt face-up at start (never the 1 of Rings)
- Cards per player: 9 (4-player), 12 (3-player)

### Characters and Objectives

The rules for characters are in `rules/characters.md`

Characters are defined in `characters/registry.ts` with their objectives and setup actions.

### Character Setup Actions
Each character has a specific setup action defined in their CharacterDefinition. Common patterns:
- Exchange cards with specific characters (Frodo, Gandalf, etc.)
- Optionally take the lost card
- Draw threat cards
- Choose threat cards
- Reveal hand face-up
- Give cards to other characters (Fatty Bolger)

### Special Rules
- **1 of Rings**: Can be used as trump to automatically win a trick (player chooses)
- **Rings Breaking**: Can't lead with Rings suit unless broken or only have Rings
- **Card Exchange**: Frodo cannot give away the 1 of Rings during setup
- **Game End**: When all tricks have been played (tracked by `game.tricksToPlay`, normally 9 or 12 but can be modified by characters like Fatty Bolger)
- **Empty Hands**: Players with no cards pass automatically during trick-taking; lead passes to next player with cards

## Code Architecture

### Hand Classes
- **Hand** - Abstract base class defining the hand interface
- **PlayerHand** - Standard visible hand for human players
- **PyramidHand** - Pyramid layout that reveals cards as they become uncovered
- **SolitaireHand** - Progressive reveal hand (4 initially, +1 per trick) for 1-player mode
- **HiddenHand** - Wrapper that hides cards from view (for AI players)

All hands implement:
- `addCard(card)` - Add a card to the hand
- `removeCard(card)` - Remove a card from the hand
- `getAvailableCards()` - Get playable cards
- `onTrickComplete()` - Called when trick ends (for revealing new cards)
- `render(domElement, isPlayable, onClick)` - Render the hand to DOM

### Key Functions
- `newGame()` - Initializes a new game, deals cards, creates Game instance
- `runGame()` - Orchestrates the game flow: character assignment, setup, and trick-taking phases
- `playSelectedCard()` - Handles card playing logic, updates seat.playedCards and current trick
- `determineTrickWinner()` - Calculates trick winner based on lead suit and trump
- `isObjectiveCompletable()` - Evaluates if a seat's objective is still achievable
- `runSetupPhase()` - Manages character-specific setup actions
- `displayHands()` - Renders player hands (shows human's cards, hides AI cards)
- `updateTricksDisplay()` - Updates objective tracking UI

### Seat Class
The `Seat` class represents a player position with:
- `hand` - Hand instance (PlayerHand, PyramidHand, SolitaireHand, or HiddenHand)
- `character` - Assigned character name
- `tricksWon` - Array of tricks won by this seat
- `playedCards` - Array of all cards played by this seat (in order)
- `controller` - HumanController or AIController
- `isPyramid` - Flag for 2-player pyramid seat

### Game Class
The `Game` class tracks:
- Player hands, tricks won, current trick
- Character assignments and available characters
- Setup phase state and card exchanges
- Trump choice status and lost card
- `tricksToPlay` - Total number of tricks that will be played (can be modified by characters like Fatty Bolger)
- `finished` getter - Returns true when game is over

### Game API for Character Setup Actions

**IMPORTANT DESIGN PRINCIPLE**: The Game class provides a narrow set of reusable utility methods. Do NOT add character-specific methods (e.g., `fattyGiveCards()`). Instead, use the generic utilities and implement character-specific logic in the character's setup function.

#### Available Methods

**Card Transfer:**
- `giveCard(fromSeat, toSeat)` - One-way card transfer from one seat to another
- `exchange(seat, setupContext, canExchangeWith)` - Two-way card exchange with another player (filtered by predicate)
- `exchangeWithLostCard(seat, setupContext)` - Swap one card with the lost card

**Lost Card:**
- `offerLostCard(seat)` - Let a player optionally take the lost card

**Threat Cards:**
- `drawThreatCard(seat, targetSuit, options?)` - Draw a random threat card (optionally excluding a value)
- `chooseThreatCard(seat)` - Choose from 3 threat card options

**Hand Visibility:**
- `revealHand(seat)` - Make a hand visible to all players

**Choices:**
- `choice(seat, question, options)` - Ask player to choose from a list of strings

**Game State Queries:**
- `hasCard(seat, suit, value)` - Check if a seat has won a specific card
- `cardGone(seat, suit, value)` - Check if a card has been won by someone else
- `displaySimple(met, completable)` - Return status icon HTML
- `displayThreatCard(seat, met, completable)` - Return threat card status HTML

#### Examples

**Good: Using generic methods**
```typescript
// Fatty Bolger gives cards using the reusable giveCard() method
setup: async (game, seat, _setupContext) => {
  for (const otherSeat of game.seats) {
    if (otherSeat.seatIndex !== seat.seatIndex) {
      await game.giveCard(seat, otherSeat);
    }
  }
  game.tricksToPlay += 1; // Character-specific logic stays in setup
}
```

**Bad: Character-specific methods**
```typescript
// DON'T DO THIS - no character-specific methods in Game class
game.fattyGiveCards(seat);  // ❌ Too specific
game.gandalfSetup(seat);     // ❌ Too specific
```

### Network Serialization

For network play, the game state must be serialized before transmission. The serialization system provides:

**Boundary Types** (`shared/serialized.ts`):
- `SerializedGame` - Complete game state for a specific viewing seat
- `SerializedSeat` - Seat data with controlled visibility
- `SerializedTrickPlay` - Minimal trick play data `{ seatIndex, card, isTrump }`

**Serialization Function** (`shared/serialize.ts`):
- `serializeGameForSeat(game, seatIndex)` - Main entry point for serialization
  - Converts Game instance to SerializedGame
  - Controls what information is visible to each seat
  - Single place to implement information hiding/filtering

**Design Principles**:
- Don't rely on automatic serialization of classes
- Define explicit boundary types to prevent shipping large object graphs
- Reduce payload size (TrickPlay uses seatIndex instead of full playerIndex)
- Prevent accidental hand leakage (filter based on viewing seat)
- Keep serialization logic centralized for easy hardening later

### UI Features
- Real-time game log with scrolling
- Visual card display with suit-specific gradients
- Active player highlighting
- Objective progress tracking with live updates
- Modal dialogs for character selection, trump choice, and setup actions

## Development Notes

### Commands
- **Type checking**: Use `npm run check` (NOT `npm run build`) to verify TypeScript types without building

### AI Behavior
- Plays random legal moves (no strategy)
- Always uses 1 of Rings as trump when played
- Random character selection
- Random card exchanges during setup (50% chance for Gandalf to take lost card)

### Known Constraints
- No save/load functionality
- AI has no strategic play logic
- No network multiplayer support (local only)

## Testing Considerations
- Ensure 1 of Rings is never the lost card
- Verify Frodo cannot exchange 1 of Rings
- Test Gandalf's optional lost card choice
- Confirm game ends when all tricks have been played (check `game.tricksToPlay`)
- Validate each character's objective checking logic
- **1-player mode**: Verify 1 of Rings is always in initially revealed cards
- **1-player mode**: Confirm each seat reveals exactly 1 card per trick
- **Pyramid mode**: Ensure cards only reveal after trick completion, not immediately when played
- **Fatty Bolger**: Verify one extra trick is played and players with empty hands pass correctly

ALWAYS: Correct any errors in CLAUDE.md.
