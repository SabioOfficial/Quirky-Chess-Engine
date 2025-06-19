const INITIAL_BOARD = [
    ['wR', 'wN', 'wB', 'wK', 'wQ', 'wB', 'wN', 'wR'],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    ['bR', 'bN', 'bB', 'bK', 'bQ', 'bB', 'bN', 'bR'],
];

const placeAudio = document.getElementById('placeSFX');

let board = INITIAL_BOARD.map(row => [...row]);

let currentTurn = 'w';
let gameOver = false;
let selected = null;

let castlingRights = {
    wK: true,
    wQ: true,
    bK: true,
    bQ: true,
};

let lastMove = null;

let enableCastling = true;
let enableEnPassant = true;
let enablePawnPromotion = true;
let enableIlVaticano = false;

let pendingPromotion = null;

function renderBoard() {
    const ui = document.getElementById('chess-board');
    ui.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'chess-row';
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = 'chess-col ' + ((r + c) % 2 === 0 ? 'light-square' : 'dark-square');
            const piece = board[r][c];

            if (sq.classList.contains('dark-square') && piece[0] === 'b') {
                sq.classList.add('lighter-dark-square');
            }

            if (selected && selected.row === r && selected.col === c) {
                sq.classList.add('selected');
            }
            if (selected) {
                const srcPiece = board[selected.row][selected.col];
                if (srcPiece !== '.' && typeof srcPiece === 'string' && srcPiece.length >= 2) {
                    if (isMoveValid(srcPiece, selected, { row: r, col: c }, board) &&
                        simulateMoveAndTest(srcPiece, selected, { row: r, col: c }, currentTurn)) {
                        sq.classList.add('available');
                    }
                }
            }
            if (piece !== '.') {
                const img = document.createElement('img');
                img.src = `./app/pieces/standard/${piece}.png`;
                img.alt = piece;
                img.className = 'chess-piece';
                sq.appendChild(img);
            }
            sq.addEventListener('click', () => handleClick(r, c));
            rowDiv.appendChild(sq);
        }
        ui.appendChild(rowDiv);
        if (currentTurn === 'w') {
            document.getElementById('chess-board').classList.add('white-turn');
            document.getElementById('chess-board').classList.remove('black-turn')
        } else {
            document.getElementById('chess-board').classList.add('black-turn');
            document.getElementById('chess-board').classList.remove('white-turn');
        }
    }

    const promotionOverlay = document.getElementById('promotion-overlay');
    if (promotionOverlay) {
        if (pendingPromotion) {
            promotionOverlay.style.display = 'flex';
            setupPromotionChoices(pendingPromotion.color);
        } else {
            promotionOverlay.style.display = 'none';
        }
    }
}

