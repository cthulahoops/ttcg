// Import modules
import {
  Hand,
  PlayerHand,
  PyramidHand,
  HiddenHand,
  SolitaireHand,
} from "./hands.js";
import { shuffleDeck, sortHand, createCardElement } from "./utils.js";
import { Seat } from "./seat.js";

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


// ===== ASYNC HELPERS =====

// Helper to delay execution
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Promise resolver storage for current dialog
let currentDialogResolver = null;

// Game state
let gameState = {
  playerCount: 4, // Number of actual players (2, 3, or 4)
  numCharacters: 4, // Number of characters in play (3 for 2-player mode, otherwise same as playerCount)
  seats: [], // Array of Seat instances
  currentTrick: [],
  currentPlayer: 0,
  currentTrickNumber: 0, // Track trick number for tricksWon
  leadSuit: null,
  phase: "playing", // 'playing', 'character_assignment', 'setup', 'waiting_for_trump', 'trick_complete'
  ringsBroken: false,
  availableCharacters: [...allCharacters],
  characterAssignmentPlayer: 0,
  setupCharacterIndex: 0, // Which character is performing setup (0=Frodo, 1=Gandalf, etc)
  exchangeFromPlayer: null,
  exchangeToPlayer: null,
  exchangeCard: null,
  lostCard: null, // Store the lost card separately
  lastTrickWinner: null, // Track who won the most recent trick (for Boromir's objective)
  threatDeck: [], // Threat deck (cards 1-7)
};

// ===== DIALOG HELPERS =====

function showDialog({ title, message, buttons = [], cards = [], info = "" }) {
  return new Promise((resolve) => {
    const dialogArea = document.getElementById("dialogArea");
    const dialogTitle = document.getElementById("dialogTitle");
    const dialogMessage = document.getElementById("dialogMessage");
    const dialogChoices = document.getElementById("dialogChoices");
    const dialogInfo = document.getElementById("dialogInfo");

    // Store resolver for potential cleanup
    currentDialogResolver = resolve;

    // Set content
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogInfo.textContent = info;

    // Clear and populate buttons
    dialogChoices.innerHTML = "";
    if (buttons.length > 0) {
      buttons.forEach(
        ({ label, value, onClick, disabled = false, grid = false }) => {
          const button = document.createElement("button");
          button.textContent = label;
          button.disabled = disabled;

          // Support both new value-based and old onClick-based patterns during transition
          button.onclick = () => {
            hideDialog();
            currentDialogResolver = null;
            if (value !== undefined) {
              resolve(value);
            } else if (onClick) {
              // Fallback for old pattern during transition
              onClick();
            }
          };
          dialogChoices.appendChild(button);
        },
      );
    }

    if (cards.length > 0) {
      cards.forEach((cardElement) => {
        // Card elements should have dataset.cardValue set by caller
        cardElement.onclick = () => {
          hideDialog();
          currentDialogResolver = null;
          const card = JSON.parse(cardElement.dataset.cardValue);
          resolve(card);
        };
        dialogChoices.appendChild(cardElement);
      });
    }

    // Show dialog
    dialogArea.style.display = "block";
  });
}

function hideDialog() {
  document.getElementById("dialogArea").style.display = "none";
  // Clear the resolver to prevent hanging promises
  currentDialogResolver = null;
}

// ===== GAME FUNCTIONS =====

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

