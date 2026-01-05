// All possible characters in the game
const allCharacters = [
  "Frodo",
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

// Import modules
import { Hand, PlayerHand, PyramidHand, HiddenHand } from "./hands.js";
import { sortHand, createCardElement } from "./utils.js";
import { Seat } from "./seat.js";

// Game state
let gameState = {
  playerCount: 4, // Number of actual players (2, 3, or 4)
  numCharacters: 4, // Number of characters in play (3 for 2-player mode, otherwise same as playerCount)
  seats: [], // Array of Seat instances
  currentTrick: [],
  currentPlayer: 0,
  currentTrickNumber: 0, // Track trick number for tricksWon
  leadSuit: null,
  trickComplete: false,
  ringsBroken: false,
  waitingForTrumpChoice: false,
  availableCharacters: [...allCharacters],
  characterAssignmentPhase: false,
  characterAssignmentPlayer: 0,
  setupPhase: false,
  setupCharacterIndex: 0, // Which character is performing setup (0=Frodo, 1=Gandalf, etc)
  setupStep: "choose_card", // 'choose_card', 'waiting_for_response', 'done'
  exchangeFromPlayer: null,
  exchangeToPlayer: null,
  exchangeCard: null,
  lostCard: null, // Store the lost card separately
  lastTrickWinner: null, // Track who won the most recent trick (for Boromir's objective)
  threatDeck: [], // Threat deck (cards 1-7)
};

const playerNames = ["North (You)", "East", "South", "West"];

function getPlayerDisplayName(playerIndex) {
  return gameState.seats[playerIndex].getDisplayName();
}

function findSeatByCharacter(characterName) {
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
  Merry: ["Frodo", "Pippin"],
  Celeborn: null, // Exchange with any player
  Pippin: ["Frodo", "Merry"],
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

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function findPlayerWithCard(suit, value) {
  for (let p = 0; p < 4; p++) {
    if (
      gameState.seats[p].hand
        .getAllCards()
        .some((card) => card.suit === suit && card.value === value)
    ) {
      return p;
    }
  }
  return -1;
}

function isLegalMove(playerIndex, card) {
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

function getLegalMoves(playerIndex) {
  const availableCards = gameState.seats[playerIndex].hand.getAvailableCards();
  return availableCards.filter((card) => isLegalMove(playerIndex, card));
}

function playCard(playerIndex, card) {
  // Remove card from player's hand (pyramid uncovering handled automatically via callback)
  gameState.seats[playerIndex].hand.removeCard(card);

  // Add to current trick
  gameState.currentTrick.push({ playerIndex, card, isTrump: false });

  // Log the card play
  addToGameLog(
    `${getPlayerDisplayName(playerIndex)} plays ${card.value} of ${card.suit}`,
  );

  // Set lead suit if this is the first card
  if (gameState.currentTrick.length === 1) {
    gameState.leadSuit = card.suit;
  }

  // Check if rings have been broken
  if (card.suit === "rings") {
    gameState.ringsBroken = true;
  }

  // Check if trick is complete
  if (gameState.currentTrick.length === gameState.numCharacters) {
    gameState.trickComplete = true;

    // Update display
    displayTrick();
    displayHands();

    // Check if 1 of rings was played
    const oneRingPlay = gameState.currentTrick.find(
      (play) => play.card.suit === "rings" && play.card.value === 1,
    );

    if (oneRingPlay) {
      // Ask the player who played it if they want to use it as trump
      if (oneRingPlay.playerIndex === 0) {
        // Human player - show dialog
        gameState.waitingForTrumpChoice = true;
        document.getElementById("trumpChoice").style.display = "block";
        return; // Wait for user choice
      } else {
        // AI player - decide automatically (always choose yes)
        oneRingPlay.isTrump = true;
      }
    }

    // Determine winner after a delay
    setTimeout(() => {
      determineTrickWinner();
    }, 1500);
  } else {
    // Move to next player
    gameState.currentPlayer =
      (gameState.currentPlayer + 1) % gameState.numCharacters;

    // Update display AFTER changing current player
    displayTrick();
    displayHands();
    updateGameStatus();

    // If it's an AI-controlled player's turn, play automatically
    if (!isHumanControlled(gameState.currentPlayer)) {
      setTimeout(() => playAIMove(), 1000);
    }
  }
}

function chooseTrump(useTrump) {
  // Hide the dialog
  document.getElementById("trumpChoice").style.display = "none";
  gameState.waitingForTrumpChoice = false;

  // Find the 1 of rings in the current trick and update its trump status
  const oneRingPlay = gameState.currentTrick.find(
    (play) => play.card.suit === "rings" && play.card.value === 1,
  );
  if (oneRingPlay) {
    oneRingPlay.isTrump = useTrump;
  }

  // Update display to show trump status
  displayTrick();

  // Determine winner after a short delay
  setTimeout(() => {
    determineTrickWinner();
  }, 1500);
}

function startCharacterAssignment(firstPlayer) {
  gameState.characterAssignmentPhase = true;
  gameState.characterAssignmentPlayer = firstPlayer;
  // Don't reset seat characters - they were already initialized with correct size in newGame
  // Just clear any existing assignments
  for (let i = 0; i < gameState.seats.length; i++) {
    gameState.seats[i].character = null;
  }
  gameState.availableCharacters = [...allCharacters];

  // First player (who has 1 of rings) automatically gets Frodo
  gameState.seats[firstPlayer].character = "Frodo";
  gameState.availableCharacters = gameState.availableCharacters.filter(
    (c) => c !== "Frodo",
  );

  // Log Frodo assignment
  addToGameLog(`${playerNames[firstPlayer]} gets Frodo (has 1 of Rings)`, true);

  // For 2-player mode, determine pyramid controller now that we know where Frodo is
  if (gameState.playerCount === 2) {
    const pyramidIndex = gameState.seats.findIndex((s) => s.isPyramid);
    let pyramidControllerIndex;

    if (firstPlayer === pyramidIndex) {
      // Frodo IS the pyramid, so player to their right controls it
      pyramidControllerIndex = (firstPlayer + 2) % 3;
    } else {
      // Frodo is not the pyramid, so Frodo controls the pyramid
      pyramidControllerIndex = firstPlayer;
      gameState.seats[pyramidIndex].controller = "human";
    }

    addToGameLog(
      `Pyramid will be controlled by ${getPlayerDisplayName(pyramidControllerIndex)}`,
      true,
    );

    // Refresh display now that we know who controls the pyramid
    displayHands();
  }

  // Move to next player
  gameState.characterAssignmentPlayer =
    (firstPlayer + 1) % gameState.numCharacters;

  // Show character selection dialog
  showCharacterChoice();
}

function showCharacterChoice() {
  const playerIndex = gameState.characterAssignmentPlayer;
  const dialog = document.getElementById("characterChoice");
  const titleEl = document.getElementById("characterChoiceTitle");
  const descEl = document.getElementById("characterChoiceDesc");
  const buttonsEl = document.getElementById("characterButtons");
  const infoEl = document.getElementById("characterInfo");

  // Update dialog content
  titleEl.textContent = `${playerNames[playerIndex]} - Choose Your Character`;
  descEl.textContent = "Select a character to play as";

  // Create character buttons
  buttonsEl.innerHTML = "";
  for (const character of allCharacters) {
    const button = document.createElement("button");
    button.textContent = character;
    button.onclick = () => selectCharacter(character);

    // Disable if already taken
    if (!gameState.availableCharacters.includes(character)) {
      button.disabled = true;
    }

    buttonsEl.appendChild(button);
  }

  // Show current assignments
  const assignments = [];
  for (let i = 0; i < gameState.numCharacters; i++) {
    if (gameState.seats[i].character) {
      assignments.push(`${playerNames[i]}: ${gameState.seats[i].character}`);
    }
  }
  infoEl.textContent = assignments.length > 0 ? assignments.join(" | ") : "";

  // Show dialog if human player is choosing
  // For pyramid player in 2-player mode, show to the controller
  const shouldShowToHuman = gameState.seats[playerIndex].controller === "human";

  if (shouldShowToHuman) {
    if (gameState.seats[playerIndex].isPyramid) {
      // Update title to indicate choosing for pyramid
      titleEl.textContent = `Choose Character for Pyramid Player`;
      descEl.textContent = `You control the pyramid - select its character`;
    }
    dialog.style.display = "block";
  } else {
    // AI player - choose automatically after delay
    setTimeout(() => {
      selectCharacterAI();
    }, 1000);
  }
}

function selectCharacter(character) {
  if (!gameState.availableCharacters.includes(character)) {
    return; // Character already taken
  }

  const playerIndex = gameState.characterAssignmentPlayer;

  // Log character assignment (before assignment to show position name)
  addToGameLog(`${playerNames[playerIndex]} chose ${character}`);

  // Assign character to current player
  gameState.seats[playerIndex].character = character;
  gameState.availableCharacters = gameState.availableCharacters.filter(
    (c) => c !== character,
  );

  // Hide dialog
  document.getElementById("characterChoice").style.display = "none";

  // Move to next player or end character assignment
  gameState.characterAssignmentPlayer =
    (gameState.characterAssignmentPlayer + 1) % gameState.numCharacters;

  // Check if all active players have characters
  const allAssigned = gameState.seats.every((seat) => seat.character !== null);
  if (allAssigned) {
    endCharacterAssignment();
  } else {
    // Continue to next player
    setTimeout(() => showCharacterChoice(), 500);
  }
}

function selectCharacterAI() {
  // AI randomly picks from available characters
  const available = gameState.availableCharacters;
  const randomChar = available[Math.floor(Math.random() * available.length)];
  selectCharacter(randomChar);
}

function endCharacterAssignment() {
  gameState.characterAssignmentPhase = false;

  // Update player headings with character names
  updatePlayerHeadings();

  // Refresh display to show character names
  displayHands();

  // Start setup phase
  updateGameStatus("Starting setup phase...");
  startSetupPhase();
}

function updatePlayerHeadings() {
  for (let p = 0; p < gameState.numCharacters; p++) {
    const nameElement = document.getElementById(`playerName${p + 1}`);
    const objectiveElement = document.getElementById(`objective${p + 1}`);
    const character = gameState.seats[p].character;

    if (character) {
      if (p === 0) {
        // Human player - show "You"
        nameElement.textContent = `${character} (You)`;
      } else if (gameState.seats[p].isPyramid) {
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

function isHumanControlled(playerIndex) {
  // Returns true if the human should make decisions for this player
  return gameState.seats[playerIndex].controller === "human";
}

function startSetupPhase() {
  gameState.setupPhase = true;
  gameState.setupCharacterIndex = gameState.currentPlayer; // Start with first player
  performSetupAction();
}

function performSetupAction() {
  const playerIndex = gameState.setupCharacterIndex;
  const character = gameState.seats[playerIndex].character;

  updateGameStatus(`${getPlayerDisplayName(playerIndex)} - Setup Phase`);

  // Get exchange rules for this character
  const exchangeRule = characterExchangeRules[character];

  // Determine what setup action this character needs
  if (
    exchangeRule === undefined ||
    (Array.isArray(exchangeRule) && exchangeRule.length === 0)
  ) {
    // No exchange (e.g., Frodo)
    setTimeout(() => nextSetupPlayerFixed(), 1000);
  } else if (character === "Gandalf") {
    // Gandalf has special logic (optional lost card before exchange)
    setupGandalf(playerIndex);
  } else if (character === "Aragorn") {
    // Aragorn chooses a threat card (not random draw)
    setupAragorn(playerIndex, character, exchangeRule);
  } else if (threatCardCharacters.includes(character)) {
    // Characters that draw threat cards before exchange
    setupThreatCardCharacter(playerIndex, character, exchangeRule);
  } else {
    // All other characters use standard exchange logic
    setupStandardExchange(playerIndex, character, exchangeRule);
  }
}

function endSetupPhase() {
  gameState.setupPhase = false;
  document.getElementById("setupDialog").style.display = "none";

  updateGameStatus(
    `Setup complete! ${getPlayerDisplayName(gameState.currentPlayer)} leads.`,
  );

  // If AI-controlled player starts, play their move
  if (!isHumanControlled(gameState.currentPlayer)) {
    setTimeout(() => playAIMove(), 1500);
  }
}

function getValidExchangePlayers(playerIndex, exchangeRule) {
  // Returns an array of player indices that are valid exchange targets
  let validPlayers = [];

  if (exchangeRule === null) {
    // Can exchange with anyone
    for (let p = 0; p < gameState.numCharacters; p++) {
      if (p !== playerIndex) {
        validPlayers.push(p);
      }
    }
  } else if (Array.isArray(exchangeRule)) {
    // Can only exchange with specific characters
    validPlayers = exchangeRule
      .map((charName) => findSeatByCharacter(charName))
      .filter(
        (p) => p !== -1 && p !== playerIndex && p < gameState.numCharacters,
      );
  } else if (exchangeRule.except) {
    // Can exchange with anyone except specific characters
    const excludedPlayers = exchangeRule.except.map((charName) =>
      findSeatByCharacter(charName),
    );
    for (let p = 0; p < gameState.numCharacters; p++) {
      if (p !== playerIndex && !excludedPlayers.includes(p)) {
        validPlayers.push(p);
      }
    }
  }

  return validPlayers;
}

function setupStandardExchange(playerIndex, character, exchangeRule) {
  // exchangeRule is either:
  // - null (any player, e.g., Celeborn)
  // - array of character names (e.g., ['Frodo', 'Pippin'] for Merry)
  // - object with 'except' property (e.g., { except: ['Frodo'] } for Boromir)

  if (isHumanControlled(playerIndex)) {
    // Human-controlled player - determine valid players first
    let validPlayers = getValidExchangePlayers(playerIndex, exchangeRule);

    if (validPlayers.length === 0) {
      // No valid exchange partners - skip exchange
      addToGameLog(
        `${getPlayerDisplayName(playerIndex)} has no valid exchange partners`,
      );
      setTimeout(() => nextSetupPlayerFixed(), 1000);
    } else if (validPlayers.length === 1) {
      // Only one option - automatically choose it
      startExchange(playerIndex, validPlayers[0]);
    } else {
      // Multiple options - show dialog
      showExchangePlayerSelectionDialog(playerIndex, character, exchangeRule);
    }
  } else {
    // AI player - pick a random valid target
    const validPlayers = getValidExchangePlayers(playerIndex, exchangeRule);

    if (validPlayers.length === 0) {
      // No valid exchange partners - skip exchange
      addToGameLog(
        `${getPlayerDisplayName(playerIndex)} has no valid exchange partners`,
      );
      setTimeout(() => nextSetupPlayerFixed(), 1000);
    } else {
      const targetPlayer =
        validPlayers[Math.floor(Math.random() * validPlayers.length)];
      startExchange(playerIndex, targetPlayer);
    }
  }
}

function setupAragorn(playerIndex, character, exchangeRule) {
  // Aragorn chooses a threat card from the deck
  if (gameState.threatDeck.length === 0) {
    addToGameLog(
      `${getPlayerDisplayName(playerIndex)} - No threat cards remaining!`,
    );
    setTimeout(() => nextSetupPlayerFixed(), 1000);
    return;
  }

  if (isHumanControlled(playerIndex)) {
    // Human-controlled - show dialog to choose
    showAragornThreatCardChoice(playerIndex, character, exchangeRule);
  } else {
    // AI-controlled - pick random card
    const randomIndex = Math.floor(Math.random() * gameState.threatDeck.length);
    const threatCard = gameState.threatDeck.splice(randomIndex, 1)[0];
    completeAragornThreatCardChoice(
      playerIndex,
      character,
      exchangeRule,
      threatCard,
    );
  }
}

function showAragornThreatCardChoice(playerIndex, character, exchangeRule) {
  const dialog = document.getElementById("setupDialog");
  const title = document.getElementById("setupTitle");
  const instruction = document.getElementById("setupInstruction");
  const playerSelection = document.getElementById("setupPlayerSelection");
  const cardSelection = document.getElementById("setupCardSelection");

  title.textContent = "Aragorn - Choose Threat Card";
  instruction.textContent = "Choose a threat card from the deck:";

  cardSelection.style.display = "none";
  playerSelection.style.display = "flex";
  playerSelection.innerHTML = "";

  // Create button for each threat card
  gameState.threatDeck.forEach((card) => {
    const button = document.createElement("button");
    button.textContent = card;
    button.onclick = () => {
      dialog.style.display = "none";
      // Remove the chosen card from the deck
      const cardIndex = gameState.threatDeck.indexOf(card);
      gameState.threatDeck.splice(cardIndex, 1);
      completeAragornThreatCardChoice(
        playerIndex,
        character,
        exchangeRule,
        card,
      );
    };
    playerSelection.appendChild(button);
  });

  dialog.style.display = "block";
}

function completeAragornThreatCardChoice(
  playerIndex,
  character,
  exchangeRule,
  threatCard,
) {
  gameState.seats[playerIndex].threatCard = threatCard;

  addToGameLog(
    `${getPlayerDisplayName(playerIndex)} chooses threat card: ${threatCard}`,
    true,
  );
  updateGameStatus(
    `${getPlayerDisplayName(playerIndex)} chooses threat card ${threatCard}`,
  );

  // Update tricks display to show the threat card
  updateTricksDisplay();

  // After a delay, proceed to the exchange
  setTimeout(() => {
    setupStandardExchange(playerIndex, character, exchangeRule);
  }, 1500);
}

function setupThreatCardCharacter(playerIndex, character, exchangeRule) {
  // Draw a threat card from the deck
  if (gameState.threatDeck.length > 0) {
    let threatCard;
    const targetSuit = threatCardSuits[character];

    // Keep drawing until we get a card that doesn't match the lost card
    // (if the lost card is in the target suit with the same rank)
    do {
      if (gameState.threatDeck.length === 0) {
        addToGameLog(
          `${getPlayerDisplayName(playerIndex)} - No valid threat cards remaining!`,
        );
        setTimeout(() => nextSetupPlayerFixed(), 1000);
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
      `${getPlayerDisplayName(playerIndex)} draws threat card: ${threatCard}`,
      true,
    );
    updateGameStatus(
      `${getPlayerDisplayName(playerIndex)} draws threat card ${threatCard}`,
    );

    // Update tricks display to show the threat card
    updateTricksDisplay();

    // After a delay, proceed to the exchange
    setTimeout(() => {
      setupStandardExchange(playerIndex, character, exchangeRule);
    }, 1500);
  } else {
    // No threat cards left (shouldn't happen in normal play)
    addToGameLog(
      `${getPlayerDisplayName(playerIndex)} - No threat cards remaining!`,
    );
    setTimeout(() => nextSetupPlayerFixed(), 1000);
  }
}

function setupGandalf(playerIndex) {
  // Gandalf: Optionally take Lost card to hand, then Exchange with Frodo
  if (isHumanControlled(playerIndex)) {
    // Human-controlled - show dialog to ask
    showLostCardChoice(playerIndex);
  } else {
    // AI-controlled - randomly decide (50% chance)
    const takeLostCard = Math.random() < 0.5;
    completeLostCardChoice(playerIndex, takeLostCard);
  }
}

function showLostCardChoice(playerIndex) {
  const dialog = document.getElementById("setupDialog");
  const title = document.getElementById("setupTitle");
  const instruction = document.getElementById("setupInstruction");
  const playerSelection = document.getElementById("setupPlayerSelection");
  const cardSelection = document.getElementById("setupCardSelection");

  title.textContent = "Gandalf - Take Lost Card?";
  instruction.textContent = `The Lost card is ${gameState.lostCard.value} of ${gameState.lostCard.suit}. Do you want to take it?`;

  cardSelection.style.display = "none";
  playerSelection.style.display = "flex";
  playerSelection.innerHTML = "";

  const yesButton = document.createElement("button");
  yesButton.textContent = "Yes, Take It";
  yesButton.onclick = () => {
    dialog.style.display = "none";
    completeLostCardChoice(playerIndex, true);
  };

  const noButton = document.createElement("button");
  noButton.textContent = "No, Leave It";
  noButton.onclick = () => {
    dialog.style.display = "none";
    completeLostCardChoice(playerIndex, false);
  };

  playerSelection.appendChild(yesButton);
  playerSelection.appendChild(noButton);

  dialog.style.display = "block";
}

function completeLostCardChoice(playerIndex, takeLostCard) {
  if (takeLostCard && gameState.lostCard) {
    // Add lost card to Gandalf's hand
    gameState.seats[playerIndex].hand.addCard(gameState.lostCard);

    // Clear the lost card display
    document.getElementById("lostCard").innerHTML = "";

    addToGameLog(
      `${getPlayerDisplayName(playerIndex)} takes the Lost card (${gameState.lostCard.value} of ${gameState.lostCard.suit})`,
    );
    updateGameStatus(
      `${getPlayerDisplayName(playerIndex)} takes the Lost card`,
    );
    displayHands();

    // Then exchange with Frodo
    setTimeout(() => {
      const frodoPlayer = findSeatByCharacter("Frodo");
      startExchange(playerIndex, frodoPlayer);
    }, 1500);
  } else {
    // Don't take the card, just exchange with Frodo
    addToGameLog(`${getPlayerDisplayName(playerIndex)} declines the Lost card`);
    updateGameStatus(
      `${getPlayerDisplayName(playerIndex)} declines the Lost card`,
    );

    setTimeout(() => {
      const frodoPlayer = findSeatByCharacter("Frodo");
      startExchange(playerIndex, frodoPlayer);
    }, 1500);
  }
}

function showExchangePlayerSelectionDialog(
  playerIndex,
  character,
  exchangeRule,
) {
  const dialog = document.getElementById("setupDialog");
  const title = document.getElementById("setupTitle");
  const instruction = document.getElementById("setupInstruction");
  const playerSelection = document.getElementById("setupPlayerSelection");
  const cardSelection = document.getElementById("setupCardSelection");

  title.textContent = `${character} - Setup`;

  cardSelection.style.display = "none";
  playerSelection.style.display = "flex";
  playerSelection.innerHTML = "";

  let validPlayers = [];

  if (exchangeRule === null) {
    // Can exchange with any player
    instruction.textContent = "Choose a player to exchange with:";
    for (let p = 0; p < gameState.numCharacters; p++) {
      if (p !== playerIndex) {
        validPlayers.push(p);
      }
    }
  } else if (Array.isArray(exchangeRule)) {
    // Can only exchange with specific characters
    validPlayers = exchangeRule
      .map((charName) => findSeatByCharacter(charName))
      .filter(
        (p) => p !== -1 && p !== playerIndex && p < gameState.numCharacters,
      );

    // Only show character names that are actually in the game
    const availableCharNames = validPlayers
      .map((p) => gameState.seats[p].character)
      .join(" or ");
    instruction.textContent = `Choose ${availableCharNames} to exchange with:`;
  } else if (exchangeRule.except) {
    // Can exchange with anyone except specific characters
    const excludedNames = exchangeRule.except.join(", ");
    instruction.textContent = `Choose a player to exchange with (except ${excludedNames}):`;

    const excludedPlayers = exchangeRule.except.map((charName) =>
      findSeatByCharacter(charName),
    );
    for (let p = 0; p < gameState.numCharacters; p++) {
      if (p !== playerIndex && !excludedPlayers.includes(p)) {
        validPlayers.push(p);
      }
    }
  }

  // Create buttons for valid players
  validPlayers.forEach((p) => {
    const button = document.createElement("button");
    button.textContent = getPlayerDisplayName(p);
    button.onclick = () => {
      startExchange(playerIndex, p);
    };
    playerSelection.appendChild(button);
  });

  dialog.style.display = "block";
}

function startExchange(fromPlayer, toPlayer) {
  gameState.exchangeFromPlayer = fromPlayer;
  gameState.exchangeToPlayer = toPlayer;
  gameState.setupStep = "choose_card";

  // Hide setup dialog temporarily
  document.getElementById("setupDialog").style.display = "none";

  updateGameStatus(
    `${getPlayerDisplayName(fromPlayer)} exchanges with ${getPlayerDisplayName(toPlayer)}`,
  );

  // Show card selection for the initiating player
  setTimeout(() => showCardSelection(fromPlayer, toPlayer), 1000);
}

function showCardSelection(fromPlayer, toPlayer) {
  const isFrodo = gameState.seats[fromPlayer].character === "Frodo";
  const isPyramid = gameState.seats[fromPlayer].isPyramid;

  if (gameState.seats[fromPlayer].controller === "human"
  ) {
    // Human player or human-controlled pyramid - show dialog with their cards
    const dialog = document.getElementById("setupDialog");
    const title = document.getElementById("setupTitle");
    const instruction = document.getElementById("setupInstruction");
    const playerSelection = document.getElementById("setupPlayerSelection");
    const cardSelection = document.getElementById("setupCardSelection");

    title.textContent = "Choose Card to Exchange";
    instruction.textContent = `Select a card to give to ${getPlayerDisplayName(toPlayer)}:`;
    if (isFrodo) {
      instruction.textContent += " (Frodo cannot give away the 1 of Rings)";
    }
    if (isPyramid) {
      instruction.textContent += " (Only uncovered cards can be exchanged)";
    }

    playerSelection.style.display = "none";
    cardSelection.style.display = "flex";
    cardSelection.innerHTML = "";

    const availableCards =
      gameState.seats[fromPlayer].hand.getAvailableCards();
    const sortedCards = sortHand([...availableCards]);

    sortedCards.forEach((card) => {
      // Frodo cannot give away the 1 of rings
      const isOneRing = card.suit === "rings" && card.value === 1;
      const canGive = !isFrodo || !isOneRing;

      const cardElement = createCardElement(
        card,
        canGive,
        canGive
          ? () => {
              giveCard(fromPlayer, toPlayer, card);
            }
          : null,
      );

      if (canGive) {
        cardElement.classList.add("selectable");
      } else {
        cardElement.classList.add("disabled");
      }

      cardSelection.appendChild(cardElement);
    });

    dialog.style.display = "block";
  } else {
    // AI player - pick random card (but not 1 of rings if Frodo)
    const availableCards =
      gameState.seats[fromPlayer].hand.getAvailableCards();
    let hand = availableCards.filter(
      (c) => !(isFrodo && c.suit === "rings" && c.value === 1),
    );

    const randomCard = hand[Math.floor(Math.random() * hand.length)];
    setTimeout(() => giveCard(fromPlayer, toPlayer, randomCard), 1000);
  }
}

function giveCard(fromPlayer, toPlayer, card) {
  // Remove card from fromPlayer's hand
  gameState.seats[fromPlayer].hand.removeCard(card);

  // Store the exchanged card
  gameState.exchangeCard = card;

  // Hide dialog
  document.getElementById("setupDialog").style.display = "none";

  // Only log if human player is involved
  if (fromPlayer === 0 || toPlayer === 0) {
    addToGameLog(
      `${getPlayerDisplayName(fromPlayer)} gives ${card.value} of ${card.suit} to ${getPlayerDisplayName(toPlayer)}`,
    );
  } else {
    addToGameLog(
      `${getPlayerDisplayName(fromPlayer)} exchanges with ${getPlayerDisplayName(toPlayer)}`,
    );
  }

  updateGameStatus(
    `${getPlayerDisplayName(fromPlayer)} gives ${card.value} of ${card.suit} to ${getPlayerDisplayName(toPlayer)}`,
  );
  displayHands();

  // Now toPlayer needs to give a card back
  setTimeout(() => showReturnCardSelection(toPlayer, fromPlayer), 1500);
}

function showReturnCardSelection(fromPlayer, toPlayer) {
  const isFrodo = gameState.seats[fromPlayer].character === "Frodo";
  const isPyramid = gameState.seats[fromPlayer].isPyramid;

  if (gameState.seats[fromPlayer].controller === "human"
  ) {
    // Human player or human-controlled pyramid - show all cards including the one just received
    const dialog = document.getElementById("setupDialog");
    const title = document.getElementById("setupTitle");
    const instruction = document.getElementById("setupInstruction");
    const cardSelection = document.getElementById("setupCardSelection");

    title.textContent = "Choose Card to Return";
    instruction.textContent = `You received ${gameState.exchangeCard.value} of ${gameState.exchangeCard.suit}. Select a card to give back:`;
    if (isFrodo) {
      instruction.textContent += " (Frodo cannot give away the 1 of Rings)";
    }
    if (isPyramid) {
      instruction.textContent +=
        " (Only uncovered cards + received card can be exchanged)";
    }

    cardSelection.style.display = "flex";
    cardSelection.innerHTML = "";

    // Available cards + the received card
    const availableCards =
      gameState.seats[fromPlayer].hand.getAvailableCards();
    const tempHand = sortHand([...availableCards, gameState.exchangeCard]);

    tempHand.forEach((card) => {
      // Frodo cannot give away the 1 of rings
      const isOneRing = card.suit === "rings" && card.value === 1;
      const canGive = !isFrodo || !isOneRing;

      const cardElement = createCardElement(
        card,
        canGive,
        canGive
          ? () => {
              returnCard(fromPlayer, toPlayer, card);
            }
          : null,
      );

      if (canGive) {
        cardElement.classList.add("selectable");
      } else {
        cardElement.classList.add("disabled");
      }

      cardSelection.appendChild(cardElement);
    });

    dialog.style.display = "block";
  } else {
    // AI player - pick random card from available + received card (but not 1 of rings if Frodo)
    const availableCards =
      gameState.seats[fromPlayer].hand.getAvailableCards();
    const tempHand = [...availableCards, gameState.exchangeCard];
    const hand = tempHand.filter(
      (c) => !(isFrodo && c.suit === "rings" && c.value === 1),
    );

    const randomCard = hand[Math.floor(Math.random() * hand.length)];
    setTimeout(() => returnCard(fromPlayer, toPlayer, randomCard), 1000);
  }
}

function returnCard(fromPlayer, toPlayer, card) {
  // Check if this is the card that was just given
  const isReceivedCard =
    card.suit === gameState.exchangeCard.suit &&
    card.value === gameState.exchangeCard.value;

  if (!isReceivedCard) {
    // Remove from fromPlayer's hand
    gameState.seats[fromPlayer].hand.removeCard(card);
  }

  // Add card to toPlayer's hand
  gameState.seats[toPlayer].hand.addCard(card);

  // Add the originally exchanged card to fromPlayer's hand (if they didn't return it)
  if (!isReceivedCard) {
    gameState.seats[fromPlayer].hand.addCard(gameState.exchangeCard);
  }

  // Hide dialog
  document.getElementById("setupDialog").style.display = "none";

  // Only log return details if human player is involved
  if (fromPlayer === 0 || toPlayer === 0) {
    addToGameLog(
      `${getPlayerDisplayName(fromPlayer)} returns ${card.value} of ${card.suit}`,
    );
  }

  updateGameStatus(
    `${getPlayerDisplayName(fromPlayer)} returns ${card.value} of ${card.suit}`,
  );
  displayHands();

  // Exchange complete - move to next player
  setTimeout(() => {
    gameState.exchangeCard = null;
    gameState.exchangeFromPlayer = null;
    gameState.exchangeToPlayer = null;
    nextSetupPlayerFixed();
  }, 1500);
}

function nextSetupPlayerFixed() {
  const startPlayer = gameState.currentPlayer;
  gameState.setupCharacterIndex =
    (gameState.setupCharacterIndex + 1) % gameState.numCharacters;

  // Check if we've completed all characters
  if (gameState.setupCharacterIndex === startPlayer) {
    endSetupPhase();
  } else {
    performSetupAction();
  }
}

function playAIMove() {
  const legalMoves = getLegalMoves(gameState.currentPlayer);
  const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  playCard(gameState.currentPlayer, randomMove);
}

function determineTrickWinner() {
  // Check if 1 of rings was played as trump
  const trumpPlay = gameState.currentTrick.find((play) => play.isTrump);

  let winningPlay;
  let winMessage;

  if (trumpPlay) {
    // Trump wins
    winningPlay = trumpPlay;
    winMessage = `${getPlayerDisplayName(trumpPlay.playerIndex)} wins with the 1 of Rings (trump)!`;
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

    winMessage = `${getPlayerDisplayName(winningPlay.playerIndex)} wins with ${winningPlay.card.value} of ${winningPlay.card.suit}`;
  }

  const winnerIndex = winningPlay.playerIndex;

  // Track the last trick winner (for Boromir's objective)
  gameState.lastTrickWinner = winnerIndex;

  // Assign all cards from the trick to the winner
  const trickCards = gameState.currentTrick.map((play) => play.card);
  gameState.seats[winnerIndex].addTrick(gameState.currentTrickNumber, trickCards);
  gameState.currentTrickNumber++;

  // Notify all hands that the trick is complete (for pyramid to reveal new cards)
  for (let p = 0; p < gameState.numCharacters; p++) {
    gameState.seats[p].hand.onTrickComplete();
  }

  // Update display to show newly revealed cards
  displayHands();

  // Update tricks won display
  updateTricksDisplay();

  // Log the trick winner
  addToGameLog(winMessage, true);

  updateGameStatus(`Trick complete! ${winMessage}`);

  // Check if any objective is now impossible
  let anyImpossible = false;
  for (let p = 0; p < gameState.numCharacters; p++) {
    if (!isObjectiveCompletable(p)) {
      const character = gameState.seats[p].character;
      if (character) {
        addToGameLog(
          `${getPlayerDisplayName(p)}'s objective is now impossible!`,
          true,
        );
        anyImpossible = true;
      }
    }
  }

  // Check if game is over
  // Game ends when at least (numCharacters - 1) players have no cards (accounts for Gandalf potentially having the lost card)
  // OR when any objective becomes impossible
  const playersWithNoCards = gameState.seats.filter((seat) =>
    seat.hand.isEmpty(),
  ).length;
  if (playersWithNoCards >= gameState.numCharacters - 1 || anyImpossible) {
    setTimeout(() => {
      const gameOverMsg = getGameOverMessage();
      addToGameLog("--- GAME OVER ---", true);
      addToGameLog(gameOverMsg.split("\n").join(" | "));
      updateGameStatus("Game Over! " + gameOverMsg);
    }, 2000);
  } else {
    // Start next trick after a delay
    setTimeout(() => {
      startNextTrick(winnerIndex);
    }, 2000);
  }
}

function checkObjective(playerIndex) {
  const seat = gameState.seats[playerIndex];
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

function isObjectiveCompletable(playerIndex) {
  // Simple checks to see if an objective is still achievable
  // Returns true if completable, false if impossible
  const seat = gameState.seats[playerIndex];
  const character = seat.character;
  const wonCards = seat.getAllWonCards();
  const trickCount = seat.getTrickCount();

  // If already completed, it's completable
  if (checkObjective(playerIndex)) {
    return true;
  }

  switch (character) {
    case "Frodo":
      // Need at least 2 ring cards (4 in 3-character mode)
      // Impossible if other players have already captured too many rings (only 5 total)
      const ringsNeededForFrodo = gameState.numCharacters === 3 ? 4 : 2;
      const ringCardsWonByOthers = gameState.seats.reduce(
        (total, s, idx) => {
          if (idx !== playerIndex) {
            return total + s.getAllWonCards().filter((card) => card.suit === "rings").length;
          }
          return total;
        },
        0,
      );
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
      for (let p = 0; p < gameState.numCharacters; p++) {
        if (p !== playerIndex) {
          const hasCard = gameState.seats[p].getAllWonCards().some(
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
      const allTrickCounts = gameState.tricksWon.map(
        (cards) => cards.length / gameState.numCharacters,
      );
      const minTricks = Math.min(...allTrickCounts);

      // Already has fewest or joint fewest
      if (trickCount === minTricks) return true;

      // Sum of gaps: each other player needs to catch up to Pippin
      // Impossible if sum of all gaps > remaining tricks
      let totalGap = 0;
      for (let p = 0; p < gameState.numCharacters; p++) {
        if (p !== playerIndex) {
          const otherTricks =
            gameState.tricksWon[p].length / gameState.numCharacters;
          if (otherTricks < trickCount) {
            totalGap += trickCount - otherTricks;
          }
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

function getGameOverMessage() {
  const results = [];
  const objectiveWinners = [];

  for (let p = 0; p < gameState.numCharacters; p++) {
    const character = gameState.seats[p].character;
    const trickCount = gameState.seats[p].getTrickCount();
    const objectiveMet = checkObjective(p);

    const playerName = p === 0 ? `${character} (You)` : character;
    const status = objectiveMet ? "✓ SUCCESS" : "✗ FAILED";

    results.push(`${playerName}: ${status} (${trickCount} tricks)`);

    if (objectiveMet) {
      objectiveWinners.push(p);
    }
  }

  let message = "Game Over!\n\n";
  message += results.join("\n");

  if (objectiveWinners.length > 0) {
    const winnerNames = objectiveWinners.map((p) => {
      return p === 0
        ? `${gameState.seats[p].character} (You)`
        : gameState.seats[p].character;
    });
    message += `\n\nObjectives completed by: ${winnerNames.join(", ")}`;
  } else {
    message += "\n\nNo one completed their objective!";
  }

  return message;
}

function startNextTrick(leadPlayer) {
  // Clear the current trick
  gameState.currentTrick = [];
  gameState.leadSuit = null;
  gameState.trickComplete = false;
  gameState.currentPlayer = leadPlayer;

  // Clear trick display
  document.getElementById("trickCards").innerHTML = "";

  // Update display
  displayHands();
  updateGameStatus();

  // If AI-controlled player leads, play their move
  if (!isHumanControlled(leadPlayer)) {
    setTimeout(() => playAIMove(), 1000);
  }
}

function updateTricksDisplay() {
  for (let p = 0; p < gameState.numCharacters; p++) {
    const trickCount = gameState.seats[p].getTrickCount();
    const character = gameState.seats[p].character;
    const wonCards = gameState.seats[p].getAllWonCards();

    // Update trick count
    document.getElementById(`tricks${p + 1}`).textContent =
      `Tricks: ${trickCount}`;

    // Update objective status
    const statusDiv = document.getElementById(`objectiveStatus${p + 1}`);
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
      const objectiveMet = checkObjective(p);
      const completable = isObjectiveCompletable(p);
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
      const wonLastTrick = gameState.lastTrickWinner === p;
      const hasOneRing = wonCards.some(
        (card) => card.suit === "rings" && card.value === 1,
      );
      const objectiveMet = checkObjective(p);
      const completable = isObjectiveCompletable(p);
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
      const completable = isObjectiveCompletable(p);
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

      const objectiveMet = checkObjective(p);
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
      const threatCard = gameState.seats[p].threatCard;
      const objectiveMet = checkObjective(p);
      const completable = isObjectiveCompletable(p);
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

function displayTrick() {
  const trickDiv = document.getElementById("trickCards");
  trickDiv.innerHTML = "";

  gameState.currentTrick.forEach((play) => {
    const trickCardDiv = document.createElement("div");
    trickCardDiv.className = "trick-card";

    const labelDiv = document.createElement("div");
    labelDiv.className = "player-label";
    labelDiv.textContent =
      getPlayerDisplayName(play.playerIndex) + (play.isTrump ? " (TRUMP)" : "");

    trickCardDiv.appendChild(labelDiv);
    trickCardDiv.appendChild(createCardElement(play.card));
    trickDiv.appendChild(trickCardDiv);
  });
}

function displayHands() {
  const playerDivs = [
    document.getElementById("player1"),
    document.getElementById("player2"),
    document.getElementById("player3"),
    document.getElementById("player4"),
  ];

  // Update active player indicator
  document.querySelectorAll(".player").forEach((div, idx) => {
    if (
      idx < gameState.numCharacters &&
      idx === gameState.currentPlayer &&
      !gameState.trickComplete &&
      !gameState.waitingForTrumpChoice
    ) {
      div.classList.add("active");
    } else {
      div.classList.remove("active");
    }
  });

  // Display each player's hand
  for (let p = 0; p < gameState.numCharacters; p++) {
    const hand = gameState.seats[p].hand;
    const isPlayerTurn =
      gameState.currentPlayer === p &&
      !gameState.trickComplete &&
      !gameState.waitingForTrumpChoice;

    hand.render(
      playerDivs[p],
      (card) => isPlayerTurn && isLegalMove(p, card),
      (card) => playCard(p, card),
    );
  }
}

function updateGameStatus(message = null) {
  const statusDiv = document.getElementById("gameStatus");

  if (message) {
    statusDiv.textContent = message;
  } else if (gameState.trickComplete) {
    statusDiv.textContent = "Trick complete!";
  } else if (gameState.currentPlayer === 0) {
    statusDiv.textContent = "Your turn! Click a card to play.";
  } else {
    statusDiv.textContent = `${getPlayerDisplayName(gameState.currentPlayer)}'s turn...`;
  }
}

function newGame() {
  // Get player count from dropdown
  const playerCount = parseInt(document.getElementById("playerCount").value);
  // For 2-player mode, we have 3 characters (one is pyramid)
  const numCharacters = playerCount === 2 ? 3 : playerCount;
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

  // For 2-player mode, randomly choose which of the 3 internal players is the pyramid
  let pyramidPlayerIndex = null;
  let pyramidControllerIndex = null;
  if (playerCount === 2) {
    // Choose pyramid player (could be 1 or 2, never 0 since that's the human)
    // We'll determine the controller after character assignment based on Frodo
    pyramidPlayerIndex = Math.random() < 0.5 ? 1 : 2;
  }

  // Initialize Seat instances based on number of characters
  const seats = [];
  for (let i = 0; i < numCharacters; i++) {
    // Determine controller
    const controller = i === 0 ? "human" : "ai";
    const seat = new Seat(i, controller);

    // Create Hand objects based on player type
    if (i === pyramidPlayerIndex) {
      // Pyramid is always visible
      seat.hand = new PyramidHand();
      seat.isPyramid = true;
    } else if (i === 0) {
      // Player 0 is the human player - always visible
      seat.hand = new PlayerHand();
    } else {
      // AI players - wrap in HiddenHand
      seat.hand = new HiddenHand(new PlayerHand());
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

  // Reset game state
  gameState = {
    playerCount: playerCount,
    numCharacters: numCharacters,
    seats: seats,
    currentTrick: [],
    currentPlayer: 0,
    currentTrickNumber: 0,
    leadSuit: null,
    trickComplete: false,
    ringsBroken: false,
    waitingForTrumpChoice: false,
    availableCharacters: [...allCharacters],
    characterAssignmentPhase: false,
    characterAssignmentPlayer: 0,
    setupPhase: false,
    setupCharacterIndex: 0,
    setupStep: "choose_card",
    exchangeFromPlayer: null,
    exchangeToPlayer: null,
    exchangeCard: null,
    lostCard: lostCard, // Store the lost card
    lastTrickWinner: null, // Track who won the most recent trick
    threatDeck: [1, 2, 3, 4, 5, 6, 7], // Threat deck (shuffled later)
  };

  // Shuffle the threat deck
  gameState.threatDeck = shuffleDeck(
    gameState.threatDeck.map((v) => ({ value: v })),
  ).map((c) => c.value);

  // Deal cards to each character
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numCharacters; p++) {
      const card = deck.shift();
      gameState.seats[p].hand.addCard(card);
    }
  }

  // Find who has the 1 of rings
  const startPlayer = findPlayerWithCard("rings", 1);
  gameState.currentPlayer = startPlayer;

  // Clear trick display
  document.getElementById("trickCards").innerHTML = "";

  // Hide dialogs
  document.getElementById("trumpChoice").style.display = "none";
  document.getElementById("characterChoice").style.display = "none";
  document.getElementById("setupDialog").style.display = "none";

  // Reset tricks won display
  updateTricksDisplay();

  // Reset player headings
  resetPlayerHeadings();

  // Clear and initialize game log
  clearGameLog();
  addToGameLog("=== NEW GAME STARTED ===", true);
  addToGameLog(`Lost card: ${lostCard.value} of ${lostCard.suit}`);

  // Display initial state
  displayHands();

  // Start character assignment phase
  updateGameStatus("Assigning characters...");
  startCharacterAssignment(startPlayer);
}

function resetPlayerHeadings() {
  const directions = ["North", "East", "South", "West"];
  for (let p = 0; p < 4; p++) {
    const nameElement = document.getElementById(`playerName${p + 1}`);
    const objectiveElement = document.getElementById(`objective${p + 1}`);

    if (p === 0) {
      nameElement.textContent = `Player ${p + 1} (${directions[p]})`;
    } else {
      nameElement.textContent = `Player ${p + 1} (${directions[p]})`;
    }

    // Clear objective
    objectiveElement.textContent = "";
  }
}

// Expose functions to global scope for inline event handlers
window.newGame = newGame;
window.chooseTrump = chooseTrump;