function handleClick(row, col) {
    if (gameOver) {
        console.log('Game is over.');
        return;
    }

    if (pendingPromotion) {
        console.log('Promotion pending. Please choose a promoting piece.');
        return;
    }

    const clickedPiece = board[row][col];

    console.log('handleClick()', { row, col, clickedPiece, selected, currentTurn });

    if (selected === null) {
        if (clickedPiece === '.' || clickedPiece[0] !== currentTurn) {
            console.log('Cannot select: empty or not your turn.');
            return;
        }

        selected = { row, col };
        renderBoard();
        return;
    }

    const from = selected;
    const piece = board[from.row][from.col];
    const to = { row, col };

    if (enableIlVaticano && piece[1] === 'B' && clickedPiece[1] === 'B' && piece[0] === currentTurn && clickedPiece[0] === currentTurn && (from.row !== to.row || from.col !== to.col)) {
        const ilVaticanoData = isIlVaticanoValid(from, to, board, currentTurn);
        if (ilVaticanoData) {
            ilVaticanoData.capturedPawns.forEach(pawnPos => {
                board[pawnPos.row][pawnPos.col] = '.';
            });

            board[to.row][to.col] = piece;
            board[from.row][from.col] = clickedPiece;

            selected = null;
            const playerWhoJustMoved = currentTurn;
            currentTurn = currentTurn === 'w' ? 'b' : 'w';
            lastMove = null;

            if (isKingInCheck(currentTurn)) {
                console.log(`${currentTurn} king is in check.`);
                if (!hasLegalMoves(currentTurn)) {
                    const winningColor = playerWhoJustMoved === 'w' ? 'White' : 'Black';
                    alert(`Checkmate! ${winningColor} wins!`);
                    gameOver = true;
                } else {
                    alert(`${currentTurn === 'w' ? 'White' : 'Black'} is in check!`);
                }
            } else if (!hasLegalMoves(currentTurn)) {
                alert(`Stalemate! It's a draw!`);
                gameOver = true;
            }

            renderBoard();
            return;
        } else {
            console.log("Il Vaticano conditions not met for these bishops. (isIlVaticanoValid returned false)");
            selected = null;
            renderBoard();
            return;
        }
    }

    if (piece === '.' || typeof piece !== 'string' || piece.length < 2) {
        console.error("Selected square is empty or invalid. Resetting selection.", {from, piece});
        selected = null;
        renderBoard();
        return;
    }

    console.log(`Trying to move ${piece} from`, from, 'to', to);

    if (isMoveValid(piece, from, to, board)) {
        if (simulateMoveAndTest(piece, from, to, currentTurn)) {
            let captured = board[to.row][to.col];

            let isCastlingAttempt = false;
            let isEnPassantCapture = false;
            let isPawnPromotionAttempt = false;

            if (enableCastling && piece[1] === 'K' && Math.abs(from.col - to.col) === 2) {
                isCastlingAttempt = true;
            }

            else if (enableEnPassant && piece[1] === 'P' && Math.abs(from.col - to.col) === 1 && board[to.row][to.col] === '.') {
                const dir = piece[0] === 'w' ? 1 : -1;
                const potentialCapturedPawnPos = { row: from.row, col: to.col };
                if (lastMove &&
                    lastMove.piece[1] === 'P' &&
                    lastMove.piece[0] !== piece[0] &&
                    Math.abs(lastMove.from.row - lastMove.to.row) === 2 &&
                    lastMove.to.row === potentialCapturedPawnPos.row &&
                    lastMove.to.col === potentialCapturedPawnPos.col) {
                    isEnPassantCapture = true;
                    captured = board[to.row - dir][to.col];
                }
            }

            if (isCastlingAttempt) {
                const kingRow = from.row;
                let rookFromCol, rookToCol;
                if (to.col === 6) {
                    rookFromCol = 7;
                    rookToCol = 5;
                } else {
                    rookFromCol = 0;
                    rookToCol = 3;
                }
                board[to.row][to.col] = piece;
                board[from.row][from.col] = '.';
                board[kingRow][rookToCol] = board[kingRow][rookFromCol];
                board[kingRow][rookFromCol] = '.';
                console.log(`Castling performed. King from ${from.row},${from.col} to ${to.row},${to.col}.`);
            } else {
                board[to.row][to.col] = piece;
                board[from.row][from.col] = '.';

                if (isEnPassantCapture) {
                    const dir = piece[0] === 'w' ? 1 : -1;
                    board[to.row - dir][to.col] = '.';
                    console.log(`En Passant capture performed at ${to.row - dir},${to.col}.`);
                }
            }

            if (piece === 'wK') { castlingRights.wK = false; castlingRights.wQ = false; }
            else if (piece === 'bK') { castlingRights.bK = false; castlingRights.bQ = false; }
            if (piece === 'wR') { if (from.row === 0 && from.col === 0) castlingRights.wQ = false; if (from.row === 0 && from.col === 7) castlingRights.wK = false; }
            else if (piece === 'bR') { if (from.row === 7 && from.col === 0) castlingRights.bQ = false; if (from.row === 7 && from.col === 7) castlingRights.bK = false; }
            if (captured === 'wR') { if (to.row === 0 && to.col === 0) castlingRights.wQ = false; if (to.row === 0 && to.col === 7) castlingRights.wK = false; }
            else if (captured === 'bR') { if (to.row === 7 && to.col === 0) castlingRights.bQ = false; if (to.row === 7 && to.col === 7) castlingRights.bK = false; }

            if (enablePawnPromotion && piece[1] === 'P' && ((piece[0] === 'w' && to.row === 7) || (piece[0] === 'b' && to.row === 0))) {
                isPawnPromotionAttempt = true;
                pendingPromotion = {
                    row: to.row,
                    col: to.col,
                    color: piece[0],
                };
                selected = null;
                renderBoard();
                return;
            }

            if (piece[1] === 'P' && Math.abs(from.row - to.row) === 2) {
                lastMove = { piece: piece, from: from, to: to };
            } else {
                lastMove = null;
            }

            const playerWhoJustMoved = currentTurn;
            currentTurn = currentTurn === 'w' ? 'b' : 'w';

            if (isKingInCheck(currentTurn)) {
                console.log(`${currentTurn} king is in check.`);
                if (!hasLegalMoves(currentTurn)) {
                    const winningColor = playerWhoJustMoved === 'w' ? 'White' : 'Black';
                    alert(`Checkmate! ${winningColor} wins!`);
                    gameOver = true;
                } else {
                    alert(`${currentTurn === 'w' ? 'White' : 'Black'} is in check!`);
                }
            } else if (!hasLegalMoves(currentTurn)) {
                alert(`Stalemate! It's a draw!`);
                gameOver = true;
            }

            placeAudio.play();
        } else {
            console.log('Move invalid: This move would leave your king in check.');
        }
    } else {
        console.log('Move invalid: Does not follow piece movement rules.');
    }

    selected = null;
    renderBoard();
}

