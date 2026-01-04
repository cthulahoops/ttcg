// ===== UTILITY FUNCTIONS =====

export function sortHand(cards) {
    const suitOrder = { 'mountains': 0, 'shadows': 1, 'forests': 2, 'hills': 3, 'rings': 4 };

    return cards.sort((a, b) => {
        // First sort by suit
        if (suitOrder[a.suit] !== suitOrder[b.suit]) {
            return suitOrder[a.suit] - suitOrder[b.suit];
        }
        // Then by value within the same suit
        return a.value - b.value;
    });
}

export function createCardElement(card, clickable = false, clickHandler = null) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `card ${card.suit}`;
    if (clickable) {
        cardDiv.classList.add('clickable');
        if (clickHandler) {
            cardDiv.onclick = clickHandler;
        }
    }

    const valueDiv = document.createElement('div');
    valueDiv.className = 'value';
    valueDiv.textContent = card.value;

    const suitDiv = document.createElement('div');
    suitDiv.className = 'suit';
    suitDiv.textContent = card.suit;

    cardDiv.appendChild(valueDiv);
    cardDiv.appendChild(suitDiv);

    return cardDiv;
}
