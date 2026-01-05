// ===== HAND CLASSES =====

import { sortHand, createCardElement } from './utils.js';

export class Hand {
    addCard(card) { throw new Error('Abstract'); }
    removeCard(card) { throw new Error('Abstract'); }
    getAvailableCards() { throw new Error('Abstract'); }
    isEmpty() { throw new Error('Abstract'); }
    getSize() { throw new Error('Abstract'); }
    render(domElement, isPlayable, onClick) { throw new Error('Abstract'); }
    getAllCards() { throw new Error('Abstract'); }
}

export class PlayerHand extends Hand {
    constructor() {
        super();
        this._cards = [];
    }

    addCard(card) {
        this._cards.push(card);
    }

    removeCard(card) {
        const index = this._cards.findIndex(c => c.suit === card.suit && c.value === card.value);
        if (index !== -1) {
            this._cards.splice(index, 1);
            return true;
        }
        return false;
    }

    getAvailableCards() {
        return [...this._cards];
    }

    isEmpty() {
        return this._cards.length === 0;
    }

    getSize() {
        return this._cards.length;
    }

    getAllCards() {
        return [...this._cards];
    }

    render(domElement, isPlayable, onClick) {
        domElement.innerHTML = '';
        domElement.classList.remove('pyramid-hand');

        const sorted = sortHand([...this._cards]);

        sorted.forEach(card => {
            const canPlay = isPlayable(card);
            const cardElement = createCardElement(card, canPlay, canPlay ? () => onClick(card) : null);

            if (!canPlay) {
                cardElement.classList.add('disabled');
            }

            domElement.appendChild(cardElement);
        });
    }
}

export class PyramidHand extends Hand {
    constructor() {
        super();
        this._positions = new Array(12).fill(null);
        this._faceUp = [
            true, false, true,              // row 0 (top)
            false, false, false, false,     // row 1 (middle)
            true, true, true, true, true    // row 2 (bottom)
        ];
        this._extraCards = [];
        this._revealCallback = null;
    }

    addCard(card) {
        const emptyIndex = this._positions.findIndex(pos => pos === null);
        if (emptyIndex !== -1) {
            this._positions[emptyIndex] = card;
        } else {
            this._extraCards.push(card);
        }
    }

    removeCard(card) {
        // Check extra cards first
        const extraIndex = this._extraCards.findIndex(
            c => c.suit === card.suit && c.value === card.value
        );
        if (extraIndex !== -1) {
            this._extraCards.splice(extraIndex, 1);
            return true;
        }

        // Check pyramid positions
        const posIndex = this._positions.findIndex(
            c => c && c.suit === card.suit && c.value === card.value
        );
        if (posIndex !== -1) {
            this._positions[posIndex] = null;
            this._revealNewlyUncoveredCards();
            return true;
        }

        return false;
    }

    getAvailableCards() {
        const uncoveredIndices = this._getUncoveredIndices();
        const available = [];

        uncoveredIndices.forEach(idx => {
            available.push(this._positions[idx]);
        });

        available.push(...this._extraCards);
        return available;
    }

    isEmpty() {
        for (let i = 0; i < 12; i++) {
            if (this._positions[i]) return false;
        }
        return this._extraCards.length === 0;
    }

    getSize() {
        let count = 0;
        for (let i = 0; i < 12; i++) {
            if (this._positions[i]) count++;
        }
        return count + this._extraCards.length;
    }

    getAllCards() {
        const allCards = [];
        for (let i = 0; i < 12; i++) {
            if (this._positions[i]) {
                allCards.push(this._positions[i]);
            }
        }
        allCards.push(...this._extraCards);
        return allCards;
    }

    onCardRevealed(callback) {
        this._revealCallback = callback;
    }

    _revealNewlyUncoveredCards() {
        for (let i = 0; i < 12; i++) {
            if (this._positions[i] && !this._faceUp[i] && !this._isCovered(i)) {
                this._faceUp[i] = true;
                if (this._revealCallback) {
                    this._revealCallback(i, this._positions[i]);
                }
            }
        }
    }

    _isCovered(cardIndex) {
        const coveringIndices = this._getCoveringIndices(cardIndex);
        return coveringIndices.some(idx => this._positions[idx] !== null);
    }

