import type { Board, CastlingRights, CastlingSide, GameState, GameStatus, Move, MoveKind, Piece, PieceColor, PieceType, Position, RuleToggles, Square } from "./types";

export const DEFAULT_RULES: RuleToggles = {
  castling: true,
  enPassant: true,
  pawnPromotion: true,
  ilVaticano: false,
};

export const PROMOTION_PIECE_TYPES = ["Queen", "Rook", "Bishop", "Knight"] as const;
export type PromotionPieceType = (typeof PROMOTION_PIECE_TYPES)[number];

const KING_START_COL = 3;
const ROOK_START_COL: Record<CastlingSide, number> = { kingside: 0, queenside: 7 };
const HOME_ROW: Record<PieceColor, number> = { w: 0, b: 7 };
const PAWN_START_ROW: Record<PieceColor, number> = { w: 1, b: 6 };
const PROMOTION_ROW: Record<PieceColor, number> = { w: 7, b: 0 };
const PAWN_DIRECTION: Record<PieceColor, number> = { w: 1, b: -1 };

const BACK_RANK: PieceType[] = ["Rook", "Knight", "Bishop", "King", "Queen", "Bishop", "Knight", "Rook"];

export const FILE_LABELS = ["h", "g", "f", "e", "d", "c", "b", "a"];
export const getSquareName = ({ row, col }: Position) => `${FILE_LABELS[col]}${row + 1}`;

const PIECE_LETTERS: Record<PieceType, string> = { Pawn: "", Knight: "N", Bishop: "B", Rook: "R", Queen: "Q", King: "K" };

export const makePiece = (color: PieceColor, type: PieceType): Piece => `${color}${type}`;
export const getPieceColor = (piece: Piece): PieceColor => piece[0] as PieceColor;
export const getPieceType = (piece: Piece): PieceType => piece.slice(1) as PieceType;
export const getOpponent = (color: PieceColor): PieceColor => (color === "w" ? "b" : "w");

export const isSamePosition = (a: Position, b: Position) => a.row === b.row && a.col === b.col;

const isInBounds = ({ row, col }: Position) => row >= 0 && row < 8 && col >= 0 && col < 8;

export const getPieceAt = (board: Board, { row, col }: Position): Square => board[row]?.[col] ?? null;

const copyBoard = (board: Board): Board => board.map((boardRow) => [...boardRow]);

const emptyRow = (): Square[] => Array<Square>(8).fill(null);
const pawnRow = (color: PieceColor): Square[] => Array<Square>(8).fill(makePiece(color, "Pawn"));
const backRow = (color: PieceColor): Square[] => BACK_RANK.map((type) => makePiece(color, type));

export const createInitialGameState = (): GameState => ({
  board: [
    backRow("w"),
    pawnRow("w"),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    pawnRow("b"),
    backRow("b"),
  ],
  currentTurn: "w",
  castlingRights: {
    w: { kingside: true, queenside: true },
    b: { kingside: true, queenside: true },
  },
  doubleSteppedPawn: null,
  pendingPromotion: null,
  moveHistory: [],
});

const isStraightLine = (from: Position, to: Position) => from.row === to.row || from.col === to.col;
const isDiagonalLine = (from: Position, to: Position) => Math.abs(from.row - to.row) === Math.abs(from.col - to.col);

const isKnightJump = (from: Position, to: Position) => {
  const rowDistance = Math.abs(from.row - to.row);
  const colDistance = Math.abs(from.col - to.col);
  return (rowDistance === 2 && colDistance === 1) || (rowDistance === 1 && colDistance === 2);
};

const isKingStep = (from: Position, to: Position) => Math.max(Math.abs(from.row - to.row), Math.abs(from.col - to.col)) === 1;

const getSquaresBetween = (from: Position, to: Position): Position[] => {
  const rowStep = Math.sign(to.row - from.row);
  const colStep = Math.sign(to.col - from.col);
  const distance = Math.max(Math.abs(to.row - from.row), Math.abs(to.col - from.col));

  return Array.from({ length: Math.max(distance - 1, 0) }, (_, index) => ({
    row: from.row + rowStep * (index + 1),
    col: from.col + colStep * (index + 1)
  }));
};

