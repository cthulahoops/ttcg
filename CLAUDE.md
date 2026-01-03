# Trick Taking Game - Project Documentation

## Overview
This is a Lord of the Rings-themed trick-taking card game implemented as a single-page web application. The game features 4 players (1 human, 3 AI) with unique character abilities and win conditions.

## Project Structure
- **game.html** - Main HTML structure and layout
- **game.css** - All styling and visual design
- **game.js** - Game logic, AI, and interactivity

## Game Rules Summary

### Deck Composition
- 4 normal suits (Mountains, Shadows, Forests, Hills): 1-8 cards each (32 cards)
- Rings suit: 1-5 cards (5 cards)
- Total: 37 cards
- Lost card: 1 card dealt face-up at start (never the 1 of Rings)
- Each player gets 9 cards

### Characters and Objectives
1. **Frodo** - Win at least two ring cards
2. **Gandalf** - Win at least one trick
3. **Merry** - Win exactly one or two tricks
4. **Celeborn** - Win at least three cards of the same rank

### Character Setup Actions
- **Frodo**: No setup action
- **Gandalf**: Optionally take the Lost card, then exchange with Frodo
- **Merry**: Exchange with Frodo
- **Celeborn**: Exchange with any player

### Special Rules
- **1 of Rings**: Can be used as trump to automatically win a trick (player chooses)
- **Rings Breaking**: Can't lead with Rings suit unless broken or only have Rings
- **Card Exchange**: Frodo cannot give away the 1 of Rings during setup
- **Game End**: When at least 3 players have no cards (accounts for Gandalf potentially having extra)

## Code Architecture

### Key Functions
- `newGame()` - Initializes a new game, deals cards, starts character assignment
- `playCard(playerIndex, card)` - Handles card playing logic and trick progression
- `determineTrickWinner()` - Calculates trick winner and checks for game end
- `checkObjective(playerIndex)` - Evaluates if a player has met their character's win condition
- `startSetupPhase()` - Manages character-specific setup actions
- `displayHands()` - Renders player hands (shows human's cards, hides AI cards)
- `updateTricksDisplay()` - Updates objective tracking UI

### Game State Object
The `gameState` object tracks:
- Player hands, tricks won, current trick
- Character assignments and available characters
- Setup phase state and card exchanges
- Trump choice status and lost card

### UI Features
- Real-time game log with scrolling
- Visual card display with suit-specific gradients
- Active player highlighting
- Objective progress tracking with live updates
- Modal dialogs for character selection, trump choice, and setup actions

## Development Notes

### AI Behavior
- Plays random legal moves (no strategy)
- Always uses 1 of Rings as trump when played
- Random character selection
- Random card exchanges during setup (50% chance for Gandalf to take lost card)

### Known Constraints
- Single-player only (human vs 3 AI)
- No save/load functionality
- AI has no strategic play logic
- No multiplayer support

## Testing Considerations
- Ensure 1 of Rings is never the lost card
- Verify Frodo cannot exchange 1 of Rings
- Test Gandalf's optional lost card choice
- Confirm game ends when 3+ players have empty hands
- Validate each character's objective checking logic