    _getCoveringIndices(cardIndex) {
        // Bottom row (7-11): not covered
        if (cardIndex >= 7 && cardIndex <= 11) return [];

        // Middle row (3-6): covered by bottom row
        if (cardIndex >= 3 && cardIndex <= 6) {
            const row1Position = cardIndex - 3;
            const covering = [];
            covering.push(row1Position + 7);  // Left covering card
            covering.push(row1Position + 8);  // Right covering card
            return covering;
        }

        // Top row (0-2): covered by middle row
        if (cardIndex >= 0 && cardIndex <= 2) {
            const row0Position = cardIndex;
            const covering = [];
            covering.push(row0Position + 3);  // Left covering card
            covering.push(row0Position + 4);  // Right covering card
            return covering;
        }

        return [];
    }

    _getUncoveredIndices() {
        const uncovered = [];
        for (let i = 0; i < 12; i++) {
            if (this._positions[i] && !this._isCovered(i)) {
                uncovered.push(i);
            }
        }
        return uncovered;
    }

    render(domElement, isPlayable, onClick) {
        domElement.innerHTML = '';
        domElement.classList.add('pyramid-hand');

        const uncoveredIndices = this._getUncoveredIndices();
        const rows = [
            { start: 0, count: 3 },   // Top row
            { start: 3, count: 4 },   // Middle row
            { start: 7, count: 5 }    // Bottom row
        ];

        rows.forEach((rowInfo, rowIdx) => {
            for (let colIdx = 0; colIdx < rowInfo.count; colIdx++) {
                const cardIdx = rowInfo.start + colIdx;
                const card = this._positions[cardIdx];

                if (!card) continue;

                const isFaceUp = this._faceUp[cardIdx];
                const isUncovered = uncoveredIndices.includes(cardIdx);

                let cardElement;

                if (isFaceUp) {
                    const canPlay = isPlayable(card);
                    cardElement = createCardElement(
                        card,
                        canPlay,
                        canPlay ? () => onClick(card) : null
                    );

                    cardElement.classList.add(isUncovered ? 'pyramid-uncovered' : 'pyramid-covered');

                    if (!canPlay) {
                        cardElement.classList.add('disabled');
                    }
                } else {
                    // Face-down card
                    cardElement = document.createElement('div');
                    cardElement.className = 'card pyramid-face-down';
                    if (!isUncovered) cardElement.classList.add('pyramid-covered');

                    const valueDiv = document.createElement('div');
                    valueDiv.className = 'value';
                    valueDiv.textContent = '?';
                    cardElement.appendChild(valueDiv);
                }

                cardElement.style.gridRow = `${rowIdx + 1} / span 2`;
                cardElement.style.gridColumn = `${2 * colIdx + (3 - rowIdx)} / span 2`;
                cardElement.style.zIndex = `${rowIdx}`

                domElement.appendChild(cardElement);
            }
        });

        // Render extra cards
        if (this._extraCards.length > 0) {
            const extraRowDiv = document.createElement('div');
            extraRowDiv.className = 'pyramid-row pyramid-row-extra';

            this._extraCards.forEach(card => {
                const canPlay = isPlayable(card);
                const cardElement = createCardElement(
                    card,
                    canPlay,
                    canPlay ? () => onClick(card) : null
                );
                cardElement.classList.add('pyramid-extra');

                if (!canPlay) {
                    cardElement.classList.add('disabled');
                }

                extraRowDiv.appendChild(cardElement);
            });

            domElement.appendChild(extraRowDiv);
        }
    }
}

export class HiddenHand extends Hand {
    constructor(wrappedHand) {
        super();
        this._wrappedHand = wrappedHand;
    }

    addCard(card) {
        return this._wrappedHand.addCard(card);
    }

    removeCard(card) {
        return this._wrappedHand.removeCard(card);
    }

    getAvailableCards() {
        return this._wrappedHand.getAvailableCards();
    }

    isEmpty() {
        return this._wrappedHand.isEmpty();
    }

    getSize() {
        return this._wrappedHand.getSize();
    }

    getAllCards() {
        return this._wrappedHand.getAllCards();
    }

    render(domElement, isPlayable, onClick) {
        domElement.innerHTML = '';
        domElement.classList.remove('pyramid-hand');

        const handSize = this.getSize();

        for (let i = 0; i < handSize; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card hidden';
            const valueDiv = document.createElement('div');
            valueDiv.className = 'value';
            valueDiv.textContent = '?';
            cardBack.appendChild(valueDiv);
            domElement.appendChild(cardBack);
        }
    }

    // Expose wrapped hand for direct access if needed
    unwrap() {
        return this._wrappedHand;
    }
}
