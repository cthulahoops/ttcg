// Import modules
import {
  Hand,
  PlayerHand,
  PyramidHand,
  HiddenHand,
  SolitaireHand,
} from "./hands.js";
import { shuffleDeck, sortHand, createCardElement, delay } from "./utils.js";
import { Seat } from "./seat.js";

import { HumanController, AIController } from "./controllers.js";

// All possible characters in the game
const allCharacters = [
  // Added later: "Frodo",
  "Gandalf",
  "Merry",
  "Celeborn",
  "Pippin",
  "Boromir",
  "Sam",
  "Gimli",
  "Legolas",
  "Aragorn",
];

// Characters that draw threat cards during setup
const threatCardCharacters = ["Sam", "Gimli", "Legolas"];

// Map threat card characters to their target suit
const threatCardSuits = {
  Sam: "hills",
  Gimli: "mountains",
  Legolas: "forests",
};

// ===== ASYNC HELPERS =====

// ===== GAME FUNCTIONS =====

function getPlayerDisplayName(gameState, playerIndex) {
  return gameState.seats[playerIndex].getDisplayName();
}

function findSeatByCharacter(gameState, characterName) {
  return gameState.seats.findIndex((seat) => seat.character === characterName);
}

const characterObjectives = {
  Frodo: "Win at least two ring cards",
  Gandalf: "Win at least one trick",
  Merry: "Win exactly one or two tricks",
  Celeborn: "Win at least three cards of the same rank",
  Pippin: "Win the fewest (or joint fewest) tricks",
  Boromir: "Win the last trick; do NOT win the 1 of Rings",
  Sam: "Win the Hills card matching your threat card",
  Gimli: "Win the Mountains card matching your threat card",
  Legolas: "Win the Forests card matching your threat card",
  Aragorn: "Win exactly the number of tricks shown on your threat card",
};

// Define which characters each character can exchange with during setup
// null means "any player", [] means "no exchange"
// { except: [...] } means "any player except these characters"
const characterExchangeRules = {
  Frodo: [], // No exchange
  Gandalf: ["Frodo"], // Exchange with Frodo only (after optional lost card)
  Merry: ["Frodo", "Pippin", "Sam"],
  Celeborn: null, // Exchange with any player
  Pippin: ["Frodo", "Merry", "Sam"],
  Boromir: { except: ["Frodo"] }, // Exchange with anyone except Frodo
  Sam: ["Frodo", "Merry", "Pippin"], // Draw threat card first, then exchange
  Gimli: ["Legolas", "Aragorn"], // Draw threat card first, then exchange
  Legolas: ["Gimli", "Aragorn"], // Draw threat card first, then exchange
  Aragorn: ["Gimli", "Legolas"], // Choose threat card first, then exchange
};

function addToGameLog(message, important = false) {
  const logDiv = document.getElementById("gameLog");
  const entry = document.createElement("div");
  entry.className = "log-entry" + (important ? " important" : "");
  entry.textContent = message;
  logDiv.appendChild(entry);

  // Auto-scroll to bottom
  logDiv.scrollTop = logDiv.scrollHeight;
}

function clearGameLog() {
  document.getElementById("gameLog").innerHTML = "";
}

function createDeck() {
  const deck = [];
  const normalSuits = ["mountains", "shadows", "forests", "hills"];

  // Add normal suits (1-8)
  for (const suit of normalSuits) {
    for (let value = 1; value <= 8; value++) {
      deck.push({ suit, value });
    }
  }

  // Add rings suit (1-5)
  for (let value = 1; value <= 5; value++) {
    deck.push({ suit: "rings", value });
  }

  return deck;
}

function findPlayerWithCard(gameState, suit, value) {
  for (const seat of gameState.seats) {
    if (
      seat.hand
        .getAllCards()
        .some((card) => card.suit === suit && card.value === value)
    ) {
      return seat.seatIndex;
    }
  }
  return -1;
}

function isLegalMove(gameState, playerIndex, card) {
  const playerHand = gameState.seats[playerIndex].hand.getAvailableCards();

  // If leading the trick
  if (gameState.currentTrick.length === 0) {
    // Can't lead rings unless:
    // 1. Rings have been broken, OR
    // 2. Player only has rings
    if (card.suit === "rings") {
      const onlyHasRings = playerHand.every((c) => c.suit === "rings");
      if (!gameState.ringsBroken && !onlyHasRings) {
        return false;
      }
    }
    return true;
  }

  // Must follow suit if possible
  const hasLeadSuit = playerHand.some((c) => c.suit === gameState.leadSuit);

  if (hasLeadSuit) {
    return card.suit === gameState.leadSuit;
  }

  // If can't follow suit, can play anything
  return true;
}

function getLegalMoves(gameState, playerIndex) {
  const availableCards = gameState.seats[playerIndex].hand.getAvailableCards();
  return availableCards.filter((card) =>
    isLegalMove(gameState, playerIndex, card),
  );
}

async function assignCharacterToPlayer(gameState, playerIndex) {
  // Build title and message
  let title = `${getPlayerDisplayName(gameState, playerIndex)} - Choose Your Character`;
  let message = "Select a character to play as";

  if (gameState.seats[playerIndex].isPyramid) {
    title = `Choose Character for Pyramid Player`;
    message = `You control the pyramid - select its character`;
  }

  // Build character buttons
  const buttons = gameState.availableCharacters.map((char) => ({
    label: char,
    value: char,
  }));

  const seat = gameState.seats[playerIndex];

  const character = await seat.controller.choice({
    title,
    message,
    buttons,
  });

  // Log character assignment (before assignment to show position name)
  addToGameLog(
    `${getPlayerDisplayName(gameState, playerIndex)} chose ${character}`,
  );

  // Assign character to current player
  gameState.seats[playerIndex].character = character;
  gameState.availableCharacters = gameState.availableCharacters.filter(
    (c) => c !== character,
  );
}

