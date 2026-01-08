# Trick Taking Game - Project Documentation

## Overview
This is a Lord of the Rings-themed trick-taking card game implemented as a single-page web application. The game supports 1-4 players with unique character abilities and win conditions.

## Project Structure
- **game.html** - Main HTML structure and layout
- **game.css** - All styling and visual design
- **game.ts** - Game logic and main game loop
- **hands.ts** - Hand class implementations (PlayerHand, PyramidHand, SolitaireHand, HiddenHand)
- **utils.ts** - Utility functions for card sorting and rendering
- **seat.ts** - Seat class for managing player state
- **controllers.ts** - Controller implementations (HumanController, AIController)
- **types.ts** - TypeScript type definitions
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
Characters are defined in `characters/registry.ts` with their objectives and setup actions. Examples include:
1. **Frodo** - Win at least two ring cards (four in 3-player)
2. **Gandalf** - Win at least one trick
3. **Merry** - Win exactly one or two tricks
4. **Celeborn** - Win at least three cards of the same rank
5. **Pippin** - Win the fewest (or joint fewest) tricks
6. **Boromir** - Win the last trick; do NOT win the 1 of Rings
7. **Sam** - Win the Hills card matching your threat card
8. **Gimli** - Win the Mountains card matching your threat card
9. **Legolas** - Win the Forests card matching your threat card
10. **Aragorn** - Win exactly the number of tricks shown on your threat card
11. **Goldberry** - Win exactly three tricks in a row and no other tricks
12. **Glorfindel** - Win every Shadows card
13. **Galadriel** - Win neither the fewest nor the most tricks
14. **Gildor Inglorian** - Play a forests card in final trick
15. **Farmer Maggot** - Win at least two cards matching the threat card rank

### Character Setup Actions
Each character has a specific setup action defined in their CharacterDefinition. Common patterns:
- Exchange cards with specific characters (Frodo, Gandalf, etc.)
- Optionally take the lost card
- Draw threat cards
- Choose threat cards
- Reveal hand face-up

### Special Rules
- **1 of Rings**: Can be used as trump to automatically win a trick (player chooses)
- **Rings Breaking**: Can't lead with Rings suit unless broken or only have Rings
- **Card Exchange**: Frodo cannot give away the 1 of Rings during setup
- **Game End**: When at least 3 players have no cards (accounts for Gandalf potentially having extra)

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
- `finished` getter - Returns true when game is over

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
- Confirm game ends when 3+ players have empty hands
- Validate each character's objective checking logic
- **1-player mode**: Verify 1 of Rings is always in initially revealed cards
- **1-player mode**: Confirm each seat reveals exactly 1 card per trick
- **Pyramid mode**: Ensure cards only reveal after trick completion, not immediately when played

ALWAYS: Correct any errors in CLAUDE.md.
