const SUITS = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
};

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];

function buildDeck() {
    const suits = [SUITS.hearts, SUITS.diamonds, SUITS.clubs, SUITS.spades];
    const deck = [];
    for (const r of RANKS) {
        for (const s of suits) deck.push(r + s);
    }
    return deck;
}

// Fisher–Yates shuffle (in-place). Returns the array for convenience.
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
    return array;
}

// Map a single card (e.g. 'A♥', 'T♣', '7♦') to a single uppercase letter.
// Hearts & Spades -> A..M (Ace..King), Clubs & Diamonds -> N..Z (Ace..King).
function cardToLetter(card) {
    if (typeof card !== 'string' || card.length < 2) {
        throw new Error('card must be a string like "A♥" or "T♣"');
    }
    const suit = card.slice(-1);
    const rank = card.slice(0, -1);

    const rankIndex = RANKS.indexOf(rank);
    if (rankIndex === -1) throw new Error('Invalid rank: ' + rank);

    const heartsSpades = [SUITS.hearts, SUITS.spades];
    const clubsDiamonds = [SUITS.diamonds, SUITS.clubs];

    let baseCharCode;
    if (heartsSpades.includes(suit)) {
        baseCharCode = 'A'.charCodeAt(0); // A (Ace) .. M (King)
    } else if (clubsDiamonds.includes(suit)) {
        baseCharCode = 'N'.charCodeAt(0); // N (Ace) .. Z (King)
    } else {
        throw new Error('Invalid suit: ' + suit);
    }

    return String.fromCharCode(baseCharCode + rankIndex);
}

// Map a letter A..Z back to the possible cards. Because the mapping folds two
// suits into the same letter-range, this returns an array of one or two cards.
// Example: 'A' -> ['A♥','A♠'] (hearts/spades) and 'N' -> ['A♣','A♦'] (clubs/diamonds)
function letterToCards(letter) {
    if (typeof letter !== 'string' || letter.length !== 1) {
        throw new Error('letter must be a single character A..Z');
    }
    const up = letter.toUpperCase();
    const code = up.charCodeAt(0);
    if (code < 65 || code > 90) throw new Error(`letter must be A..Z, was '${letter}'`);

    // A..M -> hearts/spades, N..Z -> clubs/diamonds
    if (code >= 65 && code <= 77) {
        const rankIndex = code - 'A'.charCodeAt(0);
        const rank = RANKS[rankIndex];
        return [rank + SUITS.hearts, rank + SUITS.spades];
    } else {
        const rankIndex = code - 'N'.charCodeAt(0);
        if (rankIndex < 0 || rankIndex >= RANKS.length) {
            throw new Error('letter out of mapping range');
        }
        const rank = RANKS[rankIndex];
        return [rank + SUITS.diamonds, rank + SUITS.clubs];
    }
}

function separateRedAndBacks(deck = buildDeck()) {
    const red = [];
    const blacks = [];
    const redSuits = [SUITS.hearts, SUITS.diamonds];
    for (const card of deck) {
        if (typeof card !== 'string' || card.length < 2) continue;
        const suit = card.slice(-1);
        if (redSuits.includes(suit)) red.push(card);
        else blacks.push(card);
    }
    return [red, blacks];
}

function highlightDiffs(base, other) {
    const maxLen = Math.max(base.length, other.length);
    let out = '';
    for (let i = 0; i < maxLen; i++) {
        const b = base[i] || '';
        const o = other[i] || '';

        out += b === o ? o : high(o === '' ? '✖' : o);
    }
    return out;
}

// wraps "str" in ansi escape codes for bright green text
function high(str) {
    const brightGreen = '\x1b[92m';
    const reset = '\x1b[0m';
    return brightGreen + str + reset;
}

function charToCode(char) {
    return char.charCodeAt(0) - 'A'.charCodeAt(0)
}

function codeToChar(code) {
    return String.fromCharCode(code + 'A'.charCodeAt(0))
}

function add(a, b) {
    return codeToChar((charToCode(a) + charToCode(b)) % 26);
}

function sub(a, b) {
    return codeToChar((26 + charToCode(a) - charToCode(b)) % 26);
}

function isValid(letter) {
    return letter >= 'A' && letter <= 'Z';
}

// Permute deck for chaocipher
function permute(deck, index, n) {
    deck = [...deck.slice(index), ...deck.slice(0, index)];
    const cut = deck.splice(n, 1)[0];
    deck.splice(13, 0, cut);
    return deck;
}