const isPathClear = (board: Board, from: Position, to: Position) => getSquaresBetween(from, to).every((square) => getPieceAt(board, square) === null);
const isRookMove = (board: Board, from: Position, to: Position) => isStraightLine(from, to) && isPathClear(board, from, to);
const isBishopMove = (board: Board, from: Position, to: Position) => isDiagonalLine(from, to) && isPathClear(board, from, to);

const attacksSquare = (board: Board, piece: Piece, from: Position, to: Position): boolean => {
  switch (getPieceType(piece)) {
    case "Pawn":
      return (to.row - from.row === PAWN_DIRECTION[getPieceColor(piece)] && Math.abs(to.col - from.col) === 1);
    case "Knight":
      return isKnightJump(from, to);
    case "Bishop":
      return isBishopMove(board, from, to);
    case "Rook":
      return isRookMove(board, from, to);
    case "Queen":
      return isRookMove(board, from, to) || isBishopMove(board, from, to);
    case "King":
      return isKingStep(from, to);
  }
};

const isSquareAttacked = (board: Board, target: Position, attackerColor: PieceColor): boolean => {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || getPieceColor(piece) !== attackerColor) continue;

      const from = { row, col };
      if (!isSamePosition(from, target) && attacksSquare(board, piece, from, target)) return true;
    }
  }
  return false;
}

const findKing = (board: Board, color: PieceColor): Position | null => {
  const king = makePiece(color, "King");
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === king) return { row, col };
    }
  }
  return null;
}

export const isKingInCheck = (board: Board, color: PieceColor): boolean => {
  const kingPosition = findKing(board, color);
  return kingPosition !== null && isSquareAttacked(board, kingPosition, getOpponent(color));
}

const canCastle = (state: GameState, from: Position, to: Position): boolean => {
  const { board, castlingRights } = state;
  const king = getPieceAt(board, from);
  if (!king) return false;

  const color = getPieceColor(king);
  const homeRow = HOME_ROW[color];

  if (from.row !== homeRow || from.col !== KING_START_COL) return false;
  if (to.row !== homeRow || Math.abs(to.col - from.col) !== 2) return false;

  const side: CastlingSide = to.col < from.col ? "kingside" : "queenside";
  if (!castlingRights[color][side]) return false;

  const rookPosition = { row: homeRow, col: ROOK_START_COL[side] };
  if (getPieceAt(board, rookPosition) !== makePiece(color, "Rook")) return false;
  if (!isPathClear(board, from, rookPosition)) return false;

  const direction = Math.sign(to.col - from.col);
  const opponent = getOpponent(color);
  return [0, 1, 2].every((step) => !isSquareAttacked(board, { row: homeRow, col: from.col + direction * step }, opponent));
}

const isIlVaticanoMove = (board: Board, from: Position, to: Position): boolean => {
  const firstBishop = getPieceAt(board, from);
  const secondBishop = getPieceAt(board, to);
  if (!firstBishop || !secondBishop) return false;
  if (getPieceType(firstBishop) !== "Bishop" || getPieceType(secondBishop) !== "Bishop") return false;

  const color = getPieceColor(firstBishop);
  if (getPieceColor(secondBishop) !== color) return false;

  const distance = Math.max(Math.abs(from.row - to.row), Math.abs(from.col - to.col));
  if (!isStraightLine(from, to) || distance !== 3) return false;

  const enemyPawn = makePiece(getOpponent(color), "Pawn");
  return getSquaresBetween(from, to).every((square) => getPieceAt(board, square) === enemyPawn);
}

