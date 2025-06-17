const board = [
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR']
];

let currentTurn = 'w'; // Assuming white starts
let gameOver = false;
let selected = null;

let castlingRights = {
    wK: true, // Kingside for White
    wQ: true, // Queenside for White
    bK: true, // Kingside for Black
    bQ: true, // Queenside for Black
};

let lastMove = null; // Stores info about the last move for En Passant (e.g., {piece: 'wP', from: {r,c}, to: {r,c}})

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

            // Added styling for black squares to make them slightly lighter for better contrast with black pieces
            if (sq.classList.contains('dark-square')) {
                sq.classList.add('lighter-dark-square');
            }

            if (selected && selected.row === r && selected.col === c) {
                sq.classList.add('selected');
            }
            if (selected) {
                const srcPiece = board[selected.row][selected.col];
                // Only try to calculate available moves if srcPiece is actually a piece
                if (srcPiece !== '.' && typeof srcPiece === 'string' && srcPiece.length >= 2) {
                    // When displaying available moves, also consider if the move is legal (doesn't leave king in check)
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
    }
}

function handleClick(row, col) {
    if (gameOver) {
        console.log('Game is over.');
        return;
    }

    const clickedPiece = board[row][col];

    console.log('handleClick()', { row, col, clickedPiece, selected, currentTurn });

    // --- Phase 1: Select a piece ---
    if (selected === null) {
        // Can only select a non-empty square with your own piece
        if (clickedPiece === '.' || clickedPiece[0] !== currentTurn) {
            console.log('Cannot select: empty or not your turn.');
            return;
        }

        selected = { row, col };
        renderBoard();
        return; // Wait for the second click
    }

    // --- Phase 2: Attempt a move ---
    const from = selected;
    const piece = board[from.row][from.col]; // The piece that was selected

    // Defensive check: If the selected square is now empty (e.g., due to a bug), reset.
    if (piece === '.' || typeof piece !== 'string' || piece.length < 2) {
        console.error("Selected square is empty or invalid. Resetting selection.", {from, piece});
        selected = null;
        renderBoard();
        return;
    }

    const to = { row, col };

    console.log(`Trying to move ${piece} from`, from, 'to', to);

    // Validate the move based on piece rules
    if (isMoveValid(piece, from, to, board)) {
        // Now, check if the move is legal (doesn't leave YOUR king in check)
        if (simulateMoveAndTest(piece, from, to, currentTurn)) {

            // --- Move is VALID and LEGAL ---
            let captured = board[to.row][to.col]; // Default captured piece (can be '.' or opponent's piece)

            // Special move flags
            let isCastlingAttempt = false;
            let isEnPassantCapture = false;

            // Determine if Castling
            if (piece[1] === 'K' && Math.abs(from.col - to.col) === 2) {
                isCastlingAttempt = true;
            }
            // Determine if En Passant
            else if (piece[1] === 'P' && Math.abs(from.col - to.col) === 1 && board[to.row][to.col] === '.') {
                const dir = piece[0] === 'w' ? 1 : -1;
                const potentialCapturedPawnPos = { row: from.row, col: to.col }; // The square the captured pawn is on
                if (lastMove &&
                    lastMove.piece[1] === 'P' &&
                    lastMove.piece[0] !== piece[0] &&
                    Math.abs(lastMove.from.row - lastMove.to.row) === 2 && // Opponent pawn moved 2 squares
                    lastMove.to.row === potentialCapturedPawnPos.row && // Opponent pawn is on same rank as our pawn
                    lastMove.to.col === potentialCapturedPawnPos.col) { // Opponent pawn is on the column being attacked
                    isEnPassantCapture = true;
                    captured = board[to.row - dir][to.col]; // This is the pawn actually captured
                }
            }

            // --- Perform Board Updates ---
            if (isCastlingAttempt) {
                const kingRow = from.row;
                let rookFromCol, rookToCol;
                if (to.col === 6) { // Kingside
                    rookFromCol = 7;
                    rookToCol = 5;
                } else { // Queenside
                    rookFromCol = 0;
                    rookToCol = 3;
                }
                board[to.row][to.col] = piece; // Move King
                board[from.row][from.col] = '.';
                board[kingRow][rookToCol] = board[kingRow][rookFromCol]; // Move Rook
                board[kingRow][rookFromCol] = '.';
                console.log(`Castling performed. King from ${from.row},${from.col} to ${to.row},${to.col}.`);
            } else {
                board[to.row][to.col] = piece; // Move piece
                board[from.row][from.col] = '.';

                if (isEnPassantCapture) {
                    const dir = piece[0] === 'w' ? 1 : -1;
                    board[to.row - dir][to.col] = '.'; // Remove captured pawn
                    console.log(`En Passant capture performed at ${to.row - dir},${to.col}.`);
                }
            }

            // --- Update Castling Rights (after piece movements) ---
            // If King moved, revoke its castling rights
            if (piece === 'wK') { castlingRights.wK = false; castlingRights.wQ = false; }
            else if (piece === 'bK') { castlingRights.bK = false; castlingRights.bQ = false; }
            // If a Rook moved from its original square, revoke corresponding castling right
            if (piece === 'wR') { if (from.row === 0 && from.col === 0) castlingRights.wQ = false; if (from.row === 0 && from.col === 7) castlingRights.wK = false; }
            else if (piece === 'bR') { if (from.row === 7 && from.col === 0) castlingRights.bQ = false; if (from.row === 7 && from.col === 7) castlingRights.bK = false; }
            // If a Rook is captured on its original square, revoke corresponding castling right
            if (captured === 'wR') { if (to.row === 0 && to.col === 0) castlingRights.wQ = false; if (to.row === 0 && to.col === 7) castlingRights.wK = false; }
            else if (captured === 'bR') { if (to.row === 7 && to.col === 0) castlingRights.bQ = false; if (to.row === 7 && to.col === 7) castlingRights.bK = false; }


            // --- Set lastMove for En Passant ---
            // Only store if a pawn moved two squares for potential en passant capture next turn.
            if (piece[1] === 'P' && Math.abs(from.row - to.row) === 2) {
                lastMove = { piece: piece, from: from, to: to };
            } else {
                lastMove = null; // Clear en passant eligibility after any other type of move
            }


            // --- Switch Turn and Check for Game State ---
            const playerWhoJustMoved = currentTurn;
            currentTurn = currentTurn === 'w' ? 'b' : 'w'; // Switch to the opponent's turn

            // Check if the opponent's king (new currentTurn) is in check
            if (isKingInCheck(currentTurn)) {
                console.log(`${currentTurn} king is in check.`);
                if (!hasLegalMoves(currentTurn)) {
                    // Opponent is in checkmate
                    const winningColor = playerWhoJustMoved === 'w' ? 'White' : 'Black';
                    alert(`Checkmate! ${winningColor} wins!`);
                    gameOver = true;
                } else {
                    // Opponent is in check, but not checkmate
                    alert(`${currentTurn === 'w' ? 'White' : 'Black'} is in check!`);
                }
            } else if (!hasLegalMoves(currentTurn)) {
                // Opponent is NOT in check, but has no legal moves (Stalemate)
                alert(`Stalemate! It's a draw!`);
                gameOver = true;
            }

        } else {
            console.log('Move invalid: This move would leave your king in check.');
        }
    } else {
        console.log('Move invalid: Does not follow piece movement rules.');
    }

    selected = null; // Reset selection regardless of move validity
    renderBoard();   // Re-render board to reflect changes or clear selection
}


