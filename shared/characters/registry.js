"use strict";
// Character Registry
// All character definitions in one place
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allCharacterNames = exports.characterRegistry = void 0;
var Frodo = {
    name: "Frodo",
    setupText: "No setup action",
    setup: function (_game, _seat, _setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    }); },
    objective: {
        getText: function (game) {
            var needed = game.numCharacters === 3 ? "four" : "two";
            return "Win at least ".concat(needed, " ring cards");
        },
        check: function (game, seat) {
            var ringsNeeded = game.numCharacters === 3 ? 4 : 2;
            var ringCards = seat.getAllWonCards().filter(function (c) { return c.suit === "rings"; });
            return ringCards.length >= ringsNeeded;
        },
        isCompletable: function (game, seat) {
            var ringsNeeded = game.numCharacters === 3 ? 4 : 2;
            var myRings = seat
                .getAllWonCards()
                .filter(function (c) { return c.suit === "rings"; }).length;
            var othersRings = game.seats.reduce(function (total, s) {
                if (s.seatIndex !== seat.seatIndex) {
                    return (total + s.getAllWonCards().filter(function (c) { return c.suit === "rings"; }).length);
                }
                return total;
            }, 0);
            var ringsRemaining = 5 - myRings - othersRings;
            return myRings + ringsRemaining >= ringsNeeded;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var ringCards = seat.getAllWonCards().filter(function (c) { return c.suit === "rings"; });
            var ringsNeeded = game.numCharacters === 3 ? 4 : 2;
            var met = ringCards.length >= ringsNeeded;
            var completable = Frodo.objective.isCompletable(game, seat);
            var details;
            if (ringCards.length > 0) {
                var ringList = ringCards
                    .map(function (c) { return c.value; })
                    .sort(function (a, b) { return a - b; })
                    .join(", ");
                details = "Rings: ".concat(ringList);
            }
            else {
                details = "Rings: none";
            }
            return { met: met, completable: completable, details: details };
        },
    },
};
var Gandalf = {
    name: "Gandalf",
    setupText: "Optionally take the lost card, then exchange with Frodo",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.takeLostCard(seat)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, game.exchange(seat, setupContext, function (c) { return c === "Frodo"; })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win at least one trick",
        check: function (_game, seat) { return seat.getTrickCount() >= 1; },
        isCompletable: function (_game, _seat) { return true; }, // Always possible
    },
    display: {
        renderStatus: function (game, seat) {
            var met = Gandalf.objective.check(game, seat);
            return game.displaySimple(met, true);
        },
    },
};
var Merry = {
    name: "Merry",
    setupText: "Exchange with Frodo, Pippin, or Sam",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.exchange(seat, setupContext, function (c) {
                        return ["Frodo", "Pippin", "Sam"].includes(c);
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win exactly one or two tricks",
        check: function (_game, seat) {
            var count = seat.getTrickCount();
            return count === 1 || count === 2;
        },
        isCompletable: function (_game, seat) { return seat.getTrickCount() < 3; },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = Merry.objective.check(game, seat);
            var completable = Merry.objective.isCompletable(game, seat);
            return game.displaySimple(met, completable);
        },
    },
};
var Celeborn = {
    name: "Celeborn",
    setupText: "Exchange with any player",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.exchange(seat, setupContext, function (_c) { return true; })];
                case 1:
                    _a.sent(); // Any player
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win at least three cards of the same rank",
        check: function (_game, seat) {
            var rankCounts = {};
            seat.getAllWonCards().forEach(function (card) {
                rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
            });
            return Object.values(rankCounts).some(function (count) { return count >= 3; });
        },
        isCompletable: function (_game, _seat) { return true; }, // Hard to determine early
    },
    display: {
        renderStatus: function (game, seat) {
            var rankCounts = {};
            seat.getAllWonCards().forEach(function (card) {
                rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
            });
            var met = Celeborn.objective.check(game, seat);
            var ranksWithCounts = Object.entries(rankCounts)
                .filter(function (_a) {
                var _rank = _a[0], count = _a[1];
                return count >= 2;
            })
                .map(function (_a) {
                var rank = _a[0], count = _a[1];
                return "".concat(rank, ":").concat(count);
            })
                .join(", ");
            return {
                met: met,
                completable: true,
                details: ranksWithCounts || undefined,
            };
        },
    },
};
var Pippin = {
    name: "Pippin",
    setupText: "Exchange with Frodo, Merry, or Sam",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.exchange(seat, setupContext, function (c) {
                        return ["Frodo", "Merry", "Sam"].includes(c);
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win the fewest (or joint fewest) tricks",
        check: function (game, seat) {
            var allCounts = game.seats.map(function (s) { return s.getTrickCount(); });
            var minCount = Math.min.apply(Math, allCounts);
            return seat.getTrickCount() === minCount;
        },
        isCompletable: function (game, seat) {
            var allCounts = game.seats.map(function (s) { return s.getTrickCount(); });
            var myCount = seat.getTrickCount();
            // Calculate total gap: how many more tricks does Pippin have than players with fewer?
            var totalGap = 0;
            for (var _i = 0, allCounts_1 = allCounts; _i < allCounts_1.length; _i++) {
                var otherTricks = allCounts_1[_i];
                if (otherTricks < myCount) {
                    totalGap += myCount - otherTricks;
                }
            }
            // Can still complete if other players can catch up with remaining tricks
            return totalGap <= game.tricksRemaining();
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = Pippin.objective.check(game, seat);
            var completable = Pippin.objective.isCompletable(game, seat);
            return game.displaySimple(met, completable);
        },
    },
};
var Boromir = {
    name: "Boromir",
    setupText: "Exchange with anyone except Frodo",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.exchange(seat, setupContext, function (c) { return c !== "Frodo"; })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win the last trick; do NOT win the 1 of Rings",
        check: function (game, seat) {
            var wonLast = game.lastTrickWinner === seat.seatIndex;
            var hasOneRing = game.hasCard(seat, "rings", 1);
            return wonLast && !hasOneRing;
        },
        isCompletable: function (game, seat) { return !game.hasCard(seat, "rings", 1); },
    },
    display: {
        renderStatus: function (game, seat) {
            var wonLast = game.lastTrickWinner === seat.seatIndex;
            var hasOneRing = game.hasCard(seat, "rings", 1);
            var met = Boromir.objective.check(game, seat);
            var completable = Boromir.objective.isCompletable(game, seat);
            var lastIcon = wonLast ? "✓" : "✗";
            var oneRingIcon = hasOneRing ? "✗ (has 1-Ring)" : "✓";
            var details = "Last: ".concat(lastIcon, ", 1-Ring: ").concat(oneRingIcon);
            return { met: met, completable: completable, details: details };
        },
    },
};
var Sam = {
    name: "Sam",
    setupText: "Draw a Hills threat card, then exchange with Frodo, Merry, or Pippin",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, game.drawThreatCard(seat, {
                        exclude: (_a = game.lostCard) === null || _a === void 0 ? void 0 : _a.value,
                    })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, game.exchange(seat, setupContext, function (c) {
                            return ["Frodo", "Merry", "Pippin"].includes(c);
                        })];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win the Hills card matching your threat card",
        check: function (game, seat) {
            if (!seat.threatCard)
                return false;
            return game.hasCard(seat, "hills", seat.threatCard);
        },
        isCompletable: function (game, seat) {
            if (!seat.threatCard)
                return true;
            return !game.cardGone(seat, "hills", seat.threatCard);
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = Sam.objective.check(game, seat);
            var completable = Sam.objective.isCompletable(game, seat);
            return game.displayThreatCard(seat, met, completable);
        },
    },
};
var Gimli = {
    name: "Gimli",
    setupText: "Draw a Mountains threat card, then exchange with Legolas or Aragorn",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, game.drawThreatCard(seat, {
                        exclude: (_a = game.lostCard) === null || _a === void 0 ? void 0 : _a.value,
                    })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, game.exchange(seat, setupContext, function (c) {
                            return ["Legolas", "Aragorn"].includes(c);
                        })];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win the Mountains card matching your threat card",
        check: function (game, seat) {
            if (!seat.threatCard)
                return false;
            return game.hasCard(seat, "mountains", seat.threatCard);
        },
        isCompletable: function (game, seat) {
            if (!seat.threatCard)
                return true;
            return !game.cardGone(seat, "mountains", seat.threatCard);
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = Gimli.objective.check(game, seat);
            var completable = Gimli.objective.isCompletable(game, seat);
            return game.displayThreatCard(seat, met, completable);
        },
    },
};
var Legolas = {
    name: "Legolas",
    setupText: "Draw a Forests threat card, then exchange with Gimli or Aragorn",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, game.drawThreatCard(seat, {
                        exclude: (_a = game.lostCard) === null || _a === void 0 ? void 0 : _a.value,
                    })];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, game.exchange(seat, setupContext, function (c) {
                            return ["Gimli", "Aragorn"].includes(c);
                        })];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win the Forests card matching your threat card",
        check: function (game, seat) {
            if (!seat.threatCard)
                return false;
            return game.hasCard(seat, "forests", seat.threatCard);
        },
        isCompletable: function (game, seat) {
            if (!seat.threatCard)
                return true;
            return !game.cardGone(seat, "forests", seat.threatCard);
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = Legolas.objective.check(game, seat);
            var completable = Legolas.objective.isCompletable(game, seat);
            return game.displayThreatCard(seat, met, completable);
        },
    },
};
var Aragorn = {
    name: "Aragorn",
    setupText: "Choose a threat card, then exchange with Gimli or Legolas",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.chooseThreatCard(seat)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, game.exchange(seat, setupContext, function (c) {
                            return ["Gimli", "Legolas"].includes(c);
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win exactly the number of tricks shown on your threat card",
        check: function (_game, seat) {
            if (!seat.threatCard)
                return false;
            return seat.getTrickCount() === seat.threatCard;
        },
        isCompletable: function (game, seat) {
            if (!seat.threatCard)
                return true;
            var target = seat.threatCard;
            var current = seat.getTrickCount();
            // Impossible if already over target
            if (current > target)
                return false;
            // Check if there are enough tricks remaining to reach target
            var tricksNeeded = target - current;
            return game.tricksRemaining() >= tricksNeeded;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = Aragorn.objective.check(game, seat);
            var completable = Aragorn.objective.isCompletable(game, seat);
            return game.displayThreatCard(seat, met, completable);
        },
    },
};
var Goldberry = {
    name: "Goldberry",
    setupText: "Turn your hand face-up (visible to all players)",
    setup: function (game, seat, _setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            game.revealHand(seat);
            return [2 /*return*/];
        });
    }); },
    objective: {
        text: "Win exactly three tricks in a row and no other tricks",
        check: function (_game, seat) {
            var trickNumbers = seat.tricksWon
                .map(function (t) { return t.number; })
                .sort(function (a, b) { return a - b; });
            if (trickNumbers.length !== 3)
                return false;
            return (trickNumbers[1] === trickNumbers[0] + 1 &&
                trickNumbers[2] === trickNumbers[1] + 1);
        },
        isCompletable: function (game, seat) {
            var trickCount = seat.getTrickCount();
            if (trickCount > 3)
                return false;
            if (trickCount === 3) {
                return Goldberry.objective.check(game, seat);
            }
            if (trickCount === 0) {
                return game.tricksRemaining() >= 3;
            }
            var trickNumbers = seat.tricksWon
                .map(function (t) { return t.number; })
                .sort(function (a, b) { return a - b; });
            for (var i = 1; i < trickNumbers.length; i++) {
                if (trickNumbers[i] !== trickNumbers[i - 1] + 1) {
                    return false;
                }
            }
            var maxTrickWon = trickNumbers[trickNumbers.length - 1];
            if (game.currentTrickNumber > maxTrickWon + 1) {
                return false;
            }
            var tricksNeeded = 3 - trickCount;
            return game.tricksRemaining() >= tricksNeeded;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = Goldberry.objective.check(game, seat);
            var completable = Goldberry.objective.isCompletable(game, seat);
            return game.displaySimple(met, completable);
        },
    },
};
var Glorfindel = {
    name: "Glorfindel",
    setupText: "Optionally take the lost card",
    setup: function (game, seat, _setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.takeLostCard(seat)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win every Shadows card",
        check: function (_game, seat) {
            var shadowsCards = seat
                .getAllWonCards()
                .filter(function (c) { return c.suit === "shadows"; });
            return shadowsCards.length === 8; // All shadows cards (1-8)
        },
        isCompletable: function (game, seat) {
            for (var value = 1; value <= 8; value++) {
                if (game.cardGone(seat, "shadows", value)) {
                    return false;
                }
            }
            return true;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var shadowsCards = seat
                .getAllWonCards()
                .filter(function (c) { return c.suit === "shadows"; });
            var met = Glorfindel.objective.check(game, seat);
            var completable = Glorfindel.objective.isCompletable(game, seat);
            return {
                met: met,
                completable: completable,
                details: "Shadows: ".concat(shadowsCards.length, "/8"),
            };
        },
    },
};
var Galadriel = {
    name: "Galadriel",
    setupText: "Exchange with either the lost card or Gandalf",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        var choice;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.choice(seat, "Exchange with?", [
                        "Lost Card",
                        "Gandalf",
                    ])];
                case 1:
                    choice = _a.sent();
                    if (!(choice === "Lost Card")) return [3 /*break*/, 3];
                    return [4 /*yield*/, game.exchangeWithLostCard(seat, setupContext)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, game.exchange(seat, setupContext, function (c) { return c === "Gandalf"; })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win neither the fewest nor the most tricks",
        check: function (game, seat) {
            var allCounts = game.seats.map(function (s) { return s.getTrickCount(); });
            var minCount = Math.min.apply(Math, allCounts);
            var maxCount = Math.max.apply(Math, allCounts);
            var myCount = seat.getTrickCount();
            return myCount !== minCount && myCount !== maxCount;
        },
        isCompletable: function (game, seat) {
            var allCounts = game.seats.map(function (s) { return s.getTrickCount(); });
            var minCount = Math.min.apply(Math, allCounts);
            var maxCount = Math.max.apply(Math, allCounts);
            var myCount = seat.getTrickCount();
            // Optimistic assumption: currentMin stays finalMin
            // Galadriel needs to be at least currentMin + 1
            var targetGaladriel = Math.max(minCount + 1, myCount);
            // Someone needs to be above Galadriel for max
            var targetMax = Math.max(maxCount, targetGaladriel + 1);
            // Calculate tricks needed to reach this state
            var tricksNeededForGaladriel = targetGaladriel - myCount;
            var tricksNeededForMax = targetMax - maxCount;
            return (tricksNeededForGaladriel + tricksNeededForMax <= game.tricksRemaining());
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = Galadriel.objective.check(game, seat);
            var completable = Galadriel.objective.isCompletable(game, seat);
            return game.displaySimple(met, completable);
        },
    },
};
var GildorInglorian = {
    name: "Gildor Inglorian",
    setupText: "Exchange with Frodo",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.exchange(seat, setupContext, function (c) { return c === "Frodo"; })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Play a forests card in final trick",
        check: function (game, seat) {
            if (!game.finished) {
                return false; // Final trick hasn't been played yet
            }
            // Find the last card played by this seat
            var lastCardPlayed = seat.playedCards[seat.playedCards.length - 1];
            return lastCardPlayed && lastCardPlayed.suit === "forests";
        },
        isCompletable: function (game, seat) {
            if (game.finished) {
                return GildorInglorian.objective.check(game, seat);
            }
            // Still completable if player has forests cards in hand
            var availableCards = seat.hand.getAvailableCards();
            return availableCards.some(function (c) { return c.suit === "forests"; });
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = GildorInglorian.objective.check(game, seat);
            var completable = GildorInglorian.objective.isCompletable(game, seat);
            var details;
            if (game.finished) {
                details = "Final trick played";
            }
            else {
                var availableCards = seat.hand.getAvailableCards();
                var forestsInHand = availableCards.filter(function (c) { return c.suit === "forests"; }).length;
                details = "Forests: ".concat(forestsInHand, " in hand");
            }
            return { met: met, completable: completable, details: details };
        },
    },
};
var FarmerMaggot = {
    name: "Farmer Maggot",
    setupText: "Draw a Hills threat card, then exchange with Merry or Pippin",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.drawThreatCard(seat)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, game.exchange(seat, setupContext, function (c) {
                            return ["Merry", "Pippin"].includes(c);
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win at least two cards matching the threat card rank",
        check: function (_game, seat) {
            if (!seat.threatCard)
                return false;
            var matchingCards = seat
                .getAllWonCards()
                .filter(function (c) { return c.value === seat.threatCard; });
            return matchingCards.length >= 2;
        },
        isCompletable: function (game, seat) {
            if (!seat.threatCard)
                return true;
            var matchingWon = seat
                .getAllWonCards()
                .filter(function (c) { return c.value === seat.threatCard; }).length;
            var matchingAvailable = 0;
            var suits = [
                "mountains",
                "shadows",
                "forests",
                "hills",
                "rings",
            ];
            for (var _i = 0, suits_1 = suits; _i < suits_1.length; _i++) {
                var suit = suits_1[_i];
                var maxValue = suit === "rings" ? 5 : 8;
                if (seat.threatCard <= maxValue) {
                    if (!game.cardGone(seat, suit, seat.threatCard)) {
                        matchingAvailable++;
                    }
                }
            }
            return matchingWon + matchingAvailable >= 2;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            if (!seat.threatCard) {
                return game.displaySimple(false, true);
            }
            var matchingCards = seat
                .getAllWonCards()
                .filter(function (c) { return c.value === seat.threatCard; });
            var met = FarmerMaggot.objective.check(game, seat);
            var completable = FarmerMaggot.objective.isCompletable(game, seat);
            return {
                met: met,
                completable: completable,
                details: "Threat: ".concat(seat.threatCard, ", Won: ").concat(matchingCards.length, "/2"),
            };
        },
    },
};
var FattyBolger = {
    name: "Fatty Bolger",
    setupText: "Give a card to every other character (don't take any back)",
    setup: function (game, seat, _setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        var _i, _a, otherSeat, availableCards;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (game.numCharacters === 1) {
                        game.revealHand(seat);
                    }
                    _i = 0, _a = game.seats;
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    otherSeat = _a[_i];
                    if (!(otherSeat.seatIndex !== seat.seatIndex)) return [3 /*break*/, 3];
                    availableCards = seat.hand.getAvailableCards();
                    if (availableCards.length === 0) {
                        return [3 /*break*/, 4];
                    }
                    return [4 /*yield*/, game.giveCard(seat, otherSeat)];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    game.tricksToPlay += 1;
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win exactly one trick",
        check: function (_game, seat) { return seat.getTrickCount() === 1; },
        isCompletable: function (_game, seat) { return seat.getTrickCount() <= 1; },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = FattyBolger.objective.check(game, seat);
            var completable = FattyBolger.objective.isCompletable(game, seat);
            return game.displaySimple(met, completable);
        },
    },
};
var TomBombadil = {
    name: "Tom Bombadil",
    setupText: "Take the lost card, then exchange with Frodo",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.takeLostCard(seat)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, game.exchange(seat, setupContext, function (c) { return c === "Frodo"; })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win 3 or more cards matching the suit of a card left in hand at the end of round",
        check: function (_game, seat) {
            var cardsInHand = seat.hand.getAvailableCards();
            if (cardsInHand.length === 0)
                return false;
            var wonBySuit = {
                mountains: 0,
                shadows: 0,
                forests: 0,
                hills: 0,
                rings: 0,
            };
            seat.getAllWonCards().forEach(function (card) {
                wonBySuit[card.suit] = (wonBySuit[card.suit] || 0) + 1;
            });
            for (var _i = 0, cardsInHand_1 = cardsInHand; _i < cardsInHand_1.length; _i++) {
                var card = cardsInHand_1[_i];
                if (wonBySuit[card.suit] >= 3) {
                    return true;
                }
            }
            return false;
        },
        isCompletable: function (game, seat) {
            if (game.finished) {
                return TomBombadil.objective.check(game, seat);
            }
            // TODO: Implement proper completability check
            // (need to check if we can still win 3+ cards of suits in hand)
            return true;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = TomBombadil.objective.check(game, seat);
            var completable = TomBombadil.objective.isCompletable(game, seat);
            var wonBySuit = {
                mountains: 0,
                shadows: 0,
                forests: 0,
                hills: 0,
                rings: 0,
            };
            seat.getAllWonCards().forEach(function (card) {
                wonBySuit[card.suit] = (wonBySuit[card.suit] || 0) + 1;
            });
            var suitSymbols = {
                mountains: "⛰️",
                shadows: "👁️",
                forests: "🌲",
                hills: "🏔️",
                rings: "💍",
            };
            var countsDisplay = Object.keys(wonBySuit)
                .filter(function (suit) { return wonBySuit[suit] >= 2; })
                .map(function (suit) { return "".concat(suitSymbols[suit], ":").concat(wonBySuit[suit]); })
                .join(" ");
            return {
                met: met,
                completable: completable,
                details: countsDisplay || undefined,
            };
        },
    },
};
var BarlimanButterbur = {
    name: "Barliman Butterbur",
    setupText: "Exchange with any player",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.exchange(seat, setupContext, function (_c) { return true; })];
                case 1:
                    _a.sent(); // Any player
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win at least one of the last three tricks",
        check: function (game, seat) {
            return seat.tricksWon.some(function (t) { return t.number >= game.tricksToPlay - 3; });
        },
        isCompletable: function () {
            return true;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = BarlimanButterbur.objective.check(game, seat);
            var completable = BarlimanButterbur.objective.isCompletable(game, seat);
            return game.displaySimple(met, completable);
        },
    },
};
var BillThePony = {
    name: "Bill the Pony",
    setupText: "Exchange simultaneously with Sam and Frodo",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        var samExchange, frodoExchange;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.setupExchange(seat, setupContext, function (c) { return c === "Sam"; })];
                case 1:
                    samExchange = _a.sent();
                    return [4 /*yield*/, game.setupExchange(seat, setupContext, function (c) { return c === "Frodo"; })];
                case 2:
                    frodoExchange = _a.sent();
                    if (samExchange) {
                        game.completeExchange(samExchange, setupContext);
                    }
                    if (frodoExchange) {
                        game.completeExchange(frodoExchange, setupContext);
                    }
                    if (samExchange || frodoExchange) {
                        game.refreshDisplay();
                    }
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win exactly one trick",
        check: function (_game, seat) { return seat.getTrickCount() === 1; },
        isCompletable: function (_game, seat) { return seat.getTrickCount() <= 1; },
    },
    display: {
        renderStatus: function (game, seat) {
            var met = BillThePony.objective.check(game, seat);
            var completable = BillThePony.objective.isCompletable(game, seat);
            return game.displaySimple(met, completable);
        },
    },
};
var Elrond = {
    name: "Elrond",
    setupText: "Everyone simultaneously passes 1 card to the right",
    setup: function (game, _seat, _setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        var cardsToPass, i, seat, availableCards, card, i, i, toSeat;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cardsToPass = [];
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < game.seats.length)) return [3 /*break*/, 4];
                    seat = game.seats[i];
                    availableCards = seat.hand.getAvailableCards();
                    return [4 /*yield*/, seat.controller.chooseCard({
                            title: "".concat(seat.character, " - Pass to Right"),
                            message: "Choose a card to pass to the player on your right",
                            cards: availableCards,
                        })];
                case 2:
                    card = _a.sent();
                    cardsToPass.push(card);
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4:
                    for (i = 0; i < game.seats.length; i++) {
                        game.seats[i].hand.removeCard(cardsToPass[i]);
                    }
                    for (i = 0; i < game.seats.length; i++) {
                        toSeat = game.seats[(i + 1) % game.seats.length];
                        toSeat.hand.addCard(cardsToPass[i]);
                    }
                    game.log("Everyone passes a card to the right");
                    game.refreshDisplay();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Every character must win a ring card",
        check: function (game, _seat) {
            return game.seats.every(function (s) {
                var ringCards = s.getAllWonCards().filter(function (c) { return c.suit === "rings"; });
                return ringCards.length >= 1;
            });
        },
        isCompletable: function (game, _seat) {
            var seatsNeedingRing = game.seats.filter(function (s) {
                var ringCards = s.getAllWonCards().filter(function (c) { return c.suit === "rings"; });
                return ringCards.length === 0;
            }).length;
            var totalRingCardsWon = game.seats.reduce(function (total, s) {
                return total + s.getAllWonCards().filter(function (c) { return c.suit === "rings"; }).length;
            }, 0);
            var ringsRemaining = 5 - totalRingCardsWon;
            return ringsRemaining >= seatsNeedingRing;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var seatsWithRings = game.seats.filter(function (s) {
                var ringCards = s.getAllWonCards().filter(function (c) { return c.suit === "rings"; });
                return ringCards.length >= 1;
            }).length;
            var met = Elrond.objective.check(game, seat);
            var completable = Elrond.objective.isCompletable(game, seat);
            return {
                met: met,
                completable: completable,
                details: "Seats with rings: ".concat(seatsWithRings, "/").concat(game.seats.length),
            };
        },
    },
};
var Arwen = {
    name: "Arwen",
    setupText: "Exchange with Elrond or Aragorn",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.exchange(seat, setupContext, function (c) {
                        return ["Elrond", "Aragorn"].includes(c);
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win the most forests cards",
        check: function (game, seat) {
            var myCounts = seat
                .getAllWonCards()
                .filter(function (c) { return c.suit === "forests"; }).length;
            // Check if this seat has strictly more than all others
            return game.seats.every(function (s) {
                if (s.seatIndex === seat.seatIndex)
                    return true;
                var theirCounts = s
                    .getAllWonCards()
                    .filter(function (c) { return c.suit === "forests"; }).length;
                return myCounts > theirCounts;
            });
        },
        isCompletable: function (game, seat) {
            var myCounts = seat
                .getAllWonCards()
                .filter(function (c) { return c.suit === "forests"; }).length;
            var othersMaxCounts = Math.max.apply(Math, game.seats
                .filter(function (s) { return s.seatIndex !== seat.seatIndex; })
                .map(function (s) {
                return s.getAllWonCards().filter(function (c) { return c.suit === "forests"; }).length;
            }));
            var totalForestsWon = game.seats.reduce(function (total, s) {
                return total + s.getAllWonCards().filter(function (c) { return c.suit === "forests"; }).length;
            }, 0);
            var forestsRemaining = 8 - totalForestsWon;
            return myCounts + forestsRemaining > othersMaxCounts;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var myCounts = seat
                .getAllWonCards()
                .filter(function (c) { return c.suit === "forests"; }).length;
            var met = Arwen.objective.check(game, seat);
            var completable = Arwen.objective.isCompletable(game, seat);
            return {
                met: met,
                completable: completable,
                details: "Forests: ".concat(myCounts),
            };
        },
    },
};
var Gloin = {
    name: "Gloin",
    setupText: "Exchange with Bilbo or Gimli",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.exchange(seat, setupContext, function (c) {
                        return ["Bilbo Baggins", "Gimli"].includes(c);
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win the most mountains cards",
        check: function (game, seat) {
            var myCounts = seat
                .getAllWonCards()
                .filter(function (c) { return c.suit === "mountains"; }).length;
            // Check if this seat has strictly more than all others
            return game.seats.every(function (s) {
                if (s.seatIndex === seat.seatIndex)
                    return true;
                var theirCounts = s
                    .getAllWonCards()
                    .filter(function (c) { return c.suit === "mountains"; }).length;
                return myCounts > theirCounts;
            });
        },
        isCompletable: function (game, seat) {
            var myCounts = seat
                .getAllWonCards()
                .filter(function (c) { return c.suit === "mountains"; }).length;
            var othersMaxCounts = Math.max.apply(Math, game.seats
                .filter(function (s) { return s.seatIndex !== seat.seatIndex; })
                .map(function (s) {
                return s.getAllWonCards().filter(function (c) { return c.suit === "mountains"; }).length;
            }));
            var totalMountainsWon = game.seats.reduce(function (total, s) {
                return total +
                    s.getAllWonCards().filter(function (c) { return c.suit === "mountains"; }).length;
            }, 0);
            var mountainsRemaining = 8 - totalMountainsWon;
            return myCounts + mountainsRemaining > othersMaxCounts;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var myCounts = seat
                .getAllWonCards()
                .filter(function (c) { return c.suit === "mountains"; }).length;
            var met = Gloin.objective.check(game, seat);
            var completable = Gloin.objective.isCompletable(game, seat);
            return {
                met: met,
                completable: completable,
                details: "Mountains: ".concat(myCounts),
            };
        },
    },
};
var BilboBaggins = {
    name: "Bilbo Baggins",
    setupText: "No setup action",
    setup: function (_game, _seat, _setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    }); },
    objective: {
        text: "Win 3 or more tricks; do NOT win the 1 of Rings",
        check: function (game, seat) {
            var trickCount = seat.getTrickCount();
            var hasOneRing = game.hasCard(seat, "rings", 1);
            return trickCount >= 3 && !hasOneRing;
        },
        isCompletable: function (game, seat) {
            // Impossible if already has 1 of Rings
            return !game.hasCard(seat, "rings", 1);
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var trickCount = seat.getTrickCount();
            var hasOneRing = game.hasCard(seat, "rings", 1);
            var met = BilboBaggins.objective.check(game, seat);
            var completable = BilboBaggins.objective.isCompletable(game, seat);
            var tricksIcon = trickCount >= 3 ? "✓" : "".concat(trickCount, "/3");
            var oneRingIcon = hasOneRing ? "✗ (has 1-Ring)" : "✓";
            var details = "Tricks: ".concat(tricksIcon, ", 1-Ring: ").concat(oneRingIcon);
            return { met: met, completable: completable, details: details };
        },
    },
};
var Gwaihir = {
    name: "Gwaihir",
    setupText: "Exchange with Gandalf twice",
    setup: function (game, seat, setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, game.exchange(seat, setupContext, function (c) { return c === "Gandalf"; })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, game.exchange(seat, setupContext, function (c) { return c === "Gandalf"; })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    objective: {
        text: "Win at least two tricks containing a mountain card",
        check: function (_game, seat) {
            var tricksWithMountains = seat.tricksWon.filter(function (trick) {
                return trick.cards.some(function (c) { return c.suit === "mountains"; });
            });
            return tricksWithMountains.length >= 2;
        },
        isCompletable: function (_game, _seat) {
            // Hard to determine without knowing remaining mountains distribution
            // Simplified: always completable
            return true;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var tricksWithMountains = seat.tricksWon.filter(function (trick) {
                return trick.cards.some(function (c) { return c.suit === "mountains"; });
            });
            var met = Gwaihir.objective.check(game, seat);
            var completable = Gwaihir.objective.isCompletable(game, seat);
            return {
                met: met,
                completable: completable,
                details: "Tricks with mountains: ".concat(tricksWithMountains.length, "/2"),
            };
        },
    },
};
var Shadowfax = {
    name: "Shadowfax",
    setupText: "Set one card aside (may return it to hand at any point, must return if hand empty)",
    setup: function (_game, _seat, _setupContext) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    }); },
    objective: {
        text: "Win at least two tricks containing a hills card",
        check: function (_game, seat) {
            var tricksWithHills = seat.tricksWon.filter(function (trick) {
                return trick.cards.some(function (c) { return c.suit === "hills"; });
            });
            return tricksWithHills.length >= 2;
        },
        isCompletable: function (_game, _seat) {
            // Hard to determine without knowing remaining hills distribution
            // Simplified: always completable
            return true;
        },
    },
    display: {
        renderStatus: function (game, seat) {
            var tricksWithHills = seat.tricksWon.filter(function (trick) {
                return trick.cards.some(function (c) { return c.suit === "hills"; });
            });
            var met = Shadowfax.objective.check(game, seat);
            var completable = Shadowfax.objective.isCompletable(game, seat);
            return {
                met: met,
                completable: completable,
                details: "Tricks with hills: ".concat(tricksWithHills.length, "/2"),
            };
        },
    },
};
exports.characterRegistry = new Map([
    [Frodo.name, Frodo],
    [Gandalf.name, Gandalf],
    [Merry.name, Merry],
    [Celeborn.name, Celeborn],
    [Pippin.name, Pippin],
    [Boromir.name, Boromir],
    [Sam.name, Sam],
    [Gimli.name, Gimli],
    [Legolas.name, Legolas],
    [Aragorn.name, Aragorn],
    [Goldberry.name, Goldberry],
    [Glorfindel.name, Glorfindel],
    [Galadriel.name, Galadriel],
    [GildorInglorian.name, GildorInglorian],
    [FarmerMaggot.name, FarmerMaggot],
    [FattyBolger.name, FattyBolger],
    [TomBombadil.name, TomBombadil],
    [BarlimanButterbur.name, BarlimanButterbur],
    [BillThePony.name, BillThePony],
    [Elrond.name, Elrond],
    [Arwen.name, Arwen],
    [Gloin.name, Gloin],
    [BilboBaggins.name, BilboBaggins],
    [Gwaihir.name, Gwaihir],
    [Shadowfax.name, Shadowfax],
]);
exports.allCharacterNames = Array.from(exports.characterRegistry.keys());