function updatePlayerHeadings(gameState) {
  for (const seat of gameState.seats) {
    const nameElement = document.getElementById(`playerName${seat.seatIndex + 1}`);
    const objectiveElement = document.getElementById(`objective${seat.seatIndex + 1}`);
    const character = seat.character;

    if (character) {
      if (seat.seatIndex === 0) {
        // Human player - show "You"
        nameElement.textContent = `${character} (You)`;
      } else if (seat.isPyramid) {
        // Pyramid player - indicate it's the pyramid
        nameElement.textContent = `${character} (Pyramid)`;
      } else {
        // AI players - show character name
        nameElement.textContent = character;
      }

      // Show objective (adjust Frodo's objective for 3-player mode)
      let objective = characterObjectives[character];
      if (character === "Frodo" && gameState.numCharacters === 3) {
        objective = "Win at least four ring cards";
      }
      objectiveElement.textContent = `Goal: ${objective}`;
    }
  }
}

// ===== SETUP PHASE =====

async function performSetupAction(gameState, playerIndex, setupContext) {
  const character = gameState.seats[playerIndex].character;

  updateGameStatus(
    gameState,
    `${getPlayerDisplayName(gameState, playerIndex)} - Setup Phase`,
  );

  // Get exchange rules for this character
  const exchangeRule = characterExchangeRules[character];

  // Determine what setup action this character needs
  if (
    exchangeRule === undefined ||
    (Array.isArray(exchangeRule) && exchangeRule.length === 0)
  ) {
    // No exchange (e.g., Frodo)
  } else if (character === "Gandalf") {
    // Gandalf has special logic (optional lost card before exchange)
    await setupGandalf(gameState, playerIndex, setupContext);
  } else if (character === "Aragorn") {
    // Aragorn chooses a threat card (not random draw)
    await setupAragorn(
      gameState,
      playerIndex,
      character,
      exchangeRule,
      setupContext,
    );
  } else if (threatCardCharacters.includes(character)) {
    // Characters that draw threat cards before exchange
    await setupThreatCardCharacter(
      gameState,
      playerIndex,
      character,
      exchangeRule,
      setupContext,
    );
  } else {
    // All other characters use standard exchange logic
    await setupStandardExchange(
      gameState,
      playerIndex,
      character,
      exchangeRule,
      setupContext,
    );
  }
}

function getValidExchangePlayers(gameState, playerIndex, exchangeRule) {
  // Returns an array of player indices that are valid exchange targets
  let validPlayers = [];

  if (exchangeRule === null) {
    // Can exchange with anyone
    for (const seat of gameState.seats) {
      if (seat.seatIndex !== playerIndex) {
        validPlayers.push(seat.seatIndex);
      }
    }
  } else if (Array.isArray(exchangeRule)) {
    // Can only exchange with specific characters
    validPlayers = exchangeRule
      .map((charName) => findSeatByCharacter(gameState, charName))
      .filter(
        (p) => p !== -1 && p !== playerIndex && p < gameState.numCharacters,
      );
  } else if (exchangeRule.except) {
    // Can exchange with anyone except specific characters
    const excludedPlayers = exchangeRule.except.map((charName) =>
      findSeatByCharacter(gameState, charName),
    );
    for (const seat of gameState.seats) {
      if (seat.seatIndex !== playerIndex && !excludedPlayers.includes(seat.seatIndex)) {
        validPlayers.push(seat.seatIndex);
      }
    }
  }

  return validPlayers;
}

// ===== EXCHANGE HELPER FUNCTIONS =====

async function chooseCardToGive(gameState, fromPlayer, toPlayer) {
  const isFrodo = gameState.seats[fromPlayer].character === "Frodo";

  const availableCards = gameState.seats[fromPlayer].hand.getAvailableCards();
  const sortedCards = sortHand([...availableCards]);

  // Filter out 1 of Rings if Frodo (only pass playable cards)
  const playableCards = sortedCards.filter((card) => {
    const isOneRing = card.suit === "rings" && card.value === 1;
    return !isFrodo || !isOneRing;
  });

  let message = `Select a card to give to ${getPlayerDisplayName(gameState, toPlayer)}`;
  if (isFrodo) {
    message += " (Frodo cannot give away the 1 of Rings)";
  }

  const selectedCard = await gameState.seats[fromPlayer].controller.choice({
    title: "Choose Card to Exchange",
    message,
    cards: playableCards,
  });

  return selectedCard;
}

async function chooseCardToReturn(
  gameState,
  fromPlayer,
  toPlayer,
  receivedCard,
) {
  const isFrodo = gameState.seats[fromPlayer].character === "Frodo";

  const availableCards = gameState.seats[fromPlayer].hand.getAvailableCards();
  const tempHand = sortHand([...availableCards, receivedCard]);

  // Filter out 1 of Rings if Frodo (only pass playable cards)
  const playableCards = tempHand.filter((card) => {
    const isOneRing = card.suit === "rings" && card.value === 1;
    return !isFrodo || !isOneRing;
  });

  let message = `You received ${receivedCard.value} of ${receivedCard.suit}. Select a card to give back`;
  if (isFrodo) {
    message += " (Frodo cannot give away the 1 of Rings)";
  }

  const selectedCard = await gameState.seats[fromPlayer].controller.choice({
    title: "Choose Card to Return",
    message,
    cards: playableCards,
  });

  return selectedCard;
}