const getPawnMoveKind = (state: GameState, rules: RuleToggles, pawn: Piece, from: Position, to: Position): MoveKind | null => {
  const { board, doubleSteppedPawn } = state;
  const color = getPieceColor(pawn);
  const direction = PAWN_DIRECTION[color];
  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;
  const target = getPieceAt(board, to);

  if (colDelta === 0) {
    if (target) return null;
    if (rowDelta === direction) return "normal";

    const squareInFront = { row: from.row + direction, col: from.col };
    const isDoubleStep = rowDelta === 2 * direction && from.row === PAWN_START_ROW[color] && getPieceAt(board, squareInFront) === null;
    return isDoubleStep ? "normal" : null;
  }

  if (Math.abs(colDelta) !== 1 || rowDelta !== direction) return null;
  if (target) return "normal";

  const isBesideDoubleSteppedPawn = doubleSteppedPawn !== null && doubleSteppedPawn.row === from.row && doubleSteppedPawn.col === to.col;

  if (rules.enPassant && isBesideDoubleSteppedPawn && getPieceAt(board, doubleSteppedPawn) === makePiece(getOpponent(color), "Pawn")) {
    return "enPassant";
  }
  return null;
}

const getMoveKind = (state: GameState, rules: RuleToggles, from: Position, to: Position): MoveKind | null => {
  const { board } = state;
  const piece = getPieceAt(board, from);
  if (!piece || !isInBounds(to) || isSamePosition(from, to)) return null;

  if (rules.ilVaticano && isIlVaticanoMove(board, from, to)) return "ilVaticano";

  const target = getPieceAt(board, to);
  if (target && getPieceColor(target) === getPieceColor(piece)) return null;

  switch (getPieceType(piece)) {
    case "Pawn":
      return getPawnMoveKind(state, rules, piece, from, to);
    case "King":
      if (isKingStep(from, to)) return "normal";
      return rules.castling && canCastle(state, from, to) ? "castling" : null;
    default:
      return attacksSquare(board, piece, from, to) ? "normal" : null;
  }
}

const applyMoveToBoard = (board: Board, { from, to, kind }: Move): Board => {
  const nextBoard = copyBoard(board);

  if (kind === "ilVaticano") {
    getSquaresBetween(from, to).forEach(({ row, col }) => {
      nextBoard[row][col] = null;
    });
    return nextBoard;
  }

  if (kind === "castling") {
    const rookFromCol = to.col < from.col ? ROOK_START_COL.kingside : ROOK_START_COL.queenside;
    const rookToCol = (from.col + to.col) / 2;
    nextBoard[from.row][rookToCol] = nextBoard[from.row][rookFromCol];
    nextBoard[from.row][rookFromCol] = null;
  }

  if (kind === "enPassant") nextBoard[from.row][to.col] = null;

  nextBoard[to.row][to.col] = nextBoard[from.row][from.col];
  nextBoard[from.row][from.col] = null;
  return nextBoard;
}

export const getLegalMoves = (state: GameState, rules: RuleToggles, from: Position): Move[] => {
  const piece = getPieceAt(state.board, from);
  if (!piece) return [];

  const color = getPieceColor(piece);
  const legalMoves: Move[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const to = { row, col };
      const kind = getMoveKind(state, rules, from, to);
      if (!kind) continue;

      const move: Move = { from, to, kind };
      if (!isKingInCheck(applyMoveToBoard(state.board, move), color)) legalMoves.push(move);
    }
  }
  return legalMoves;
}

const hasAnyLegalMove = (state: GameState, rules: RuleToggles): boolean => {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = state.board[row][col];
      if (piece && getPieceColor(piece) === state.currentTurn && getLegalMoves(state, rules, { row, col }).length > 0) {
        return true;
      }
    }
  }
  return false;
}

export const getGameStatus = (state: GameState, rules: RuleToggles): GameStatus => {
  if (state.pendingPromotion) return "playing";
  const isInCheck = isKingInCheck(state.board, state.currentTurn);
  if (!hasAnyLegalMove(state, rules)) return isInCheck ? "checkmate" : "stalemate";
  return isInCheck ? "check" : "playing";
}

const getDisambiguation = (state: GameState, rules: RuleToggles, piece: Piece, { from, to }: Move): string => {
  const rivals: Position[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const position = { row, col };
      if (state.board[row][col] !== piece || isSamePosition(position, from)) continue;
      if (getLegalMoves(state, rules, position).some((move) => isSamePosition(move.to, to))) rivals.push(position);
    }
  }

  if (rivals.length === 0) return "";
  if (!rivals.some((rival) => rival.col === from.col)) return FILE_LABELS[from.col];
  if (!rivals.some((rival) => rival.row === from.row)) return String(from.row + 1);
  return getSquareName(from);
}