function isMoveValid(piece, from, to, b) {
    // Defensive check: Ensure 'piece' is a valid piece string
    if (piece === '.' || typeof piece !== 'string' || piece.length < 2) {
        // This should ideally not happen if handleClick logic is correct, but good for robustness
        console.error("isMoveValid received an invalid 'piece' argument:", piece, "from:", from, "to:", to);
        return false;
    }

    if (from.row === to.row && from.col === to.col) return false; // Cannot move to same square

    // Cannot capture your own piece
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
    const dir = piece[0] === 'w' ? 1 : -1; // +1 for white (up the board), -1 for black (down the board)
    const startRow = piece[0] === 'w' ? 1 : 6;
    const dRow = to.row - from.row;
    const dCol = to.col - from.col;
    const pieceColor = piece[0];

    // Standard 1-square forward move
    if (dCol === 0 && dRow === dir && b[to.row][to.col] === '.') {
        return true;
    }

    // Standard 2-square forward move from starting position
    if (dCol === 0 &&
        dRow === 2 * dir &&
        from.row === startRow &&
        b[from.row + dir][from.col] === '.' && // Check square in front is empty
        b[to.row][to.col] === '.') { // Check target square is empty
        return true;
    }

    // Standard diagonal capture
    if (Math.abs(dCol) === 1 &&
        dRow === dir &&
        b[to.row][to.col] !== '.' &&
        b[to.row][to.col][0] !== pieceColor) { // Capturing an opponent's piece
        return true;
    }

    // En Passant capture (diagonal move to an empty square, but captures a pawn beside it)
    if (Math.abs(dCol) === 1 && dRow === dir && b[to.row][to.col] === '.') {
        // Check if the opponent's pawn that *could* be captured en passant is at (from.row, to.col)
        const opponentPawnSquare = { row: from.row, col: to.col };

        if (lastMove &&
            lastMove.piece[1] === 'P' && // Last move was a pawn
            lastMove.piece[0] !== pieceColor && // Opponent's pawn
            Math.abs(lastMove.from.row - lastMove.to.row) === 2 && // Moved two squares
            lastMove.to.row === opponentPawnSquare.row && // Opponent pawn is on the same rank as our pawn
            lastMove.to.col === opponentPawnSquare.col) { // Opponent pawn is on the column being attacked
            return true;
        }
    }

    return false;
}