async function performExchange(gameState, fromPlayer, toPlayer) {
  updateGameStatus(
    gameState,
    `${getPlayerDisplayName(gameState, fromPlayer)} exchanges with ${getPlayerDisplayName(gameState, toPlayer)}`,
  );
  // Step 1: Give card
  const cardToGive = await chooseCardToGive(gameState, fromPlayer, toPlayer);
  gameState.seats[fromPlayer].hand.removeCard(cardToGive);

  // Only log if human player is involved
  if (fromPlayer === 0 || toPlayer === 0) {
    addToGameLog(
      `${getPlayerDisplayName(gameState, fromPlayer)} gives ${cardToGive.value} of ${cardToGive.suit} to ${getPlayerDisplayName(gameState, toPlayer)}`,
    );
  } else {
    addToGameLog(
      `${getPlayerDisplayName(gameState, fromPlayer)} exchanges with ${getPlayerDisplayName(gameState, toPlayer)}`,
    );
  }

  updateGameStatus(
    gameState,
    `${getPlayerDisplayName(gameState, fromPlayer)} gives ${cardToGive.value} of ${cardToGive.suit} to ${getPlayerDisplayName(gameState, toPlayer)}`,
  );
  displayHands(gameState, gameState.seats);

  // Step 2: Return card
  const cardToReturn = await chooseCardToReturn(
    gameState,
    toPlayer,
    fromPlayer,
    cardToGive,
  );

  // Check if this is the card that was just given
  const isReceivedCard =
    cardToReturn.suit === cardToGive.suit &&
    cardToReturn.value === cardToGive.value;

  if (!isReceivedCard) {
    // Remove from toPlayer's hand
    gameState.seats[toPlayer].hand.removeCard(cardToReturn);
  }

  // Add card to fromPlayer's hand
  gameState.seats[fromPlayer].hand.addCard(cardToReturn);

  // Add the originally exchanged card to toPlayer's hand (if they didn't return it)
  if (!isReceivedCard) {
    gameState.seats[toPlayer].hand.addCard(cardToGive);
  }

  // Only log return details if human player is involved
  if (fromPlayer === 0 || toPlayer === 0) {
    addToGameLog(
      `${getPlayerDisplayName(gameState, toPlayer)} returns ${cardToReturn.value} of ${cardToReturn.suit}`,
    );
  }

  updateGameStatus(
    gameState,
    `${getPlayerDisplayName(gameState, toPlayer)} returns ${cardToReturn.value} of ${cardToReturn.suit}`,
  );
  displayHands(gameState, gameState.seats);
}

async function setupStandardExchange(
  gameState,
  playerIndex,
  character,
  exchangeRule,
  setupContext,
) {
  // In 1-player mode, check if exchange already made
  if (gameState.playerCount === 1 && setupContext.exchangeMade) {
    return;
  }

  const validPlayers = getValidExchangePlayers(
    gameState,
    playerIndex,
    exchangeRule,
  );

  if (validPlayers.length === 0) {
    // No valid exchange partners - skip exchange
    addToGameLog(
      `${getPlayerDisplayName(gameState, playerIndex)} has no valid exchange partners`,
    );
    return;
  }

  // In 1-player mode, ask if player wants to exchange
  if (gameState.playerCount === 1) {
    // Determine target player for the message
    let targetDescription;
    if (validPlayers.length === 1) {
      targetDescription = getPlayerDisplayName(gameState, validPlayers[0]);
    } else if (exchangeRule === null) {
      targetDescription = "another player";
    } else if (Array.isArray(exchangeRule)) {
      const charNames = validPlayers
        .map((p) => gameState.seats[p].character)
        .join(" or ");
      targetDescription = charNames;
    } else {
      targetDescription = "another player";
    }

    const wantsToExchange = await gameState.seats[
      playerIndex
    ].controller.choice({
      title: `${character} - Exchange?`,
      message: `Do you want ${character} to exchange with ${targetDescription}?`,
      buttons: [
        { label: "Yes, Exchange", value: true },
        { label: "No, Skip", value: false },
      ],
    });

    if (!wantsToExchange) {
      return;
    }
  }

  // Choose target player
  let targetPlayer;
  if (validPlayers.length === 1) {
    targetPlayer = validPlayers[0];
  } else {
    targetPlayer = await showExchangePlayerSelectionDialog(
      gameState,
      playerIndex,
      character,
      exchangeRule,
    );
  }

  // Perform exchange
  await performExchange(gameState, playerIndex, targetPlayer);

  // Mark exchange as made in 1-player mode
  if (gameState.playerCount === 1) {
    setupContext.exchangeMade = true;
  }
}

async function setupAragorn(
  gameState,
  playerIndex,
  character,
  exchangeRule,
  setupContext,
) {
  const seat = gameState.seats[playerIndex];

  seat.threatCard = await chooseThreatCard(
    gameState,
    seat,
    gameState.threatDeck,
  );

  updateTricksDisplay(gameState);

  await setupStandardExchange(
    gameState,
    playerIndex,
    character,
    exchangeRule,
    setupContext,
  );
}

async function chooseThreatCard(gameState, seat, threatDeck) {
  if (threatDeck.length === 0) {
    addToGameLog(`${seat.getDisplayName()} - No threat cards remaining!`);
    throw Exception("Threat deck is empty somehow!");
  }

  const buttons = threatDeck.map((card) => ({
    label: String(card),
    value: card,
  }));
  buttons.sort((a, b) => a.value - b.value);

  const threatCard = await seat.controller.choice({
    title: `${seat.character} - Choose Threat Card`,
    message: "Choose a threat card from the deck:",
    buttons,
  });

  // Remove the chosen card from the deck
  const cardIndex = gameState.threatDeck.indexOf(threatCard);
  gameState.threatDeck.splice(cardIndex, 1);

  addToGameLog(
    `${seat.getDisplayName()} chooses threat card: ${threatCard}`,
    true,
  );
  updateGameStatus(
    gameState,
    `${seat.getDisplayName()} chooses threat card ${threatCard}`,
  );

  return threatCard;
}

async function setupThreatCardCharacter(
  gameState,
  playerIndex,
  character,
  exchangeRule,
  setupContext,
) {
  // Draw a threat card from the deck
  if (gameState.threatDeck.length === 0) {
    addToGameLog(
      `${getPlayerDisplayName(gameState, playerIndex)} - No threat cards remaining!`,
    );
    throw new Exception("Threat deck is empty!");
    return;
  }

  let threatCard;
  const targetSuit = threatCardSuits[character];

  // Keep drawing until we get a card that doesn't match the lost card
  // (if the lost card is in the target suit with the same rank)
  do {
    if (gameState.threatDeck.length === 0) {
      addToGameLog(
        `${getPlayerDisplayName(gameState, playerIndex)} - No valid threat cards remaining!`,
      );
      throw new Exception("Threat deck is empty!");
      return;
    }
    threatCard = gameState.threatDeck.shift();
  } while (
    gameState.lostCard &&
    gameState.lostCard.suit === targetSuit &&
    gameState.lostCard.value === threatCard
  );

  gameState.seats[playerIndex].threatCard = threatCard;

  addToGameLog(
    `${getPlayerDisplayName(gameState, playerIndex)} draws threat card: ${threatCard}`,
    true,
  );
  updateGameStatus(
    gameState,
    `${getPlayerDisplayName(gameState, playerIndex)} draws threat card ${threatCard}`,
  );

  // Update tricks display to show the threat card
  updateTricksDisplay(gameState);

  await setupStandardExchange(
    gameState,
    playerIndex,
    character,
    exchangeRule,
    setupContext,
  );
}