function isMoveValid(piece, from, to, b) {
    if (piece === '.' || typeof piece !== 'string' || piece.length < 2) {
        console.error("isMoveValid received an invalid 'piece' argument:", piece, "from:", from, "to:", to);
        return false;
    }

    if (from.row === to.row && from.col === to.col) return false;

    if (b[to.row][to.col] !== '.' && b[to.row][to.col][0] === piece[0]) {
        return false;
    }

    const pieceType = piece[1].toLowerCase();
    let result = false;

    switch (pieceType) {
        case 'p':
            result = isPawnValid(piece, from, to, b);
            break;
        case 'r':
            result = isRookValid(from, to, b);
            break;
        case 'n':
            result = isKnightValid(from, to);
            break;
        case 'b':
            result = isBishopValid(from, to, b);
            break;
        case 'q':
            result = isQueenValid(from, to, b);
            break;
        case 'k':
            result = isKingValid(from, to, b);
            break;
    }
    return result;
}

function isPawnValid(piece, from, to, b) {
    const dir = piece[0] === 'w' ? 1 : -1;
    const startRow = piece[0] === 'w' ? 1 : 6;
    const dRow = to.row - from.row;
    const dCol = to.col - from.col;
    const pieceColor = piece[0];

    if (dCol === 0 && dRow === dir && b[to.row][to.col] === '.') {
        return true;
    }

    if (dCol === 0 &&
        dRow === 2 * dir &&
        from.row === startRow &&
        b[from.row + dir][from.col] === '.' &&
        b[to.row][to.col] === '.') {
        return true;
    }

    if (Math.abs(dCol) === 1 &&
        dRow === dir &&
        b[to.row][to.col] !== '.' &&
        b[to.row][to.col][0] !== pieceColor) {
        return true;
    }

    if (enableEnPassant && Math.abs(dCol) === 1 && dRow === dir && b[to.row][to.col] === '.') {
        const opponentPawnSquare = { row: from.row, col: to.col };

        if (lastMove &&
            lastMove.piece[1] === 'P' &&
            lastMove.piece[0] !== pieceColor &&
            Math.abs(lastMove.from.row - lastMove.to.row) === 2 &&
            lastMove.to.row === opponentPawnSquare.row &&
            lastMove.to.col === opponentPawnSquare.col) {
            return true;
        }
    }

    return false;
}

function isRookValid(f, t, b) {
    if (f.row !== t.row && f.col !== t.col) return false;

    const dr = f.row === t.row ? 0 : (f.row < t.row ? 1 : -1);
    const dc = f.col === t.col ? 0 : (f.col < t.col ? 1 : -1);

    let r = f.row + dr;
    let c = f.col + dc;

    while (r !== t.row || c !== t.col) {
        if (b[r][c] !== '.') return false;
        r += dr;
        c += dc;
    }
    return true;
}

function isBishopValid(f, t, b) {
    if (Math.abs(f.row - t.row) !== Math.abs(f.col - t.col)) return false;

    const dr = f.row < t.row ? 1 : -1;
    const dc = f.col < t.col ? 1 : -1;

    let r = f.row + dr;
    let c = f.col + dc;

    while (r !== t.row) {
        if (b[r][c] !== '.') return false;
        r += dr;
        c += dc;
    }
    return true;
}