function isRookValid(f, t, b) {
    // Must be moving horizontally or vertically
    if (f.row !== t.row && f.col !== t.col) return false;

    const dr = f.row === t.row ? 0 : (f.row < t.row ? 1 : -1);
    const dc = f.col === t.col ? 0 : (f.col < t.col ? 1 : -1);

    let r = f.row + dr;
    let c = f.col + dc;

    // Check squares between 'from' and 'to'
    while (r !== t.row || c !== t.col) {
        if (b[r][c] !== '.') return false; // Path is blocked
        r += dr;
        c += dc;
    }
    return true;
}

function isBishopValid(f, t, b) {
    // Must be moving diagonally
    if (Math.abs(f.row - t.row) !== Math.abs(f.col - t.col)) return false;

    const dr = f.row < t.row ? 1 : -1;
    const dc = f.col < t.col ? 1 : -1;

    let r = f.row + dr;
    let c = f.col + dc;

    // Check squares between 'from' and 'to'
    while (r !== t.row) { // Either row or col (since dr/dc are consistent)
        if (b[r][c] !== '.') return false; // Path is blocked
        r += dr;
        c += dc;
    }
    return true;
}

function isQueenValid(f, t, b) {
    // A Queen moves like a Rook OR a Bishop
    return isRookValid(f, t, b) || isBishopValid(f, t, b);
}

function isKingValid(f, t, b) {
    const dr = Math.abs(f.row - t.row);
    const dc = Math.abs(f.col - t.col);
    const pieceColor = b[f.row][f.col][0];

    // Standard King move (one square in any direction)
    if (dr <= 1 && dc <= 1) {
        return true;
    }

    // Castling attempt (King moves two squares horizontally)
    if (dr === 0 && dc === 2) {
        return isCastlingValid(f, t, b, pieceColor);
    }

    return false;
}

function isKnightValid(f, t) {
    const dr = Math.abs(f.row - t.row);
    const dc = Math.abs(f.col - t.col);
    // Knight moves in an L-shape (2 squares in one direction, 1 in the perpendicular)
    return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
}


function isCastlingValid(f, t, b, color) {
    const kingRow = (color === 'w') ? 0 : 7;
    const kingStartCol = 4; // e1 or e8

    // 1. King must be on its starting square
    if (f.row !== kingRow || f.col !== kingStartCol) return false;

    const isKingside = (t.col === 6); // g1 or g8
    const isQueenside = (t.col === 2); // c1 or c8

    if (!isKingside && !isQueenside) return false; // Not a castling target square

    // 2. Check castling rights (has King or Rook moved?)
    // This uses the global `castlingRights` or the `castlingState` passed from `simulateMoveAndTest`
    if (color === 'w') {
        if (isKingside && !castlingRights.wK) return false;
        if (isQueenside && !castlingRights.wQ) return false;
    } else { // black
        if (isKingside && !castlingRights.bK) return false;
        if (isQueenside && !castlingRights.bQ) return false;
    }

    let rookCol;
    let pathSquaresForKingAttackCheck = []; // Squares king passes through or lands on
    let pathEmptyCheckSquares = []; // Squares between king and rook

    if (isKingside) {
        rookCol = 7; // h1 or h8
        pathEmptyCheckSquares = [{ row: kingRow, col: 5 }, { row: kingRow, col: 6 }]; // f1/f8, g1/g8
        pathSquaresForKingAttackCheck = [{ row: kingRow, col: 4 }, { row: kingRow, col: 5 }, { row: kingRow, col: 6 }]; // e1/e8, f1/f8, g1/g8
    } else { // Queenside
        rookCol = 0; // a1 or a8
        pathEmptyCheckSquares = [{ row: kingRow, col: 1 }, { row: kingRow, col: 2 }, { row: kingRow, col: 3 }]; // b1/b8, c1/c8, d1/d8
        pathSquaresForKingAttackCheck = [{ row: kingRow, col: 4 }, { row: kingRow, col: 3 }, { row: kingRow, col: 2 }]; // e1/e8, d1/d8, c1/c8
    }

    // 3. Check if path is clear (no pieces between King and Rook)
    for (const sq of pathEmptyCheckSquares) {
        if (b[sq.row][sq.col] !== '.') {
            return false;
        }
    }

    // 4. Check if the Rook is actually at its starting square and is the correct Rook type
    const expectedRook = color + 'R';
    if (b[kingRow][rookCol] !== expectedRook) return false;

    // 5. Check if king is in check, or passes through/lands on an attacked square
    for (const square of pathSquaresForKingAttackCheck) {
        // Pass the CURRENT global state of castlingRights and lastMove to `isSquareAttacked`
        // as this call is for validating a potential move before it's made.
        if (isSquareAttacked(square, color, b, castlingRights, lastMove)) {
            return false;
        }
    }

    return true;
}