async function setupGandalf(gameState, playerIndex, setupContext) {
  // Gandalf: Optionally take Lost card to hand, then Exchange with Frodo
  let takeLostCard;

  takeLostCard = await gameState.seats[playerIndex].controller.choice({
    title: "Gandalf - Take Lost Card?",
    message: `The Lost card is ${gameState.lostCard.value} of ${gameState.lostCard.suit}. Do you want to take it?`,
    buttons: [
      { label: "Yes, Take It", value: true },
      { label: "No, Leave It", value: false },
    ],
  });

  if (takeLostCard && gameState.lostCard) {
    // Add lost card to Gandalf's hand
    gameState.seats[playerIndex].hand.addCard(gameState.lostCard);

    // Clear the lost card display
    document.getElementById("lostCard").innerHTML = "";

    addToGameLog(
      `${getPlayerDisplayName(gameState, playerIndex)} takes the Lost card (${gameState.lostCard.value} of ${gameState.lostCard.suit})`,
    );
    updateGameStatus(
      gameState,
      `${getPlayerDisplayName(gameState, playerIndex)} takes the Lost card`,
    );
    displayHands(gameState, gameState.seats);
  } else {
    // Don't take the card, but still exchange with Frodo
    addToGameLog(
      `${getPlayerDisplayName(gameState, playerIndex)} declines the Lost card`,
    );
    updateGameStatus(
      gameState,
      `${getPlayerDisplayName(gameState, playerIndex)} declines the Lost card`,
    );
  }

  // Proceed to exchange with Frodo
  const character = gameState.seats[playerIndex].character;
  const exchangeRule = characterExchangeRules[character];
  await setupStandardExchange(
    gameState,
    playerIndex,
    character,
    exchangeRule,
    setupContext,
  );
}

async function showExchangePlayerSelectionDialog(
  gameState,
  playerIndex,
  character,
  exchangeRule,
) {
  let message = "";
  const validPlayers = getValidExchangePlayers(
    gameState,
    playerIndex,
    exchangeRule,
  );

  if (exchangeRule === null) {
    // Can exchange with any player
    message = "Choose a player to exchange with:";
  } else if (Array.isArray(exchangeRule)) {
    // Only show character names that are actually in the game
    const availableCharNames = validPlayers
      .map((p) => gameState.seats[p].character)
      .join(" or ");
    message = `Choose ${availableCharNames} to exchange with:`;
  } else if (exchangeRule.except) {
    // Can exchange with anyone except specific characters
    const excludedNames = exchangeRule.except.join(", ");
    message = `Choose a player to exchange with (except ${excludedNames}):`;
  }

  // Create buttons for valid players
  const buttons = validPlayers.map((p) => ({
    label: getPlayerDisplayName(gameState, p),
    value: p,
  }));

  const selectedPlayer = await gameState.seats[playerIndex].controller.choice({
    title: `${character} - Setup`,
    message,
    buttons,
  });

  return selectedPlayer;
}

function checkObjective(gameState, seat) {
  const character = seat.character;
  const wonCards = seat.getAllWonCards();
  const trickCount = seat.getTrickCount();

  switch (character) {
    case "Frodo":
      // Win at least two ring cards (4 in 3-character mode)
      const ringsNeeded = gameState.numCharacters === 3 ? 4 : 2;
      const ringCards = wonCards.filter((card) => card.suit === "rings").length;
      return ringCards >= ringsNeeded;

    case "Gandalf":
      // Win at least one trick
      return trickCount >= 1;

    case "Merry":
      // Win exactly one or two tricks
      return trickCount === 1 || trickCount === 2;

    case "Celeborn":
      // Win at least three cards of the same rank
      const rankCounts = {};
      wonCards.forEach((card) => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
      });
      return Object.values(rankCounts).some((count) => count >= 3);

    case "Pippin":
      // Win the fewest (or joint fewest) tricks
      const allTrickCounts = gameState.seats.map((s) => s.getTrickCount());
      const minTricks = Math.min(...allTrickCounts);
      return trickCount === minTricks;

    case "Boromir":
      // Win the last trick AND do NOT win the 1 of rings
      const wonLastTrick = gameState.lastTrickWinner === playerIndex;
      const hasOneRing = wonCards.some(
        (card) => card.suit === "rings" && card.value === 1,
      );
      return wonLastTrick && !hasOneRing;

    case "Sam":
      // Win the Hills card matching the threat card
      const samThreat = gameState.seats[playerIndex].threatCard;
      if (!samThreat) return false;
      return wonCards.some(
        (card) => card.suit === "hills" && card.value === samThreat,
      );

    case "Gimli":
      // Win the Mountains card matching the threat card
      const gimliThreat = gameState.seats[playerIndex].threatCard;
      if (!gimliThreat) return false;
      return wonCards.some(
        (card) => card.suit === "mountains" && card.value === gimliThreat,
      );

    case "Legolas":
      // Win the Forests card matching the threat card
      const legolsThreat = gameState.seats[playerIndex].threatCard;
      if (!legolsThreat) return false;
      return wonCards.some(
        (card) => card.suit === "forests" && card.value === legolsThreat,
      );

    case "Aragorn":
      // Win exactly the number of tricks shown on the threat card
      const aragornThreat = gameState.seats[playerIndex].threatCard;
      if (!aragornThreat) return false;
      return trickCount === aragornThreat;

    default:
      return false;
  }
}

