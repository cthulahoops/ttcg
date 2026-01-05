// ===== SEAT CLASS =====
// Represents a player position/seat in the game

export class Seat {
  constructor(seatIndex, controller = "ai") {
    this.seatIndex = seatIndex;
    this.hand = null;              // Hand instance (set after creation)
    this.character = null;         // Character name or null
    this.threatCard = null;        // Threat card number or null
    this.tricksWon = [];           // Array of { number: number, cards: Card[] }
    this.controller = controller;  // "human" | "ai"
    this.isPyramid = false;        // Flag for 2-player pyramid seat
  }

  // Display helper - encapsulates complex display logic
  getDisplayName() {
    const directions = ["North", "East", "South", "West"];

    if (this.character) {
      // Use character name if assigned
      if (this.controller === "human") {
        return `${this.character} (You)`;
      } else if (this.isPyramid) {
        return `${this.character} (Pyramid)`;
      } else {
        return this.character;
      }
    } else {
      // Fall back to position name
      const baseName = directions[this.seatIndex];
      return this.seatIndex === 0 ? `${baseName} (You)` : baseName;
    }
  }

  // Trick management helpers
  addTrick(number, cards) {
    this.tricksWon.push({
      number: number,
      cards: cards,
    });
  }

  getTrickCount() {
    return this.tricksWon.length;
  }

  getAllWonCards() {
    // Flatten all cards from all tricks
    return this.tricksWon.flatMap((trick) => trick.cards);
  }
}