function isQueenValid(f, t, b) {
    return isRookValid(f, t, b) || isBishopValid(f, t, b);
}

function isKingValid(f, t, b) {
    const dr = Math.abs(f.row - t.row);
    const dc = Math.abs(f.col - t.col);
    const pieceColor = b[f.row][f.col][0];

    if (dr <= 1 && dc <= 1) {
        return true;
    }

    if (enableCastling && dr === 0 && dc === 2) {
        return isCastlingValid(f, t, b, pieceColor);
    }

    return false;
}

function isKnightValid(f, t) {
    const dr = Math.abs(f.row - t.row);
    const dc = Math.abs(f.col - t.col);
    return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
}


function isCastlingValid(f, t, b, color) {
    if (!enableCastling) return false;

    const kingRow = (color === 'w') ? 0 : 7;
    const kingStartCol = 4;

    if (f.row !== kingRow || f.col !== kingStartCol) return false;

    const isKingside = (t.col === 6);
    const isQueenside = (t.col === 2);

    if (!isKingside && !isQueenside) return false;

    if (color === 'w') {
        if (isKingside && !castlingRights.wK) return false;
        if (isQueenside && !castlingRights.wQ) return false;
    } else {
        if (isKingside && !castlingRights.bK) return false;
        if (isQueenside && !castlingRights.bQ) return false;
    }

    let rookCol;
    let pathSquaresForKingAttackCheck = [];
    let pathEmptyCheckSquares = [];

    if (isKingside) {
        rookCol = 7;
        pathEmptyCheckSquares = [{ row: kingRow, col: 5 }, { row: kingRow, col: 6 }];
        pathSquaresForKingAttackCheck = [{ row: kingRow, col: 4 }, { row: kingRow, col: 5 }, { row: kingRow, col: 6 }];
    } else {
        rookCol = 0;
        pathEmptyCheckSquares = [{ row: kingRow, col: 1 }, { row: kingRow, col: 2 }, { row: kingRow, col: 3 }];
        pathSquaresForKingAttackCheck = [{ row: kingRow, col: 4 }, { row: kingRow, col: 3 }, { row: kingRow, col: 2 }];
    }

    for (const sq of pathEmptyCheckSquares) {
        if (b[sq.row][sq.col] !== '.') {
            return false;
        }
    }

    const expectedRook = color + 'R';
    if (b[kingRow][rookCol] !== expectedRook) return false;

    for (const square of pathSquaresForKingAttackCheck) {
        if (isSquareAttacked(square, color, b, castlingRights, lastMove)) {
            return false;
        }
    }

    return true;
}

function isKingInCheck(color) {
    const kingPos = findKingPosition(color, board);
    if (!kingPos) {
        console.warn(`King not found for color ${color}. This indicates an invalid board state.`);
        return false;
    }
    
    return isSquareAttacked(kingPos, color, board, castlingRights, lastMove);
}