function isObjectiveCompletable(gameState, playerIndex) {
  // Simple checks to see if an objective is still achievable
  // Returns true if completable, false if impossible
  const seat = gameState.seats[playerIndex];
  const character = seat.character;
  const wonCards = seat.getAllWonCards();
  const trickCount = seat.getTrickCount();

  // If already completed, it's completable
  if (checkObjective(gameState, seat)) {
    return true;
  }

  switch (character) {
    case "Frodo":
      // Need at least 2 ring cards (4 in 3-character mode)
      // Impossible if other players have already captured too many rings (only 5 total)
      const ringsNeededForFrodo = gameState.numCharacters === 3 ? 4 : 2;
      const ringCardsWonByOthers = gameState.seats.reduce((total, s, idx) => {
        if (idx !== playerIndex) {
          return (
            total +
            s.getAllWonCards().filter((card) => card.suit === "rings").length
          );
        }
        return total;
      }, 0);
      const frodoRings = wonCards.filter(
        (card) => card.suit === "rings",
      ).length;
      const ringsRemaining = 5 - ringCardsWonByOthers - frodoRings;
      return frodoRings + ringsRemaining >= ringsNeededForFrodo;

    case "Merry":
      // Win exactly 1 or 2 tricks
      // Impossible if already won 3+ tricks
      return trickCount < 3;

    case "Boromir":
      // Win last trick AND don't win 1 of Rings
      // Impossible if already won the 1 of Rings
      const hasOneRing = wonCards.some(
        (card) => card.suit === "rings" && card.value === 1,
      );
      return !hasOneRing;

    case "Sam":
    case "Gimli":
    case "Legolas":
      // Need to win a specific card
      const threatCard = gameState.seats[playerIndex].threatCard;
      if (!threatCard) return true;

      const targetSuit = threatCardSuits[character];
      // Check if another player has already won this card
      for (const seat of gameState.seats) {
        if (seat.seatIndex !== playerIndex) {
          const hasCard = seat
            .getAllWonCards()
            .some(
              (card) => card.suit === targetSuit && card.value === threatCard,
            );
          if (hasCard) return false;
        }
      }
      return true;

    case "Aragorn":
      // Win exactly N tricks where N is the threat card
      const aragornThreat = gameState.seats[playerIndex].threatCard;
      if (!aragornThreat) return true;

      // Impossible if already won more tricks than target
      if (trickCount > aragornThreat) return false;

      // Impossible if not enough tricks remaining
      const tricksPerPlayerAragorn = gameState.numCharacters === 3 ? 12 : 9;
      const tricksRemaining =
        tricksPerPlayerAragorn -
        Math.max(...gameState.seats.map((s) => s.getTrickCount()));
      return trickCount + tricksRemaining >= aragornThreat;

    case "Pippin":
      // Win the fewest (or joint fewest) tricks
      const allTrickCounts = gameState.seats.map((seat) =>
        seat.getTrickCount(),
      );
      const minTricks = Math.min(...allTrickCounts);

      // Already has fewest or joint fewest
      if (trickCount === minTricks) return true;

      // Sum of gaps: each other player needs to catch up to Pippin
      // Impossible if sum of all gaps > remaining tricks
      let totalGap = 0;
      for (const otherTricks of allTrickCounts) {
        if (otherTricks < trickCount) {
          totalGap += trickCount - otherTricks;
        }
      }

      const maxTricksPlayed = Math.max(...allTrickCounts);
      const tricksPerPlayer = gameState.numCharacters === 3 ? 12 : 9;
      const remainingTricks = tricksPerPlayer - maxTricksPlayed;

      return totalGap <= remainingTricks;

    default:
      // For other characters (Gandalf, Celeborn), no simple check
      return true;
  }
}

function getGameOverMessage(gameState) {
  const results = [];
  const objectiveWinners = [];

  for (const seat of gameState.seats) {
    const character = seat.character;
    const trickCount = seat.getTrickCount();
    const objectiveMet = checkObjective(gameState, seat);

    const playerName = seat.getDisplayName();
    const status = objectiveMet ? "✓ SUCCESS" : "✗ FAILED";

    results.push(`${playerName}: ${status} (${trickCount} tricks)`);

    if (objectiveMet) {
      objectiveWinners.push(seat.seatIndex);
    }
  }

  let message = "Game Over!\n\n";
  message += results.join("\n");

  if (objectiveWinners.length > 0) {
    const winnerNames = objectiveWinners.map((p) => {
      return gameState.seats[p].getDisplayName();
    });
    message += `\n\nObjectives completed by: ${winnerNames.join(", ")}`;
  } else {
    message += "\n\nNo one completed their objective!";
  }

  return message;
}