// Checks if the king of 'color' is currently under attack
function isKingInCheck(color) {
    const kingPos = findKingPosition(color, board); // Check the global board
    if (!kingPos) {
        console.warn(`King not found for color ${color}. This indicates an invalid board state.`);
        return false; // Should not happen in a valid game.
    }
    // Pass the global state `board`, `castlingRights`, `lastMove`
    return isSquareAttacked(kingPos, color, board, castlingRights, lastMove);
}

// Checks if 'color' has any legal moves to make (to escape check or avoid stalemate)
function hasLegalMoves(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece !== '.' && piece[0] === color) { // Check only your own pieces
                const from = { row, col };
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        const to = { row: r, col: c };

                        // 1. Check if the basic piece movement rule is valid
                        if (isMoveValid(piece, from, to, board)) {
                            // 2. Simulate the move and verify it doesn't leave own king in check
                            if (simulateMoveAndTest(piece, from, to, color)) {
                                console.log(`Found legal escape for ${color}: ${piece} ${from.row},${from.col} -> ${to.row},${to.col}`);
                                return true; // Found at least one legal move
                            }
                        }
                    }
                }
            }
        }
    }
    return false; // No legal moves found
}


// Simulates a move on a temporary board to check if the King would be in check.
// This is for checking "legality" of a move, not just "validity".
function simulateMoveAndTest(piece, from, to, color) {
    // Create deep copies of the current game state for simulation
    const tempBoard = board.map(row => [...row]);
    const tempCastlingRights = { ...castlingRights };
    const tempLastMove = lastMove ? { ...lastMove } : null;

    let capturedPieceInSimulation = tempBoard[to.row][to.col]; // Store potential captured piece

    const isKing = piece[1] === 'K';
    const isPawn = piece[1] === 'P';

    // Check for simulated castling validity using the *temp* board and rights
    // This call to isCastlingValid will use `tempCastlingRights` and `tempLastMove` internally
    const isSimulatedCastling = isKing && Math.abs(from.col - to.col) === 2 &&
                                isCastlingValid(from, to, tempBoard, color);

    let isSimulatedEnPassant = false;
    // Check for simulated en passant capture (must re-evaluate based on tempLastMove and tempBoard)
    if (isPawn && Math.abs(from.col - to.col) === 1 && tempBoard[to.row][to.col] === '.') {
        const dir = piece[0] === 'w' ? 1 : -1;
        const potentialCapturedPawnPos = { row: from.row, col: to.col };
        if (tempLastMove &&
            tempLastMove.piece[1] === 'P' &&
            tempLastMove.piece[0] !== piece[0] &&
            Math.abs(tempLastMove.from.row - tempLastMove.to.row) === 2 &&
            tempLastMove.to.row === potentialCapturedPawnPos.row &&
            tempLastMove.to.col === potentialCapturedPawnPos.col) {
            isSimulatedEnPassant = true;
            capturedPieceInSimulation = tempBoard[to.row - dir][to.col]; // The actual pawn to be removed
        }
    }

    // --- Apply board changes on the temporary board ---
    if (isSimulatedCastling) {
        const kingRow = from.row;
        let rookFromCol, rookToCol;
        if (to.col === 6) { rookFromCol = 7; rookToCol = 5; }
        else { rookFromCol = 0; rookToCol = 3; }

        tempBoard[to.row][to.col] = piece; // Move King
        tempBoard[from.row][from.col] = '.';
        tempBoard[kingRow][rookToCol] = tempBoard[kingRow][rookFromCol]; // Move Rook
        tempBoard[kingRow][rookFromCol] = '.';
    } else {
        tempBoard[to.row][to.col] = piece; // Move piece
        tempBoard[from.row][from.col] = '.';
        if (isSimulatedEnPassant) {
            const dir = piece[0] === 'w' ? 1 : -1;
            tempBoard[to.row - dir][to.col] = '.'; // Remove captured pawn
        }
    }

    // --- Temporarily update castling rights for the simulation ---
    // This affects what `isCastlingValid` considers valid if called internally by `isMoveValid` during an `isSquareAttacked` check.
    // Also, ensures if the moving piece is a King/Rook, its rights are revoked for *this simulation*.
    if (piece === 'wK') { tempCastlingRights.wK = false; tempCastlingRights.wQ = false; }
    else if (piece === 'bK') { tempCastlingRights.bK = false; tempCastlingRights.bQ = false; }
    if (piece === 'wR') { if (from.row === 0 && from.col === 0) tempCastlingRights.wQ = false; if (from.row === 0 && from.col === 7) tempCastlingRights.wK = false; }
    else if (piece === 'bR') { if (from.row === 7 && from.col === 0) tempCastlingRights.bQ = false; if (from.row === 7 && from.col === 7) tempCastlingRights.bK = false; }
    if (capturedPieceInSimulation === 'wR') { if (to.row === 0 && to.col === 0) tempCastlingRights.wQ = false; if (to.row === 0 && to.col === 7) tempCastlingRights.wK = false; }
    else if (capturedPieceInSimulation === 'bR') { if (to.row === 7 && to.col === 0) tempCastlingRights.bQ = false; if (to.row === 7 && to.col === 7) tempCastlingRights.bK = false; }


    // --- Temporarily update lastMove for potential *future* en passant checks in simulation ---
    // If the simulated move was a 2-square pawn move, set tempLastMove
    let simulatedLastMove = null;
    if (isPawn && Math.abs(from.row - to.row) === 2) {
        simulatedLastMove = { piece: tempBoard[to.row][to.col], from: from, to: to };
    }


    // --- Find the king’s new position in the temp board ---
    let kingPos;
    if (isKing) { // If the piece moved was the king, its new position is 'to'
        kingPos = { row: to.row, col: to.col };
    } else { // Otherwise, find the king on the temp board
        kingPos = findKingPosition(color, tempBoard);
    }
    if (!kingPos) {
        console.warn(`King not found for ${color} during simulation. This might indicate an error in board state or king tracking.`);
        return false; // If king can't be found, it's definitely not a safe move.
    }

    // Test if king is in check in the simulated board state
    const stillInCheck = isSquareAttacked(kingPos, color, tempBoard, tempCastlingRights, simulatedLastMove);

    return !stillInCheck; // The move is legal if the king is NOT still in check
}


// Finds the king's position for a given color on a given board state
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

// Checks if a specific 'target' square is attacked by the 'opponent' of 'color'
// It uses the provided boardState, castlingState, and lastMoveState for correctness.
// This function itself does NOT perform moves or change the board.
function isSquareAttacked(target, color, boardState, castlingState, lastMoveState) {
    const opponent = color === 'w' ? 'b' : 'w';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            // Only consider opponent's pieces
            if (piece !== '.' && piece[0] === opponent) {

                // --- IMPORTANT: Temporarily set global state for isMoveValid's context ---
                // `isMoveValid` depends on `castlingRights` and `lastMove` globals for special moves.
                // We must provide the simulated state when `isMoveValid` is called here.
                const originalCastlingRights = castlingRights;
                const originalLastMove = lastMove;
                castlingRights = castlingState;
                lastMove = lastMoveState;

                let isAttacking = false;
                // Check if this opponent's piece *can* move to the target square using the boardState
                // and the temporarily set global contexts.
                if (isMoveValid(piece, {row, col}, target, boardState)) {
                    isAttacking = true;
                }

                // --- Restore original global state immediately after `isMoveValid` call ---
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

document.addEventListener('DOMContentLoaded', renderBoard);