function hasLegalMoves(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece !== '.' && piece[0] === color) {
                const from = { row, col };
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        const to = { row: r, col: c };
                        if (isMoveValid(piece, from, to, board)) {
                            if (simulateMoveAndTest(piece, from, to, color)) {
                                console.log(`Found legal escape for ${color}: ${piece} ${from.row},${from.col} -> ${to.row},${to.col}`);
                                return true;
                            }
                        }

                        if (enableIlVaticano && piece[1] === 'B' && board[r][c][1] === 'B' && board[r][c][0] === color) {
                            if (isIlVaticanoValid(from, {row:r, col:c}, board, color)) {
                                if (simulateMoveAndTest(piece, from, {row:r, col:c}, color)) {
                                    console.log(`Found legal Il Vaticano escape for ${color}: ${piece} ${from.row},${from.col} with ${board[r][c]} ${r},${c}`);
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return false;
}

function simulateMoveAndTest(piece, from, to, color) {
    const tempBoard = board.map(row => [...row]);
    const tempCastlingRights = { ...castlingRights };
    const tempLastMove = lastMove ? { ...lastMove } : null;

    const originalToPiece = tempBoard[to.row][to.col];

    let capturedPieceInSimulation = originalToPiece;

    const isKing = piece[1] === 'K';
    const isPawn = piece[1] === 'P';
    const isBishop = piece[1] === 'B';

    let performedSpecialMove = false;

    if (enableIlVaticano && isBishop && originalToPiece && originalToPiece[1] === 'B' && originalToPiece[0] === color && (from.row !== to.row || from.col !== to.col)) {
        const simulatedIlVaticanoData = isIlVaticanoValid(from, to, tempBoard, color);
        if (simulatedIlVaticanoData) {
            performedSpecialMove = true;

            simulatedIlVaticanoData.capturedPawns.forEach(pawnPos => {
                tempBoard[pawnPos.row][pawnPos.col] = '.';
            });

            const firstBishopPieceSim = piece;
            const secondBishopPieceSim = originalToPiece;

            tempBoard[from.row][from.col] = '.';
            tempBoard[to.row][to.col] = '.';

            tempBoard[to.row][to.col] = firstBishopPieceSim;
            tempBoard[from.row][from.col] = secondBishopPieceSim;

            capturedPieceInSimulation = null;
        }
    }

    if (!performedSpecialMove) {
        const isSimulatedCastling = enableCastling && isKing && Math.abs(from.col - to.col) === 2 &&
                                    isCastlingValid(from, to, tempBoard, color);

        let isSimulatedEnPassant = false;
        if (enableEnPassant && isPawn && Math.abs(from.col - to.col) === 1 && originalToPiece === '.') {
            const dir = piece[0] === 'w' ? 1 : -1;
            const potentialCapturedPawnPos = { row: from.row, col: to.col };
            if (tempLastMove &&
                tempLastMove.piece[1] === 'P' &&
                tempLastMove.piece[0] !== piece[0] &&
                Math.abs(tempLastMove.from.row - tempLastMove.to.row) === 2 &&
                tempLastMove.to.row === potentialCapturedPawnPos.row &&
                tempLastMove.to.col === potentialCapturedPawnPos.col) {
                isSimulatedEnPassant = true;
                capturedPieceInSimulation = tempBoard[to.row - dir][to.col];
            }
        }

        if (isSimulatedCastling) {
            const kingRow = from.row;
            let rookFromCol, rookToCol;
            if (to.col === 6) { rookFromCol = 7; rookToCol = 5; }
            else { rookFromCol = 0; rookToCol = 3; }

            tempBoard[to.row][to.col] = piece;
            tempBoard[from.row][from.col] = '.';
            tempBoard[kingRow][rookToCol] = tempBoard[kingRow][rookFromCol];
            tempBoard[kingRow][rookFromCol] = '.';
        } else {
            tempBoard[to.row][to.col] = piece;
            tempBoard[from.row][from.col] = '.';
            if (isSimulatedEnPassant) {
                const dir = piece[0] === 'w' ? 1 : -1;
                tempBoard[to.row - dir][to.col] = '.';
            }
        }

        if (enablePawnPromotion && isPawn && ((color === 'w' && to.row === 7) || (color === 'b' && to.row === 0))) {
            tempBoard[to.row][to.col] = color + 'Q';
        }
    }

    if (isKing && !performedSpecialMove) {
        if (piece[0] === 'w') {
            tempCastlingRights.wK = false;
            tempCastlingRights.wQ = false;
        } else {
            tempCastlingRights.bK = false;
            tempCastlingRights.bQ = false;
        }
    }
    if (piece === 'wR') { if (from.row === 0 && from.col === 0) tempCastlingRights.wQ = false; if (from.row === 0 && from.col === 7) tempCastlingRights.wK = false; }
    else if (piece === 'bR') { if (from.row === 7 && from.col === 0) tempCastlingRights.bQ = false; if (from.row === 7 && from.col === 7) tempCastlingRights.bK = false; }
    if (originalToPiece === 'wR') { if (to.row === 0 && to.col === 0) tempCastlingRights.wQ = false; if (to.row === 0 && to.col === 7) tempCastlingRights.wK = false; }
    else if (originalToPiece === 'bR') { if (to.row === 7 && to.col === 0) tempCastlingRights.bQ = false; if (to.row === 7 && to.col === 7) tempCastlingRights.bK = false; }

    let simulatedLastMove = null;
    if (!performedSpecialMove && enableEnPassant && isPawn && Math.abs(from.row - to.row) === 2) {
        simulatedLastMove = { piece: tempBoard[to.row][to.col], from: from, to: to };
    }

    let kingPos;
    if (performedSpecialMove) {
        kingPos = findKingPosition(color, tempBoard);
    } else if (isKing) {
        kingPos = { row: to.row, col: to.col };
    } else {
        kingPos = findKingPosition(color, tempBoard);
    }

    if (!kingPos) {
        console.warn(`King not found for ${color} during simulation. This might indicate an error in board state or king tracking.`);
        return false;
    }

    const stillInCheck = isSquareAttacked(kingPos, color, tempBoard, tempCastlingRights, simulatedLastMove);

    return !stillInCheck;
}

function isIlVaticanoValid(bishop1Pos, bishop2Pos, boardState, color) {
    if (!enableIlVaticano) return false;

    const opponent = color === 'w' ? 'b' : 'w';
    const b1 = boardState[bishop1Pos.row][bishop1Pos.col];
    const b2 = boardState[bishop2Pos.row][bishop2Pos.col];

    if (!b1 || b1[0] !== color || b1[1] !== 'B' || !b2 || b2[0] !== color || b2[1] !== 'B') {
        return false;
    }

    const onSameRank = bishop1Pos.row === bishop2Pos.row;
    const onSameFile = bishop1Pos.col === bishop2Pos.col;

    if (!onSameRank && !onSameFile) {
        return false;
    }

    let interveningSquares = [];
    let isValidSpacing = false;

    if (onSameRank) {
        const minCol = Math.min(bishop1Pos.col, bishop2Pos.col);
        const maxCol = Math.max(bishop1Pos.col, bishop2Pos.col);
        if (maxCol - minCol - 1 === 2) {
            isValidSpacing = true;
            for (let c = minCol + 1; c < maxCol; c++) {
                interveningSquares.push({ row: bishop1Pos.row, col: c });
            }
        }
    } else if (onSameFile) {
        const minRow = Math.min(bishop1Pos.row, bishop2Pos.row);
        const maxRow = Math.max(bishop1Pos.row, bishop2Pos.row);
        if (maxRow - minRow - 1 === 2) {
            isValidSpacing = true;
            for (let r = minRow + 1; r < maxRow; r++) {
                interveningSquares.push({ row: r, col: bishop1Pos.col });
            }
        }
    }

    if (!isValidSpacing || interveningSquares.length !== 2) {
        return false;
    }

    let enemyPawnsInBetween = [];
    for (const sq of interveningSquares) {
        const pieceOnSquare = boardState[sq.row][sq.col];
        if (pieceOnSquare && pieceOnSquare[0] === opponent && pieceOnSquare[1] === 'P') {
            enemyPawnsInBetween.push(sq);
        } else {
            return false;
        }
    }

    if (enemyPawnsInBetween.length !== 2) {
        return false;
    }

    return {
        type: 'ilVaticano',
        bishop1Pos: bishop1Pos,
        bishop2Pos: bishop2Pos,
        capturedPawns: enemyPawnsInBetween
    };
}


function findKingPosition(color, boardState) {
    const kingChar = color === 'w' ? 'wK' : 'bK';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (boardState[row][col] === kingChar) {
                return {row, col};
            }
        }
    }
    return null;
}

function isSquareAttacked(target, color, boardState, castlingState, lastMoveState) {
    const opponent = color === 'w' ? 'b' : 'w';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece !== '.' && piece[0] === opponent) {
                const originalCastlingRights = castlingRights;
                const originalLastMove = lastMove;
                castlingRights = castlingState;
                lastMove = lastMoveState;

                let isAttacking = false;

                if (isMoveValid(piece, {row, col}, target, boardState)) {
                    isAttacking = true;
                }

                castlingRights = originalCastlingRights;
                lastMove = originalLastMove;

                if (isAttacking) {
                    return true;
                }
            }
        }
    }
    return false;
}