function updateTricksDisplay(gameState) {
  for (const seat of gameState.seats) {
    const trickCount = seat.getTrickCount();
    const character = seat.character;
    const wonCards = seat.getAllWonCards();

    // Update trick count
    document.getElementById(`tricks${seat.seatIndex + 1}`).textContent =
      `Tricks: ${trickCount}`;

    // Update objective status
    const statusDiv = document.getElementById(`objectiveStatus${seat.seatIndex + 1}`);
    if (!character) {
      statusDiv.innerHTML = "";
      continue;
    }

    let statusHTML = "";

    if (
      character === "Gandalf" ||
      character === "Merry" ||
      character === "Pippin"
    ) {
      // Simple tick/cross for Gandalf, Merry, and Pippin
      const objectiveMet = checkObjective(gameState, seat);
      const completable = isObjectiveCompletable(gameState, seat.seatIndex);
      let icon;
      if (objectiveMet) {
        icon = '<span class="success">✓</span>';
      } else if (!completable) {
        icon = '<span class="fail">✗ (impossible)</span>';
      } else {
        icon = '<span class="fail">✗</span>';
      }
      statusDiv.innerHTML = icon;
    } else if (character === "Boromir") {
      // Show last trick status and 1 of rings status
      const wonLastTrick = gameState.lastTrickWinner === seat.seatIndex;
      const hasOneRing = wonCards.some(
        (card) => card.suit === "rings" && card.value === 1,
      );
      const objectiveMet = checkObjective(gameState, seat);
      const completable = isObjectiveCompletable(gameState, seat.seatIndex);
      let icon;
      if (objectiveMet) {
        icon = '<span class="success">✓</span>';
      } else if (!completable) {
        icon = '<span class="fail">✗ (impossible)</span>';
      } else {
        icon = '<span class="fail">✗</span>';
      }

      const lastTrickIcon = wonLastTrick ? "✓" : "✗";
      const oneRingIcon = hasOneRing ? "✗ Has 1R" : "✓";
      statusHTML = `${icon} Last: ${lastTrickIcon}, ${oneRingIcon}`;
      statusDiv.innerHTML = statusHTML;
    } else if (character === "Frodo") {
      // Show ring cards won
      const ringCards = wonCards.filter((card) => card.suit === "rings");
      const ringsNeededForDisplay = gameState.numCharacters === 3 ? 4 : 2;
      const objectiveMet = ringCards.length >= ringsNeededForDisplay;
      const completable = isObjectiveCompletable(gameState, seat.seatIndex);
      let icon;
      if (objectiveMet) {
        icon = '<span class="success">✓</span>';
      } else if (!completable) {
        icon = '<span class="fail">✗ (impossible)</span>';
      } else {
        icon = '<span class="fail">✗</span>';
      }

      if (ringCards.length > 0) {
        const ringList = ringCards
          .map((c) => c.value)
          .sort((a, b) => a - b)
          .join(", ");
        statusHTML = `${icon} Rings: ${ringList}`;
      } else {
        statusHTML = `${icon} Rings: none`;
      }
      statusDiv.innerHTML = statusHTML;
    } else if (character === "Celeborn") {
      // Show rank counts
      const rankCounts = {};
      wonCards.forEach((card) => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
      });

      const objectiveMet = checkObjective(gameState, seat);
      const icon = objectiveMet
        ? '<span class="success">✓</span>'
        : '<span class="fail">✗</span>';

      if (Object.keys(rankCounts).length > 0) {
        const ranksWithCounts = Object.entries(rankCounts)
          .sort((a, b) => b[1] - a[1]) // Sort by count descending
          .map(([rank, count]) => (count > 1 ? `${rank}×${count}` : rank));
        statusHTML = `${icon} ${ranksWithCounts.join(", ")}`;
      } else {
        statusHTML = `${icon} none`;
      }
      statusDiv.innerHTML = statusHTML;
    } else if (
      threatCardCharacters.includes(character) ||
      character === "Aragorn"
    ) {
      // Show threat card and whether they have the matching card/tricks
      const threatCard = seat.threatCard;
      const objectiveMet = checkObjective(gameState, seat);
      const completable = isObjectiveCompletable(gameState, seat.seatIndex);
      let icon;
      if (objectiveMet) {
        icon = '<span class="success">✓</span>';
      } else if (!completable) {
        icon = '<span class="fail">✗ (impossible)</span>';
      } else {
        icon = '<span class="fail">✗</span>';
      }

      if (threatCard) {
        statusHTML = `${icon} Threat: ${threatCard}`;
      } else {
        statusHTML = `${icon} No threat card`;
      }
      statusDiv.innerHTML = statusHTML;
    }
  }
}

function displayTrick(gameState) {
  const trickDiv = document.getElementById("trickCards");
  trickDiv.innerHTML = "";

  gameState.currentTrick.forEach((play) => {
    const trickCardDiv = document.createElement("div");
    trickCardDiv.className = "trick-card";

    const labelDiv = document.createElement("div");
    labelDiv.className = "player-label";
    labelDiv.textContent =
      getPlayerDisplayName(gameState, play.playerIndex) +
      (play.isTrump ? " (TRUMP)" : "");

    trickCardDiv.appendChild(labelDiv);
    trickCardDiv.appendChild(createCardElement(play.card));
    trickDiv.appendChild(trickCardDiv);
  });
}

function highlightActivePlayer(activePlayer) {
  document.querySelectorAll(".player").forEach((div) => {
    if (div.dataset.player === String(activePlayer + 1)) {
      div.classList.add("active");
    } else {
      div.classList.remove("active");
    }
  });
}

function displayHands(gameState, seats, activePlayer = undefined) {
  highlightActivePlayer(gameState.currentPlayer);

  // Display each player's hand
  for (const seat of seats) {
    const canSelectCard =
      activePlayer !== undefined && seat.seatIndex === activePlayer;

    seat.hand.render(
      document.getElementById(`player${seat.seatIndex + 1}`),
      (card) => canSelectCard && isLegalMove(gameState, seat.seatIndex, card),
      (card) => {
        if (canSelectCard) {
          seat.controller.resolveCardSelection(card);
        }
      },
    );
  }
}

function updateGameStatus(gameState, message = null) {
  const statusDiv = document.getElementById("gameStatus");

  if (message) {
    statusDiv.textContent = message;
  } else if (gameState.currentPlayer === 0) {
    statusDiv.textContent = "Your turn! Click a card to play.";
  } else {
    statusDiv.textContent = `${getPlayerDisplayName(gameState, gameState.currentPlayer)}'s turn...`;
  }
}

// ===== NEW GAME LOOP FUNCTIONS =====

function checkForImpossibleObjectives(gameState) {
  for (const seat of gameState.seats) {
    if (!isObjectiveCompletable(gameState, seat.seatIndex)) {
      const character = seat.character;
      if (character) {
        addToGameLog(
          `${seat.getDisplayName()}'s objective is now impossible!`,
          true,
        );
      }
    }
  }
}

function isGameOver(gameState) {
  // Game ends when (numCharacters - 1) players have no cards
  const playersWithNoCards = gameState.seats.filter((seat) =>
    seat.hand.isEmpty(),
  ).length;

  return playersWithNoCards >= gameState.numCharacters - 1;
}

function determineTrickWinner(gameState) {
  delay(500);

  // Check if 1 of rings was played as trump
  const trumpPlay = gameState.currentTrick.find((play) => play.isTrump);

  let winningPlay;

  if (trumpPlay) {
    // Trump wins
    winningPlay = trumpPlay;
  } else {
    // Find highest card of lead suit
    winningPlay = gameState.currentTrick[0];

    for (let i = 1; i < gameState.currentTrick.length; i++) {
      const play = gameState.currentTrick[i];
      if (
        play.card.suit === gameState.leadSuit &&
        play.card.value > winningPlay.card.value
      ) {
        winningPlay = play;
      }
    }
  }

  return winningPlay.playerIndex;
}