async function playCard(playerIndex, card) {
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
    gameState.phase = "trick_complete";

    // Update display
    displayTrick();
    displayHands();

    // Check if 1 of rings was played
    const oneRingPlay = gameState.currentTrick.find(
      (play) => play.card.suit === "rings" && play.card.value === 1,
    );

    if (oneRingPlay) {
      // Ask the player who played it if they want to use it as trump
      if (isHumanControlled(oneRingPlay.playerIndex)) {
        // Human-controlled player - show dialog
        gameState.phase = "waiting_for_trump";
        const useTrump = await showDialog({
          title: "You played the 1 of Rings!",
          message: "Do you want to use it as trump to win this trick?",
          buttons: [
            { label: "Yes, Win Trick", value: true },
            { label: "No, Play Normal", value: false },
          ],
        });
        oneRingPlay.isTrump = useTrump;
        gameState.phase = "trick_complete";

        // Update display to show trump status
        displayTrick();
      } else {
        // AI player - decide automatically (always choose yes)
        oneRingPlay.isTrump = true;
      }
    }

    // Determine winner after a delay
    await delay(1500);
    determineTrickWinner();
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

async function startCharacterAssignment(firstPlayer) {
  gameState.phase = "character_assignment";
  gameState.characterAssignmentPlayer = firstPlayer;
  // Don't reset seat characters - they were already initialized with correct size in newGame
  // Just clear any existing assignments
  for (let i = 0; i < gameState.seats.length; i++) {
    gameState.seats[i].character = null;
  }
  gameState.availableCharacters = [...allCharacters];

  // Log Frodo assignment
  addToGameLog(`${getPlayerDisplayName(firstPlayer)} gets Frodo (has 1 of Rings)`, true);

  // First player (who has 1 of rings) automatically gets Frodo
  gameState.seats[firstPlayer].character = "Frodo";
  gameState.availableCharacters = gameState.availableCharacters.filter(
    (c) => c !== "Frodo",
  );

  // For 2-player mode, determine pyramid controller now that we know where Frodo is
  if (gameState.playerCount === 2) {
    const pyramidIndex = gameState.seats.findIndex((s) => s.isPyramid);
    let pyramidControllerIndex;

    const pyramid = gameState.seats[pyramidIndex]

    if (firstPlayer === pyramidIndex) {
      // Frodo IS the pyramid, so player to their right controls it
      pyramidControllerIndex = (firstPlayer + 2) % 3;
    } else {
      // Frodo is not the pyramid, so Frodo controls the pyramid
      pyramidControllerIndex = firstPlayer;
    }
    pyramid.controller = gameState.seats[pyramidControllerIndex].controller

    addToGameLog(
      `Pyramid will be controlled by ${getPlayerDisplayName(pyramidControllerIndex)}`,
      true,
    );

    // Refresh display now that we know who controls the pyramid
    displayHands();
  }

  // Loop over remaining characters to assign
  for (let i = 1; i < gameState.numCharacters; i++) {
    const playerIndex = (firstPlayer + i) % gameState.numCharacters;
    gameState.characterAssignmentPlayer = playerIndex;

    await assignCharacterToPlayer(playerIndex);
    updatePlayerHeadings();
    await delay(500);
  }

  // Update player headings with character names
  updatePlayerHeadings();

  // Refresh display to show character names
  displayHands();
}

async function assignCharacterToPlayer(playerIndex) {
  const shouldShowToHuman = gameState.seats[playerIndex].controller === "human";

  let character;
  if (shouldShowToHuman) {
    // Build title and message
    let title = `${getPlayerDisplayName(playerIndex)} - Choose Your Character`;
    let message = "Select a character to play as";

    if (gameState.seats[playerIndex].isPyramid) {
      title = `Choose Character for Pyramid Player`;
      message = `You control the pyramid - select its character`;
    }

    // Build character buttons
    const buttons = allCharacters.map((char) => ({
      label: char,
      value: char,
      disabled: !gameState.availableCharacters.includes(char),
      grid: true, // Use grid layout
    }));

    // Show current assignments
    const assignments = [];
    for (let i = 0; i < gameState.numCharacters; i++) {
      if (gameState.seats[i].character) {
        assignments.push(`${getPlayerDisplayName(i)}: ${gameState.seats[i].character}`);
      }
    }
    const info = assignments.length > 0 ? assignments.join(" | ") : "";

    character = await showDialog({ title, message, buttons, info });
  } else {
    // AI player - choose automatically after delay
    await delay(1000);
    const available = gameState.availableCharacters;
    character = available[Math.floor(Math.random() * available.length)];
  }

  // Log character assignment (before assignment to show position name)
  addToGameLog(`${getPlayerDisplayName(playerIndex)} chose ${character}`);

  // Assign character to current player
  gameState.seats[playerIndex].character = character;
  gameState.availableCharacters = gameState.availableCharacters.filter(
    (c) => c !== character,
  );
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

async function startSetupPhase() {
  gameState.phase = "setup";

  // Loop over all characters starting from currentPlayer
  for (let i = 0; i < gameState.numCharacters; i++) {
    const playerIndex = (gameState.currentPlayer + i) % gameState.numCharacters;
    gameState.setupCharacterIndex = playerIndex;

    await performSetupAction(playerIndex);
  }

  gameState.phase = "playing";
  hideDialog();

  updateGameStatus(
    `Setup complete! ${getPlayerDisplayName(gameState.currentPlayer)} leads.`,
  );

  // If AI-controlled player starts, play their move
  if (!isHumanControlled(gameState.currentPlayer)) {
    setTimeout(() => playAIMove(), 1500);
  }
}

async function performSetupAction(playerIndex) {
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
    await delay(1000);
  } else if (character === "Gandalf") {
    // Gandalf has special logic (optional lost card before exchange)
    await setupGandalf(playerIndex);
  } else if (character === "Aragorn") {
    // Aragorn chooses a threat card (not random draw)
    await setupAragorn(playerIndex, character, exchangeRule);
  } else if (threatCardCharacters.includes(character)) {
    // Characters that draw threat cards before exchange
    await setupThreatCardCharacter(playerIndex, character, exchangeRule);
  } else {
    // All other characters use standard exchange logic
    await setupStandardExchange(playerIndex, character, exchangeRule);
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

// ===== EXCHANGE HELPER FUNCTIONS =====

async function chooseCardToGive(fromPlayer, toPlayer) {
  const isFrodo = gameState.seats[fromPlayer].character === "Frodo";

  if (isHumanControlled(fromPlayer)) {
    const availableCards = gameState.seats[fromPlayer].hand.getAvailableCards();
    const sortedCards = sortHand([...availableCards]);

    const cards = sortedCards.map((card) => {
      const isOneRing = card.suit === "rings" && card.value === 1;
      const canGive = !isFrodo || !isOneRing;

      const cardElement = createCardElement(card, canGive, null);
      cardElement.dataset.cardValue = JSON.stringify(card);

      if (!canGive) {
        cardElement.classList.add("disabled");
      }

      return cardElement;
    });

    let message = `Select a card to give to ${getPlayerDisplayName(toPlayer)}`;
    if (isFrodo) {
      message += " (Frodo cannot give away the 1 of Rings)";
    }

    const selectedCard = await showDialog({
      title: "Choose Card to Exchange",
      message,
      cards,
    });

    return selectedCard;
  } else {
    // AI chooses random card
    const availableCards = gameState.seats[fromPlayer].hand.getAvailableCards();
    const hand = availableCards.filter(
      (c) => !(isFrodo && c.suit === "rings" && c.value === 1),
    );
    const randomCard = hand[Math.floor(Math.random() * hand.length)];
    await delay(1000);
    return randomCard;
  }
}

async function chooseCardToReturn(fromPlayer, toPlayer) {
  const isFrodo = gameState.seats[fromPlayer].character === "Frodo";

  if (isHumanControlled(fromPlayer)) {
    const availableCards = gameState.seats[fromPlayer].hand.getAvailableCards();
    const tempHand = sortHand([...availableCards, gameState.exchangeCard]);

    const cards = tempHand.map((card) => {
      const isOneRing = card.suit === "rings" && card.value === 1;
      const canGive = !isFrodo || !isOneRing;

      const cardElement = createCardElement(card, canGive, null);
      cardElement.dataset.cardValue = JSON.stringify(card);

      if (!canGive) {
        cardElement.classList.add("disabled");
      }

      return cardElement;
    });

    let message = `You received ${gameState.exchangeCard.value} of ${gameState.exchangeCard.suit}. Select a card to give back`;
    if (isFrodo) {
      message += " (Frodo cannot give away the 1 of Rings)";
    }

    const selectedCard = await showDialog({
      title: "Choose Card to Return",
      message,
      cards,
    });

    return selectedCard;
  } else {
    // AI chooses random card
    const availableCards = gameState.seats[fromPlayer].hand.getAvailableCards();
    const tempHand = [...availableCards, gameState.exchangeCard];
    const hand = tempHand.filter(
      (c) => !(isFrodo && c.suit === "rings" && c.value === 1),
    );
    const randomCard = hand[Math.floor(Math.random() * hand.length)];
    await delay(1000);
    return randomCard;
  }
}

async function performExchange(fromPlayer, toPlayer) {
  gameState.exchangeFromPlayer = fromPlayer;
  gameState.exchangeToPlayer = toPlayer;

  updateGameStatus(
    `${getPlayerDisplayName(fromPlayer)} exchanges with ${getPlayerDisplayName(toPlayer)}`,
  );
  await delay(1000);

  // Step 1: Give card
  const cardToGive = await chooseCardToGive(fromPlayer, toPlayer);
  gameState.seats[fromPlayer].hand.removeCard(cardToGive);
  gameState.exchangeCard = cardToGive;

  // Only log if human player is involved
  if (fromPlayer === 0 || toPlayer === 0) {
    addToGameLog(
      `${getPlayerDisplayName(fromPlayer)} gives ${cardToGive.value} of ${cardToGive.suit} to ${getPlayerDisplayName(toPlayer)}`,
    );
  } else {
    addToGameLog(
      `${getPlayerDisplayName(fromPlayer)} exchanges with ${getPlayerDisplayName(toPlayer)}`,
    );
  }

  updateGameStatus(
    `${getPlayerDisplayName(fromPlayer)} gives ${cardToGive.value} of ${cardToGive.suit} to ${getPlayerDisplayName(toPlayer)}`,
  );
  displayHands();
  await delay(1500);

  // Step 2: Return card
  const cardToReturn = await chooseCardToReturn(toPlayer, fromPlayer);

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
      `${getPlayerDisplayName(toPlayer)} returns ${cardToReturn.value} of ${cardToReturn.suit}`,
    );
  }

  updateGameStatus(
    `${getPlayerDisplayName(toPlayer)} returns ${cardToReturn.value} of ${cardToReturn.suit}`,
  );
  displayHands();
  await delay(1500);

  // Clean up exchange state
  gameState.exchangeCard = null;
  gameState.exchangeFromPlayer = null;
  gameState.exchangeToPlayer = null;
}

async function setupStandardExchange(playerIndex, character, exchangeRule) {
  // In 1-player mode, check if exchange already made
  if (gameState.playerCount === 1 && gameState.exchangeMadeInSolitaire) {
    await delay(1000);
    return;
  }

  const validPlayers = getValidExchangePlayers(playerIndex, exchangeRule);

  if (validPlayers.length === 0) {
    // No valid exchange partners - skip exchange
    addToGameLog(
      `${getPlayerDisplayName(playerIndex)} has no valid exchange partners`,
    );
    await delay(1000);
    return;
  }

  if (isHumanControlled(playerIndex)) {
    // Human-controlled player
    // In 1-player mode, ask if player wants to exchange
    if (gameState.playerCount === 1) {
      // Determine target player for the message
      let targetDescription;
      if (validPlayers.length === 1) {
        targetDescription = getPlayerDisplayName(validPlayers[0]);
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

      const wantsToExchange = await showDialog({
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
        playerIndex,
        character,
        exchangeRule,
      );
    }

    // Perform exchange
    await performExchange(playerIndex, targetPlayer);
  } else {
    // AI player - pick a random valid target
    const targetPlayer =
      validPlayers[Math.floor(Math.random() * validPlayers.length)];
    await performExchange(playerIndex, targetPlayer);
  }

  // Mark exchange as made in 1-player mode
  if (gameState.playerCount === 1) {
    gameState.exchangeMadeInSolitaire = true;
  }
}

async function setupAragorn(playerIndex, character, exchangeRule) {
  // Aragorn chooses a threat card from the deck
  if (gameState.threatDeck.length === 0) {
    addToGameLog(
      `${getPlayerDisplayName(playerIndex)} - No threat cards remaining!`,
    );
    await delay(1000);
    return;
  }

  let threatCard;
  if (isHumanControlled(playerIndex)) {
    // Human-controlled - show dialog to choose
    const buttons = gameState.threatDeck.map((card) => ({
      label: String(card),
      value: card,
    }));

    threatCard = await showDialog({
      title: "Aragorn - Choose Threat Card",
      message: "Choose a threat card from the deck:",
      buttons,
    });

    // Remove the chosen card from the deck
    const cardIndex = gameState.threatDeck.indexOf(threatCard);
    gameState.threatDeck.splice(cardIndex, 1);
  } else {
    // AI-controlled - pick random card
    const randomIndex = Math.floor(Math.random() * gameState.threatDeck.length);
    threatCard = gameState.threatDeck.splice(randomIndex, 1)[0];
  }

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
  await delay(1500);
  await setupStandardExchange(playerIndex, character, exchangeRule);
}

async function setupThreatCardCharacter(playerIndex, character, exchangeRule) {
  // Draw a threat card from the deck
  if (gameState.threatDeck.length === 0) {
    addToGameLog(
      `${getPlayerDisplayName(playerIndex)} - No threat cards remaining!`,
    );
    await delay(1000);
    return;
  }

  let threatCard;
  const targetSuit = threatCardSuits[character];

  // Keep drawing until we get a card that doesn't match the lost card
  // (if the lost card is in the target suit with the same rank)
  do {
    if (gameState.threatDeck.length === 0) {
      addToGameLog(
        `${getPlayerDisplayName(playerIndex)} - No valid threat cards remaining!`,
      );
      await delay(1000);
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
  await delay(1500);
  await setupStandardExchange(playerIndex, character, exchangeRule);
}

async function setupGandalf(playerIndex) {
  // Gandalf: Optionally take Lost card to hand, then Exchange with Frodo
  let takeLostCard;

  if (isHumanControlled(playerIndex)) {
    // Human-controlled - show dialog to ask
    takeLostCard = await showDialog({
      title: "Gandalf - Take Lost Card?",
      message: `The Lost card is ${gameState.lostCard.value} of ${gameState.lostCard.suit}. Do you want to take it?`,
      buttons: [
        { label: "Yes, Take It", value: true },
        { label: "No, Leave It", value: false },
      ],
    });
  } else {
    // AI-controlled - randomly decide (50% chance)
    takeLostCard = Math.random() < 0.5;
  }

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
    await delay(1500);
  } else {
    // Don't take the card, but still exchange with Frodo
    addToGameLog(`${getPlayerDisplayName(playerIndex)} declines the Lost card`);
    updateGameStatus(
      `${getPlayerDisplayName(playerIndex)} declines the Lost card`,
    );
    await delay(1500);
  }

  // Proceed to exchange with Frodo
  const character = gameState.seats[playerIndex].character;
  const exchangeRule = characterExchangeRules[character];
  await setupStandardExchange(playerIndex, character, exchangeRule);
}

async function showExchangePlayerSelectionDialog(
  playerIndex,
  character,
  exchangeRule,
) {
  let message = "";
  const validPlayers = getValidExchangePlayers(playerIndex, exchangeRule);

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
    label: getPlayerDisplayName(p),
    value: p,
  }));

  const selectedPlayer = await showDialog({
    title: `${character} - Setup`,
    message,
    buttons,
  });

  return selectedPlayer;
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
  gameState.seats[winnerIndex].addTrick(
    gameState.currentTrickNumber,
    trickCards,
  );
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
      for (let p = 0; p < gameState.numCharacters; p++) {
        if (p !== playerIndex) {
          const hasCard = gameState.seats[p]
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
  gameState.phase = "playing";
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
    if ( idx === gameState.currentPlayer) {
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
      gameState.phase !== "trick_complete" &&
      gameState.phase !== "waiting_for_trump";

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
  } else if (gameState.phase === "trick_complete") {
    statusDiv.textContent = "Trick complete!";
  } else if (gameState.currentPlayer === 0) {
    statusDiv.textContent = "Your turn! Click a card to play.";
  } else {
    statusDiv.textContent = `${getPlayerDisplayName(gameState.currentPlayer)}'s turn...`;
  }
}

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
    const controller = playerCount === 1 || i === 0 ? "human" : "ai";
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

  // Reset game state
  gameState = {
    playerCount: playerCount,
    numCharacters: numCharacters,
    seats: seats,
    currentTrick: [],
    currentPlayer: startPlayer,
    currentTrickNumber: 0,
    leadSuit: null,
    phase: "playing", // 'playing', 'character_assignment', 'setup', 'waiting_for_trump', 'trick_complete'
    ringsBroken: false,
    availableCharacters: [...allCharacters],
    characterAssignmentPlayer: 0,
    setupCharacterIndex: 0,
    exchangeFromPlayer: null,
    exchangeToPlayer: null,
    exchangeCard: null,
    lostCard: lostCard, // Store the lost card
    lastTrickWinner: null, // Track who won the most recent trick
    threatDeck: [1, 2, 3, 4, 5, 6, 7], // Threat deck (shuffled later)
    exchangeMadeInSolitaire: false, // Track if exchange has been made in 1-player mode
  };

  // Shuffle the threat deck
  gameState.threatDeck = shuffleDeck(
    gameState.threatDeck.map((v) => ({ value: v })),
  ).map((c) => c.value);

  // Clear trick display
  document.getElementById("trickCards").innerHTML = "";

  // Hide dialog
  hideDialog();

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
  await startCharacterAssignment(startPlayer);

  updateGameStatus("Starting setup phase...");
  await startSetupPhase();
}

function resetPlayerHeadings() {
  for (let p = 0; p < 4; p++) {
    const nameElement = document.getElementById(`playerName${p + 1}`);
    const objectiveElement = document.getElementById(`objective${p + 1}`);

    if (p === 0) {
      nameElement.textContent = `Player ${p + 1}`;
    } else {
      nameElement.textContent = `Player ${p + 1}`;
    }

    // Clear objective
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