function setupPromotionChoices(color) {
    const promotionChoicesDiv = document.querySelector('.promotion-choices');
    if (!promotionChoicesDiv) {
        console.error("Promotion choices div not found!");
        return;
    }
    promotionChoicesDiv.innerHTML = '';

    const promotionPieces = ['Q', 'R', 'B', 'N'];

    promotionPieces.forEach(pieceType => {
        const img = document.createElement('img');
        const pieceId = color + pieceType;
        img.src = `/app/pieces/standard/${pieceId}.png`;
        img.alt = pieceType;
        img.dataset.pieceType = pieceType;
        img.addEventListener('click', () => completePawnPromotion(pieceType));
        promotionChoicesDiv.appendChild(img);
    })
}

function completePawnPromotion(choice) {
    if (!pendingPromotion) return;

    const {row, col, color} = pendingPromotion;
    const newPiece = color + choice;

    board[row][col] = newPiece;

    pendingPromotion = null;
    document.getElementById('promotion-overlay').style.display = 'none';

    const playerWhoJustMoved = currentTurn;
    currentTurn = currentTurn === 'w' ? 'b' : 'w';

    if (isKingInCheck(currentTurn)) {
        console.log(`${currentTurn} king is in check.`);
        if (!hasLegalMoves(currentTurn)) {
            const winningColor = playerWhoJustMoved === 'w' ? 'White' : 'Black';
            alert(`Checkmate! ${winningColor} wins!`);
            gameOver = true;
        } else {
            alert(`${currentTurn === 'w' ? 'White' : 'Black'} is in check!`);
        }
    } else if (!hasLegalMoves(currentTurn)) {
        alert(`Stalemate! It's a draw!`);
        gameOver = true;
    }

    renderBoard();
}