async function playSelectedCard(gameState, playerIndex, card) {
  // Remove card from hand
  gameState.seats[playerIndex].hand.removeCard(card);

  // Add to current trick
  gameState.currentTrick.push({ playerIndex, card, isTrump: false });

  // Log the play
  addToGameLog(
    `${getPlayerDisplayName(gameState, playerIndex)} plays ${card.value} of ${card.suit}`,
  );

  // Set lead suit if first card
  if (gameState.currentTrick.length === 1) {
    gameState.leadSuit = card.suit;
  }

  // Break rings if rings played
  if (card.suit === "rings") {
    gameState.ringsBroken = true;
  }
}

async function selectCardFromPlayer(gameState, playerIndex, legalMoves) {
  gameState.currentPlayer = playerIndex;

  const controller = gameState.seats[playerIndex].controller;
  const renderCards = () =>
    displayHands(gameState, gameState.seats, playerIndex);

  return await controller.selectCard(legalMoves, renderCards);
}

async function runTrickTakingPhase(gameState) {
  addToGameLog("=== PLAYING PHASE ===", true);

  while (!isGameOver(gameState)) {
    // === TRICK LOOP ===
    const trickLeader = gameState.currentPlayer;
    gameState.currentTrick = [];
    gameState.leadSuit = null;

    // Clear trick display
    document.getElementById("trickCards").innerHTML = "";

    addToGameLog(`--- Trick ${gameState.currentTrickNumber + 1} ---`);

    // Play cards from each player in turn
    for (let i = 0; i < gameState.numCharacters; i++) {
      const playerIndex = (trickLeader + i) % gameState.numCharacters;

      highlightActivePlayer(playerIndex);
      updateGameStatus(
        gameState,
        playerIndex === 0
          ? "Your turn! Click a card to play."
          : `${getPlayerDisplayName(gameState, playerIndex)}'s turn...`,
      );

      // Get legal moves
      const legalMoves = getLegalMoves(gameState, playerIndex);

      // Ask controller to select card
      const selectedCard = await selectCardFromPlayer(
        gameState,
        playerIndex,
        legalMoves,
      );

      // Play the card
      await playSelectedCard(gameState, playerIndex, selectedCard);

      displayTrick(gameState);
      displayHands(gameState, gameState.seats); // Redisplay with no active player
    }

    // Check for 1 of Rings trump decision
    const oneRingPlay = gameState.currentTrick.find(
      (play) => play.card.suit === "rings" && play.card.value === 1,
    );

    if (oneRingPlay) {
      const useTrump = await gameState.seats[
        oneRingPlay.playerIndex
      ].controller.choice({
        title: "You played the 1 of Rings!",
        message: "Do you want to use it as trump to win this trick?",
        buttons: [
          { label: "Yes, Win Trick", value: true },
          { label: "No, Play Normal", value: false },
        ],
      });
      oneRingPlay.isTrump = useTrump;
      displayTrick(gameState);
    }

    // Determine winner
    const winnerIndex = determineTrickWinner(gameState);

    // Award trick to winner
    const trickCards = gameState.currentTrick.map((play) => play.card);
    gameState.seats[winnerIndex].addTrick(
      gameState.currentTrickNumber,
      trickCards,
    );
    gameState.currentTrickNumber++;
    gameState.lastTrickWinner = winnerIndex;

    // Log winner
    addToGameLog(
      `${getPlayerDisplayName(gameState, winnerIndex)} wins the trick!`,
      true,
    );

    // Reveal new cards (pyramid, solitaire)
    for (const seat of gameState.seats) {
      seat.hand.onTrickComplete();
    }

    displayHands(gameState, gameState.seats);
    updateTricksDisplay(gameState);

    // Check for impossible objectives
    checkForImpossibleObjectives(gameState);

    // Winner leads next trick
    gameState.currentPlayer = winnerIndex;
  }
}

async function runSetupPhase(gameState) {
  addToGameLog("=== SETUP PHASE ===", true);

  // Track exchange status for 1-player mode (only one exchange allowed)
  const setupContext = {
    exchangeMade: false,
  };

  // Loop over all characters starting from currentPlayer
  for (let i = 0; i < gameState.numCharacters; i++) {
    const playerIndex = (gameState.currentPlayer + i) % gameState.numCharacters;

    highlightActivePlayer(playerIndex);
    updateGameStatus(
      gameState,
      `${getPlayerDisplayName(gameState, playerIndex)} - Setup Phase`,
    );

    await performSetupAction(gameState, playerIndex, setupContext);
  }
}

async function runCharacterAssignment(gameState) {
  addToGameLog("=== CHARACTER ASSIGNMENT ===", true);

  const startPlayer = gameState.currentPlayer; // Player with 1 of Rings

  // First player automatically gets Frodo
  addToGameLog(
    `${getPlayerDisplayName(gameState, startPlayer)} gets Frodo (has 1 of Rings)`,
    true,
  );
  gameState.seats[startPlayer].character = "Frodo";
  gameState.availableCharacters = gameState.availableCharacters.filter(
    (c) => c !== "Frodo",
  );

  // For 2-player mode, assign pyramid controller
  if (gameState.playerCount === 2) {
    const pyramidIndex = gameState.seats.findIndex((s) => s.isPyramid);
    let pyramidControllerIndex;

    if (startPlayer === pyramidIndex) {
      // Frodo IS the pyramid, so player to their right controls it
      pyramidControllerIndex = (startPlayer + 2) % 3;
    } else {
      // Frodo is not the pyramid, so Frodo controls the pyramid
      pyramidControllerIndex = startPlayer;
    }

    gameState.seats[pyramidIndex].controller =
      gameState.seats[pyramidControllerIndex].controller;

    addToGameLog(
      `Pyramid will be controlled by ${getPlayerDisplayName(gameState, pyramidControllerIndex)}`,
      true,
    );
  }

  updatePlayerHeadings(gameState);
  displayHands(gameState, gameState.seats);

  // Loop through remaining players
  for (let i = 1; i < gameState.numCharacters; i++) {
    const playerIndex = (startPlayer + i) % gameState.numCharacters;

    highlightActivePlayer(playerIndex);

    // Build character buttons
    const buttons = gameState.availableCharacters.map((char) => ({
      label: char,
      value: char,
    }));

    // Ask controller to choose
    const character = await gameState.seats[playerIndex].controller.choice({
      title: `${getPlayerDisplayName(gameState, playerIndex)} - Choose Your Character`,
      message: "Select a character to play as",
      buttons,
    });

    // Assign character
    addToGameLog(
      `${getPlayerDisplayName(gameState, playerIndex)} chose ${character}`,
    );
    gameState.seats[playerIndex].character = character;
    gameState.availableCharacters = gameState.availableCharacters.filter(
      (c) => c !== character,
    );

    updatePlayerHeadings(gameState);
  }

  displayHands(gameState, gameState.seats);
}