const getMoveNotation = (state: GameState, rules: RuleToggles, move: Move): string => {
  const { from, to, kind } = move;
  const piece = getPieceAt(state.board, from);
  if (!piece) return "";

  if (kind === "castling") return to.col < from.col ? "O-O" : "O-O-O";
  if (kind === "ilVaticano") return "B-O-O-B"; // Lore accurate Il Vaticano move notation. Not the other thing.

  const isCapture = kind === "enPassant" || getPieceAt(state.board, to) !== null;
  const destination = getSquareName(to);

  if (getPieceType(piece) === "Pawn") return isCapture ? `${FILE_LABELS[from.col]}x${destination}` : destination;
  return `${PIECE_LETTERS[getPieceType(piece)]}${getDisambiguation(state, rules, piece, move)}${isCapture ? "x" : ""}${destination}`;
}

const getCheckSuffix = (state: GameState, rules: RuleToggles): string => {
  const status = getGameStatus(state, rules);
  return status === "checkmate" ? "#" : status === "check" ? "+" : "";
}

const revokeRookRight = (rights: CastlingRights, piece: Piece, position: Position) => {
  if (getPieceType(piece) !== "Rook") return;

  const color = getPieceColor(piece);
  if (position.row !== HOME_ROW[color]) return;
  if (position.col === ROOK_START_COL.kingside) rights[color].kingside = false;
  if (position.col === ROOK_START_COL.queenside) rights[color].queenside = false;
}

const updateCastlingRights = (rights: CastlingRights, movedPiece: Piece, move: Move, capturedPiece: Square): CastlingRights => {
  const nextRights: CastlingRights = { w: { ...rights.w }, b: { ...rights.b } };

  if (getPieceType(movedPiece) === "King") {
    const color = getPieceColor(movedPiece);
    nextRights[color].kingside = false;
    nextRights[color].queenside = false;
  }
  revokeRookRight(nextRights, movedPiece, move.from);
  if (capturedPiece) revokeRookRight(nextRights, capturedPiece, move.to);

  return nextRights;
}

export const applyMove = (state: GameState, rules: RuleToggles, move: Move): GameState => {
  const movedPiece = getPieceAt(state.board, move.from);
  if (!movedPiece) return state;

  const color = getPieceColor(movedPiece);
  const capturedPiece = getPieceAt(state.board, move.to);
  const board = applyMoveToBoard(state.board, move);
  const castlingRights = updateCastlingRights(state.castlingRights, movedPiece, move, capturedPiece);
  const isPawn = getPieceType(movedPiece) === "Pawn";
  const notation = getMoveNotation(state, rules, move);

  if (rules.pawnPromotion && isPawn && move.to.row === PROMOTION_ROW[color]) {
    return {
      ...state,
      board,
      castlingRights,
      doubleSteppedPawn: null,
      pendingPromotion: { position: move.to, color, notation }
    };
  }

  const isDoubleStep = isPawn && Math.abs(move.to.row - move.from.row) === 2;
  const nextState: GameState = {
    board,
    currentTurn: getOpponent(color),
    castlingRights,
    doubleSteppedPawn: isDoubleStep ? move.to : null,
    pendingPromotion: null,
    moveHistory: state.moveHistory,
  }
  return { ...nextState, moveHistory: [...state.moveHistory, notation + getCheckSuffix(nextState, rules)] };
};

export const completePromotion = (state: GameState, rules: RuleToggles, pieceType: PromotionPieceType): GameState => {
  const { pendingPromotion } = state;
  if (!pendingPromotion) return state;

  const { position, color, notation } = pendingPromotion;
  const board = copyBoard(state.board);
  board[position.row][position.col] = makePiece(color, pieceType);

  const nextState: GameState = { ...state, board, currentTurn: getOpponent(color), pendingPromotion: null };
  const promotionNotation = `${notation}=${PIECE_LETTERS[pieceType]}${getCheckSuffix(nextState, rules)}`;
  return { ...nextState, moveHistory: [...state.moveHistory, promotionNotation] };
}