function resetBoard() {
    board = INITIAL_BOARD.map(row => [...row]);

    currentTurn = 'w';
    gameOver = false;
    selected = null;
    castlingRights = {
        wK: true,
        wQ: true,
        bK: true,
        bQ: true,
    };
    lastMove = null;
    pendingPromotion = null;

    const promotionOverlay = document.getElementById('promotion-overlay');
    if (promotionOverlay) {
        promotionOverlay.style.display = 'none';
    }

    document.getElementById('castling-toggle').textContent = enableCastling ? '♖ Disable Castling' : '♖ Enable Castling';
    document.getElementById('en-passant-toggle').textContent = enableEnPassant ? '♙ Disable En Passant' : '♙ Enable En Passant';
    document.getElementById('promotion-toggle').textContent = enablePawnPromotion ? '♜ Disable Pawn Promotion' : '♜ Enable Pawn Promotion';
    document.getElementById('il-vaticano-toggle').textContent = enableIlVaticano ? '⚡ Disable Il Vaticano' : '⚡ Enable Il Vaticano';


    renderBoard();
    console.log("Board FLIPPED! Game reset.");
}


document.addEventListener('DOMContentLoaded', renderBoard);

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('castling-toggle').addEventListener('click', function(e) { 
        enableCastling = !enableCastling;
        e.target.textContent = enableCastling ? '♖ Disable Castling' : '♖ Enable Castling';
        console.log('Castling toggled: ' + enableCastling);
        renderBoard();
    });

    document.getElementById('en-passant-toggle').addEventListener('click', function(e) {
        enableEnPassant = !enableEnPassant;
        e.target.textContent = enableEnPassant ? '♙ Disable En Passant' : '♙ Enable En Passant';
        console.log('En Passant toggled: ' + enableEnPassant);
        renderBoard();
    });

    document.getElementById('pawn-promotion-toggle').addEventListener('click', function(e) {
        enablePawnPromotion = !enablePawnPromotion;
        e.target.textContent = enablePawnPromotion ? '♜ Disable Pawn Promotion' : '♜ Enable Pawn Promotion';
        console.log('Pawn Promotion toggled: ' + enablePawnPromotion);
        if (!enablePawnPromotion && pendingPromotion) {
            pendingPromotion = null;
            document.getElementById('promotion-overlay').style.display = 'none';
        }
        renderBoard();
    });

    document.getElementById('il-vaticano-toggle').addEventListener('click', function(e) {
        enableIlVaticano = !enableIlVaticano;
        e.target.textContent = enableIlVaticano ? '♙ Disable Il Vaticano' : '♙ Enable Il Vaticano';
        console.log('Il Vaticano toggled: ' + enableIlVaticano);
        if (!enableIlVaticano && selected && board[selected.row][selected.col][1] === 'B') {
            selected = null;
        }
        renderBoard();
    });
});