async function runGame(gameState) {
  // === CHARACTER ASSIGNMENT PHASE ===
  await runCharacterAssignment(gameState);

  // === SETUP PHASE ===
  await runSetupPhase(gameState);

  // === TRICK-TAKING PHASE ===
  await runTrickTakingPhase(gameState);

  // === GAME END ===
  const gameOverMsg = getGameOverMessage(gameState);
  addToGameLog("--- GAME OVER ---", true);
  addToGameLog(gameOverMsg.split("\n").join(" | "));
  updateGameStatus(gameState, "Game Over! " + gameOverMsg);
}

// ===== END NEW GAME LOOP FUNCTIONS =====

async function newGame() {
  // Get player count from dropdown
  const playerCount = parseInt(document.getElementById("playerCount").value);
  // For 2-player mode, we have 3 characters (one is pyramid)
  // For 1-player mode, we have 4 characters (all human-controlled)
  let numCharacters;
  if (playerCount === 1) {
    numCharacters = 4;
  } else if (playerCount === 2) {
    numCharacters = 3;
  } else {
    numCharacters = playerCount;
  }
  const cardsPerPlayer = numCharacters === 3 ? 12 : 9;

  // Set data attribute on body to control CSS
  document.body.setAttribute("data-player-count", playerCount);

  let deck, lostCard;

  // Keep shuffling until the lost card is not the 1 of rings
  do {
    // Create and shuffle deck
    deck = shuffleDeck(createDeck());

    // Deal lost card
    lostCard = deck.shift();
  } while (lostCard.suit === "rings" && lostCard.value === 1);

  // Display the lost card
  const lostCardDiv = document.getElementById("lostCard");
  lostCardDiv.innerHTML = "";
  lostCardDiv.appendChild(createCardElement(lostCard));

  // Deal cards to temporary arrays first
  const playerCards = Array.from({ length: numCharacters }, () => []);
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numCharacters; p++) {
      playerCards[p].push(deck.shift());
    }
  }

  // For 2-player mode, randomly choose which of the 3 internal players is the pyramid
  let pyramidPlayerIndex = null;
  if (playerCount === 2) {
    // Choose pyramid player (could be 1 or 2, never 0 since that's the human)
    // We'll determine the controller after character assignment based on Frodo
    pyramidPlayerIndex = Math.random() < 0.5 ? 1 : 2;
  }

  // Find who has the 1 of rings before creating hands
  let startPlayer = -1;
  for (let p = 0; p < numCharacters; p++) {
    if (playerCards[p].some((c) => c.suit === "rings" && c.value === 1)) {
      startPlayer = p;
      break;
    }
  }

  // Initialize Seat instances with their dealt cards
  const seats = [];
  for (let i = 0; i < numCharacters; i++) {
    // Determine controller - in 1-player mode, all seats are human-controlled
    const controller =
      playerCount === 1 || i === 0 ? new HumanController() : new AIController();
    const seat = new Seat(i, controller);

    // Create Hand objects based on player type, passing initial cards
    if (playerCount === 1) {
      // 1-player solitaire mode - all seats use SolitaireHand
      seat.hand = new SolitaireHand(playerCards[i]);
    } else if (i === pyramidPlayerIndex) {
      // Pyramid is always visible
      seat.hand = new PyramidHand(playerCards[i]);
      seat.isPyramid = true;
    } else if (i === 0) {
      // Player 0 is the human player - always visible
      seat.hand = new PlayerHand(playerCards[i]);
    } else {
      // AI players - wrap in HiddenHand
      seat.hand = new HiddenHand(playerCards[i]);
    }

    seats.push(seat);
  }

  // Set up pyramid reveal callback for logging
  if (pyramidPlayerIndex !== null) {
    seats[pyramidPlayerIndex].hand.onCardRevealed((index, card) => {
      addToGameLog(
        `Card at position ${index} in pyramid is revealed: ${card.value} of ${card.suit}`,
      );
    });
  }

  const availableCharacters = shuffleDeck(allCharacters).slice(0, 4);
  availableCharacters.push("Frodo");

  // Create game state locally
  const gameState = {
    playerCount: playerCount,
    numCharacters: numCharacters,
    seats: seats,
    currentTrick: [],
    currentPlayer: startPlayer,
    currentTrickNumber: 0,
    leadSuit: null,
    ringsBroken: false,
    availableCharacters: availableCharacters,
    lostCard: lostCard, // Store the lost card
    lastTrickWinner: null, // Track who won the most recent trick
    threatDeck: [1, 2, 3, 4, 5, 6, 7], // Threat deck (shuffled later)
  };

  // Shuffle the threat deck
  gameState.threatDeck = shuffleDeck(
    gameState.threatDeck.map((v) => ({ value: v })),
  ).map((c) => c.value);

  // Clear trick display
  document.getElementById("trickCards").innerHTML = "";

  // Reset tricks won display
  updateTricksDisplay(gameState);

  // Reset player headings
  resetPlayerHeadings();

  // Clear and initialize game log
  clearGameLog();
  addToGameLog("=== NEW GAME STARTED ===", true);
  addToGameLog(`Lost card: ${lostCard.value} of ${lostCard.suit}`);

  // Display initial state
  displayHands(gameState, gameState.seats);

  // Run the game loop
  await runGame(gameState);
}

function resetPlayerHeadings() {
  for (let p = 0; p < 4; p++) {
    const nameElement = document.getElementById(`playerName${p + 1}`);
    const objectiveElement = document.getElementById(`objective${p + 1}`);
    nameElement.textContent = `Player ${p + 1}`;
    objectiveElement.textContent = "";
  }
}

// Expose functions to global scope for inline event handlers
window.newGame = () => {
  newGame().catch((error) => {
    console.error("Error in newGame:", error);
    updateGameStatus("Error starting game. Check console for details.");
  });
};