const algorithms = [
    {
        name: 'plain-xor',
        encrypt: (deck, message) => {
            return message.split('').map((c, i) => {
                return isValid(c) ? add(c, cardToLetter(deck[i % deck.length])) : c;
            }).join('');
        },
        decrypt: (deck, ciphertext) => {
            return ciphertext.split('').map((c, i) => {
                return isValid(c) ? sub(c, cardToLetter(deck[i % deck.length])) : c;
            }).join('');
        }
    },
    {
        name: 'xor-with-acc',
        encrypt: (deck, message) => {
            let acc = 0
            return message.split('').map((c, i) => {
                if (!isValid(c)) return c;

                let ptCode = charToCode(c);
                let keyCode = charToCode(cardToLetter(deck[i % deck.length]));

                const letter = codeToChar((ptCode + keyCode + acc) % 26);
                acc += charToCode(letter);
                acc %= 26;

                return letter;
            }).join('');
        },
        decrypt: (deck, ciphertext) => {
            let acc = 0;
            return ciphertext.split('').map((c, i) => {
                if (!isValid(c)) return c;

                ctCode = charToCode(c);
                let keyCode = charToCode(cardToLetter(deck[i % deck.length]));
                const letter = codeToChar((260 + ctCode - keyCode - acc) % 26);

                acc += ctCode;
                acc %= 26;

                return letter;
            }).join('');
        }
    },
    {
        name: 'Chaocipher',
        encrypt: (deck, message) => {
            let [redDeck, blackDeck] = separateRedAndBacks(deck);

            return message.split('').map((c) => {
                if (!isValid(c)) return c;

                const ptCard = letterToCards(c)[1]; // use black cards for plaintext
                const index = blackDeck.indexOf(ptCard);
                const ctCard = redDeck[index];
                const ctLetter = cardToLetter(ctCard);

                [redDeck, blackDeck] = [permute(redDeck, index, 2), permute(blackDeck, index + 1, 1)];

                return ctLetter;
            }).join('');
        },
        decrypt: (deck, ciphertext) => {
            let [redDeck, blackDeck] = separateRedAndBacks(deck);

            return ciphertext.split('').map((c) => {
                if (!isValid(c)) return c;

                const ctCard = letterToCards(c)[0]; // use red cards for ciphertext
                const index = redDeck.indexOf(ctCard);
                const ptCard = blackDeck[index];
                const ptLetter = cardToLetter(ptCard);

                [redDeck, blackDeck] = [permute(redDeck, index, 2), permute(blackDeck, index + 1, 1)];
                return ptLetter;
            }).join('');
        }
    },
    {
        name: "Card Chameleon",
        encrypt: (deck, message) => {
            const messageChars = message.split('');

            let [redDeck, blackDeck] = separateRedAndBacks(deck);

            encryptedChars = messageChars.map(char => {
                if (!isValid(char)) return char;

                let index1 = blackDeck.findIndex(c => c === letterToCards(char)[1]);

                let index2 = blackDeck.findIndex(c => c === letterToCards(cardToLetter(redDeck[index1]))[1]);
                const encoded = cardToLetter(redDeck[index2]);

                [redDeck[index2], redDeck[0]] = [redDeck[0], redDeck[index2]];

                redDeck.push(redDeck.shift());
                blackDeck.push(blackDeck.shift());

                return encoded
            });

            return encryptedChars.join('');
        },
        decrypt: (deck, message) => {
            const messageChars = message.split('');
            let [redDeck, blackDeck] = separateRedAndBacks(deck);

            decryptedChars = messageChars.map(char => {
                if (!isValid(char)) return char;

                let index1 = redDeck.findIndex(c => c === letterToCards(char)[0]);

                let index2 = redDeck.findIndex(c => c === letterToCards(cardToLetter(blackDeck[index1]))[0]);
                const decoded = cardToLetter(blackDeck[index2]);

                [redDeck[index1], redDeck[0]] = [redDeck[0], redDeck[index1]];
                redDeck.push(redDeck.shift());
                blackDeck.push(blackDeck.shift());

                return decoded
            });

            return decryptedChars.join('');
        }
    }
];

function main() {
    const deck = buildDeck();
    shuffle(deck);

    const messages = [
        ['X ATTACK AT DAWN',
            'Y ATTACK AT DAWN',
            'Z ATTACK AT NOON'
        ],
        [
            'Monday weather report: Sunny with a chance of rainbows.',
            'Tuesday weather report: Cloudy with a chance of meatballs.'
        ],
        ['AAAAAAAAAAAA',
            'BBBBBBBBBBBB',
            'CCCCCCCCCCCC'
        ]
    ];

    for (const { name, encrypt, decrypt } of algorithms) {
        console.group(`Algorithm: ${name}`);


        for (const block of messages) {
            let first = null;
            for (let msg of block) {
                msg = msg.toUpperCase();
                const ct = encrypt(deck, msg);
                const pt = decrypt(deck, ct);

                console.log(`${msg} -> ${first ? highlightDiffs(first, ct) : ct}${pt === msg ? '' : ' (' + highlightDiffs(msg, pt) + ')'}`);

                if (first === null) {
                    first = ct;
                }
            }
        }
        console.groupEnd();
    }
}

main();